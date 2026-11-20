interface SiteVerifyApiResponse {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export interface TurnstileVerifyResult {
  ok: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstileToken(opts: {
  secret: string;
  token: unknown;
  remoteIp: string | null;
  expectedAction: string;
  expectedHostnames: Set<string>;
}): Promise<TurnstileVerifyResult> {
  if (
    typeof opts.token !== 'string' ||
    opts.token.length === 0 ||
    opts.token.length > 2048 ||
    opts.expectedHostnames.size === 0
  ) {
    return { ok: false, errorCodes: ['invalid-input-response'] };
  }

  const body = new URLSearchParams();
  body.set('secret', opts.secret);
  body.set('response', opts.token);
  if (opts.remoteIp) {
    body.set('remoteip', opts.remoteIp);
  }

  let result: SiteVerifyApiResponse;
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body,
    });
    if (!resp.ok) {
      return { ok: false, errorCodes: [`http-${resp.status}`] };
    }
    result = (await resp.json()) as SiteVerifyApiResponse;
  } catch {
    return { ok: false, errorCodes: ['siteverify-network-error'] };
  }

  const ok =
    result.success === true &&
    result.action === opts.expectedAction &&
    typeof result.hostname === 'string' &&
    opts.expectedHostnames.has(result.hostname);

  return {
    ok,
    errorCodes: ok ? undefined : result['error-codes'] ?? ['verification-mismatch'],
  };
}
