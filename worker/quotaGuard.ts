import { DurableObject } from 'cloudflare:workers';

export interface QuotaStatus {
  day: string;
  resetAtUtc: string;
  ipUsed: number;
  ipLimit: number;
  ipRemaining: number;
  globalExhausted: boolean;
  globalPercentRemaining: number;
}

export interface ReserveOutcome {
  ok: boolean;
  reason?: 'concurrent' | 'ip_quota_exceeded' | 'global_budget_exhausted';
  reservationId?: string;
  status: QuotaStatus;
}

const IN_FLIGHT_TTL_MS = 75_000;

function utcDayInfo(nowMs = Date.now()): { day: string; resetAtUtc: string } {
  const d = new Date(nowMs);
  const day = d.toISOString().slice(0, 10);
  const nextMidnight = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return {
    day,
    resetAtUtc: new Date(nextMidnight).toISOString(),
  };
}

function oldUtcCutoffDay(daysAgo = 3, nowMs = Date.now()): string {
  return new Date(nowMs - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

export class QuotaGuard extends DurableObject<Env> {
  private lastPrunedDay = '';

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS daily_global (
          day TEXT PRIMARY KEY,
          neurons_used INTEGER NOT NULL,
          requests INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS daily_ip (
          day TEXT NOT NULL,
          ip_hash TEXT NOT NULL,
          credits_used INTEGER NOT NULL,
          requests INTEGER NOT NULL,
          PRIMARY KEY (day, ip_hash)
        );
        CREATE TABLE IF NOT EXISTS in_flight (
          ip_hash TEXT PRIMARY KEY,
          started_at INTEGER NOT NULL,
          token TEXT NOT NULL
        );
      `);
    });
  }

  private pruneIfNeeded(day: string, nowMs: number): void {
    this.ctx.storage.sql.exec(
      'DELETE FROM in_flight WHERE started_at < ?',
      nowMs - IN_FLIGHT_TTL_MS
    );
    if (this.lastPrunedDay !== day) {
      const cutoff = oldUtcCutoffDay(3, nowMs);
      this.ctx.storage.sql.exec('DELETE FROM daily_global WHERE day < ?', cutoff);
      this.ctx.storage.sql.exec('DELETE FROM daily_ip WHERE day < ?', cutoff);
      this.lastPrunedDay = day;
    }
  }

  private buildStatus(
    day: string,
    resetAtUtc: string,
    ipHash: string,
    ipLimit: number,
    globalNeuronLimit: number
  ): { status: QuotaStatus; globalNeuronsUsed: number } {
    const gRows = this.ctx.storage.sql
      .exec('SELECT neurons_used FROM daily_global WHERE day = ?', day)
      .toArray();
    const globalNeuronsUsed =
      gRows.length > 0 ? Number(gRows[0].neurons_used ?? 0) : 0;

    const iRows = this.ctx.storage.sql
      .exec(
        'SELECT credits_used FROM daily_ip WHERE day = ? AND ip_hash = ?',
        day,
        ipHash
      )
      .toArray();
    const ipUsed = iRows.length > 0 ? Number(iRows[0].credits_used ?? 0) : 0;

    const ipRemaining = Math.max(0, ipLimit - ipUsed);
    const globalRemainingNeurons = Math.max(0, globalNeuronLimit - globalNeuronsUsed);
    const globalPercentRemaining =
      globalNeuronLimit > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((globalRemainingNeurons / globalNeuronLimit) * 100))
          )
        : 0;

    return {
      globalNeuronsUsed,
      status: {
        day,
        resetAtUtc,
        ipUsed,
        ipLimit,
        ipRemaining,
        globalExhausted: globalNeuronsUsed >= globalNeuronLimit,
        globalPercentRemaining,
      },
    };
  }

  async getStatus(
    ipHash: string,
    ipLimit: number,
    globalNeuronLimit: number
  ): Promise<QuotaStatus> {
    const nowMs = Date.now();
    const { day, resetAtUtc } = utcDayInfo(nowMs);
    this.pruneIfNeeded(day, nowMs);
    return this.buildStatus(day, resetAtUtc, ipHash, ipLimit, globalNeuronLimit).status;
  }

  async reserve(opts: {
    ipHash: string;
    creditCost: number;
    neuronCost: number;
    ipLimit: number;
    globalNeuronLimit: number;
  }): Promise<ReserveOutcome> {
    const nowMs = Date.now();
    const { day, resetAtUtc } = utcDayInfo(nowMs);
    this.pruneIfNeeded(day, nowMs);

    const active = this.ctx.storage.sql
      .exec('SELECT token FROM in_flight WHERE ip_hash = ?', opts.ipHash)
      .toArray();

    const { globalNeuronsUsed, status } = this.buildStatus(
      day,
      resetAtUtc,
      opts.ipHash,
      opts.ipLimit,
      opts.globalNeuronLimit
    );

    if (active.length > 0) {
      return { ok: false, reason: 'concurrent', status };
    }

    if (globalNeuronsUsed + opts.neuronCost > opts.globalNeuronLimit) {
      return { ok: false, reason: 'global_budget_exhausted', status };
    }

    if (status.ipUsed + opts.creditCost > opts.ipLimit) {
      return { ok: false, reason: 'ip_quota_exceeded', status };
    }

    const reservationId = crypto.randomUUID();
    this.ctx.storage.sql.exec(
      'INSERT INTO in_flight (ip_hash, started_at, token) VALUES (?, ?, ?)',
      opts.ipHash,
      nowMs,
      reservationId
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO daily_ip (day, ip_hash, credits_used, requests)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(day, ip_hash) DO UPDATE SET
         credits_used = credits_used + excluded.credits_used,
         requests = requests + 1`,
      day,
      opts.ipHash,
      opts.creditCost
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO daily_global (day, neurons_used, requests)
       VALUES (?, ?, 1)
       ON CONFLICT(day) DO UPDATE SET
         neurons_used = neurons_used + excluded.neurons_used,
         requests = requests + 1`,
      day,
      opts.neuronCost
    );

    const after = this.buildStatus(
      day,
      resetAtUtc,
      opts.ipHash,
      opts.ipLimit,
      opts.globalNeuronLimit
    ).status;

    return {
      ok: true,
      reservationId,
      status: after,
    };
  }

  async release(opts: {
    ipHash: string;
    reservationId: string;
    refund: boolean;
    creditCost: number;
    neuronCost: number;
    ipLimit: number;
    globalNeuronLimit: number;
  }): Promise<QuotaStatus> {
    const nowMs = Date.now();
    const { day, resetAtUtc } = utcDayInfo(nowMs);

    this.ctx.storage.sql.exec(
      'DELETE FROM in_flight WHERE ip_hash = ? AND token = ?',
      opts.ipHash,
      opts.reservationId
    );

    if (opts.refund) {
      this.ctx.storage.sql.exec(
        `UPDATE daily_ip
         SET credits_used = MAX(0, credits_used - ?),
             requests = MAX(0, requests - 1)
         WHERE day = ? AND ip_hash = ?`,
        opts.creditCost,
        day,
        opts.ipHash
      );
      this.ctx.storage.sql.exec(
        `UPDATE daily_global
         SET neurons_used = MAX(0, neurons_used - ?),
             requests = MAX(0, requests - 1)
         WHERE day = ?`,
        opts.neuronCost,
        day
      );
    }

    return this.buildStatus(
      day,
      resetAtUtc,
      opts.ipHash,
      opts.ipLimit,
      opts.globalNeuronLimit
    ).status;
  }
}
