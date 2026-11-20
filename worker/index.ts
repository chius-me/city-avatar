import {
  AI_MODELS,
  BACKDROP_PRESETS,
  buildStylizePrompt,
  estimateModelNeurons,
  type ModelId,
  type SubjectType,
} from '../src/data/presets';
import { QuotaGuard, type QuotaStatus } from './quotaGuard';
import { verifyTurnstileToken } from './turnstile';

export { QuotaGuard };

interface StylizeRequestBody {
  sourceImageDataUrl?: string;
  turnstileToken?: string;
  modelId?: string;
  bgId?: string;
  styleId?: string;
  expressionId?: string;
  subjectType?: string;
  useStyleRef?: boolean;
  customPrompt?: string;
  seed?: number;
  size?: number;
}

const ALLOWED_MODEL_IDS = new Set<string>(AI_MODELS.map((m) => m.id));
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const MAX_SOURCE_IMAGE_BYTES = 4 * 1024 * 1024;

function parsePositiveInt(val: string | undefined, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
      'x-frame-options': 'DENY',
      ...extraHeaders,
    },
  });
}

function sniffImageMimeFromBase64(b64: string): string {
  if (b64.startsWith('iVBOR')) return 'image/png';
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function verifyImageMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 12) return false;
  if (mimeType === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

function decodeDataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const match = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl.trim()
  );
  if (!match) return null;
  const [, mimeType, subtype, b64] = match;
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes <= 0 || approxBytes > MAX_SOURCE_IMAGE_BYTES) return null;

  let binary: string;
  try {
    binary = atob(b64);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  if (!verifyImageMagicBytes(bytes, mimeType)) {
    return null;
  }

  const ext = subtype === 'jpeg' ? 'jpg' : subtype;
  return { blob: new Blob([bytes], { type: mimeType }), ext };
}

async function normalizeAiImageOutput(result: unknown): Promise<{
  base64: string;
  mimeType: string;
}> {
  if (result && typeof result === 'object' && 'image' in result) {
    const imageVal = (result as { image?: unknown }).image;
    if (typeof imageVal === 'string' && imageVal.length > 32) {
      return {
        base64: imageVal,
        mimeType: sniffImageMimeFromBase64(imageVal),
      };
    }
  }

  if (result instanceof ReadableStream) {
    const buf = await new Response(result).arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    return {
      base64,
      mimeType: sniffImageMimeFromBase64(base64),
    };
  }

  if (result instanceof Uint8Array) {
    const copy = new Uint8Array(result.byteLength);
    copy.set(result);
    const base64 = arrayBufferToBase64(copy.buffer);
    return {
      base64,
      mimeType: sniffImageMimeFromBase64(base64),
    };
  }

  throw new Error('Workers AI returned an unexpected image payload format.');
}

async function hashClientIp(day: string, ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${day}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getAllowedOrigins(env: Env, requestUrl: URL): Set<string> {
  const allowed = new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (isLocalHostname(requestUrl.hostname)) {
    allowed.add(requestUrl.origin);
  }
  return allowed;
}

function getExpectedTurnstileHostnames(env: Env, requestUrl: URL): Set<string> {
  const hostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (isLocalHostname(requestUrl.hostname)) {
    hostnames.add(requestUrl.hostname);
  }
  return hostnames;
}

function isGenerationEnabled(env: Env): boolean {
  return String(env.GENERATION_ENABLED ?? 'true') !== 'false';
}

function publicQuotaPayload(
  status: QuotaStatus,
  env: Env
): {
  generationEnabled: boolean;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  day: string;
  resetAtUtc: string;
  ipRemaining: number;
  ipLimit: number;
  globalExhausted: boolean;
  globalPercentRemaining: number;
} {
  const turnstileSecret = env.TURNSTILE_SECRET ?? '';
  const turnstileSiteKey = env.TURNSTILE_SITE_KEY ?? '';
  return {
    generationEnabled: isGenerationEnabled(env),
    turnstileEnabled: Boolean(turnstileSecret && turnstileSiteKey),
    turnstileSiteKey,
    day: status.day,
    resetAtUtc: status.resetAtUtc,
    ipRemaining: status.ipRemaining,
    ipLimit: status.ipLimit,
    globalExhausted: status.globalExhausted,
    globalPercentRemaining: status.globalPercentRemaining,
  };
}

async function handleQuotaStatus(request: Request, env: Env): Promise<Response> {
  const day = new Date().toISOString().slice(0, 10);
  const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
  const ipHash = await hashClientIp(day, clientIp);
  const ipLimit = parsePositiveInt(env.DAILY_IP_CREDITS, 12);
  const globalLimit = parsePositiveInt(env.DAILY_GLOBAL_NEURON_BUDGET, 8500);

  const stub = env.QUOTA_GUARD.get(env.QUOTA_GUARD.idFromName('global'));
  const status = await stub.getStatus(ipHash, ipLimit, globalLimit);

  return jsonResponse(publicQuotaPayload(status, env));
}

async function handleStylize(request: Request, env: Env): Promise<Response> {
  const startedAt = Date.now();
  const requestUrl = new URL(request.url);

  // 1. Kill switch
  if (!isGenerationEnabled(env)) {
    return jsonResponse(
      {
        error: '站点维护中，AI 生成已暂时关闭。',
        code: 'generation_paused',
      },
      503
    );
  }

  // 2. Content-Type check
  const reqContentType = request.headers.get('content-type') || '';
  if (!reqContentType.toLowerCase().includes('application/json')) {
    return jsonResponse({ error: 'Unsupported Media Type' }, 415);
  }

  // 3. Strict same-origin check (prevents cross-site CSRF / hotlink API abuse)
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins(env, requestUrl);
  if (!origin || !allowedOrigins.has(origin)) {
    return jsonResponse(
      { error: '请求来源未授权（禁止跨站直接调用）。', code: 'forbidden_origin' },
      403
    );
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && !isLocalHostname(requestUrl.hostname)) {
    return jsonResponse(
      { error: '跨站请求已被安全策略拦截。', code: 'forbidden_fetch_site' },
      403
    );
  }

  // 4. Body size & payload validation
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const parsedLen = Number(contentLengthHeader);
    if (Number.isFinite(parsedLen) && parsedLen > MAX_BODY_BYTES) {
      return jsonResponse({ error: '请求体积过大，请压缩上传图片后重试。' }, 413);
    }
  }

  let body: StylizeRequestBody;
  try {
    body = (await request.json()) as StylizeRequestBody;
  } catch {
    return jsonResponse({ error: '请求格式无效，请发送 JSON 数据。' }, 400);
  }

  if (typeof body.sourceImageDataUrl !== 'string' || !body.sourceImageDataUrl.trim()) {
    return jsonResponse({ error: '请先上传或选择一张照片作为原图输入。' }, 400);
  }

  const decodedSource = decodeDataUrlToBlob(body.sourceImageDataUrl);
  if (!decodedSource) {
    return jsonResponse(
      { error: '图片格式不受支持或文件内容校验失败，请使用有效的 PNG / JPG / WebP 图片（≤4MB）。' },
      400
    );
  }

  // 5. Edge burst rate limiter (per client IP per 60s)
  const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
  const burstOutcome = await env.STYLE_BURST_LIMITER.limit({ key: clientIp });
  if (!burstOutcome.success) {
    return jsonResponse(
      {
        error: '操作太频繁，请 1 分钟后再试。',
        code: 'burst_rate_limited',
      },
      429,
      { 'retry-after': '60' }
    );
  }

  // 6. Cloudflare Turnstile Siteverify
  const turnstileSecret = env.TURNSTILE_SECRET;
  if (turnstileSecret) {
    const expectedHostnames = getExpectedTurnstileHostnames(env, requestUrl);
    const verifyRes = await verifyTurnstileToken({
      secret: turnstileSecret,
      token: body.turnstileToken,
      remoteIp: request.headers.get('cf-connecting-ip'),
      expectedAction: 'stylize',
      expectedHostnames,
    });
    if (!verifyRes.ok) {
      console.warn(
        JSON.stringify({
          event: 'turnstile_rejected',
          codes: verifyRes.errorCodes ?? [],
        })
      );
      return jsonResponse(
        {
          error: '人机安全验证未通过，请刷新或重新完成验证后再试。',
          code: 'turnstile_failed',
        },
        403
      );
    }
  }

  const requestedModelId: ModelId =
    typeof body.modelId === 'string' && ALLOWED_MODEL_IDS.has(body.modelId)
      ? (body.modelId as ModelId)
      : '@cf/black-forest-labs/flux-2-klein-4b';

  const modelMeta = AI_MODELS.find((m) => m.id === requestedModelId) ?? AI_MODELS[0];
  const bg = BACKDROP_PRESETS.find((b) => b.id === body.bgId) ?? BACKDROP_PRESETS[0];

  const subjectType: SubjectType =
    body.subjectType === 'person' || body.subjectType === 'creature'
      ? body.subjectType
      : 'auto';

  const useStyleRef = body.useStyleRef !== false;
  const size: 768 | 1024 = body.size === 768 ? 768 : 1024;
  const creditCost = modelMeta.creditCost;
  const neuronCost = estimateModelNeurons(modelMeta, size);

  // 7. Atomic Durable Object Reservation (Concurrency lock + IP daily credits + Global daily Neurons)
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = await hashClientIp(day, clientIp);
  const ipLimit = parsePositiveInt(env.DAILY_IP_CREDITS, 12);
  const globalLimit = parsePositiveInt(env.DAILY_GLOBAL_NEURON_BUDGET, 8500);
  const guardStub = env.QUOTA_GUARD.get(env.QUOTA_GUARD.idFromName('global'));

  const reservation = await guardStub.reserve({
    ipHash,
    creditCost,
    neuronCost,
    ipLimit,
    globalNeuronLimit: globalLimit,
  });

  if (!reservation.ok || !reservation.reservationId) {
    const quota = publicQuotaPayload(reservation.status, env);
    if (reservation.reason === 'concurrent') {
      return jsonResponse(
        {
          error: '你有一张头像正在生成中，请等待当前任务完成后再试。',
          code: 'concurrent',
          quota,
        },
        429
      );
    }
    if (reservation.reason === 'global_budget_exhausted') {
      return jsonResponse(
        {
          error: '今日全站免费 AI 额度已达上限，将于明日 UTC 00:00 自动恢复。',
          code: 'global_budget_exhausted',
          quota,
        },
        503
      );
    }
    return jsonResponse(
      {
        error: `今日剩余点数不足（剩余 ${reservation.status.ipRemaining} 点，当前模型需 ${creditCost} 点），请切换 4B 模型或明日重置后再试。`,
        code: 'ip_quota_exceeded',
        quota,
      },
      429
    );
  }

  const reservationId = reservation.reservationId;
  const seed =
    typeof body.seed === 'number' && Number.isInteger(body.seed) && body.seed >= 0
      ? body.seed % 2147483647
      : crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647;

  const styleId = typeof body.styleId === 'string' ? body.styleId : 'official-icon';
  const expressionId = typeof body.expressionId === 'string' ? body.expressionId : 'keep';
  const customPrompt =
    typeof body.customPrompt === 'string' ? body.customPrompt.trim().slice(0, 240) : '';

  let refAssetPath: string | null = null;
  let refKind: 'character-icon' | 'star-pattern' | 'none' = 'none';

  if (useStyleRef) {
    if (bg.slot === 'C' || bg.slot === 'I' || bg.slot === 'T' || bg.slot === 'Y') {
      refAssetPath = bg.patternRefUrl;
      refKind = 'star-pattern';
    } else {
      refAssetPath = null;
      refKind = 'none';
    }
  }

  const prompt = buildStylizePrompt({
    bgId: bg.id,
    styleId,
    expressionId,
    subjectType,
    customPrompt,
    useStyleRef,
    refKind,
  });

  // 8. Execute Workers AI inference; automatically refund credits/neurons on upstream error
  let succeeded = false;
  try {
    let styleBlob: Blob | null = null;
    if (refAssetPath) {
      const assetUrl = new URL(refAssetPath, request.url);
      const refResponse = await env.ASSETS.fetch(new Request(assetUrl));
      const refContentType = refResponse.headers.get('content-type') || '';
      if (refResponse.ok && refContentType.startsWith('image/')) {
        styleBlob = await refResponse.blob();
      }
    }

    const runFlux2Once = async (
      includeSeed: boolean,
      overridePrompt?: string
    ): Promise<unknown> => {
      const form = new FormData();
      form.append('prompt', overridePrompt ?? prompt);
      form.append('width', String(size));
      form.append('height', String(size));
      if (includeSeed) {
        form.append('seed', String(seed));
      }
      if (requestedModelId === '@cf/black-forest-labs/flux-2-dev') {
        form.append('steps', '18');
      }

      form.append('input_image_0', decodedSource.blob, `source.${decodedSource.ext}`);
      if (styleBlob) {
        form.append('input_image_1', styleBlob, 'city-style-ref.png');
      }

      const serialized = new Response(form);
      const contentType = serialized.headers.get('content-type');
      if (!serialized.body || !contentType) {
        throw new Error('Failed to serialize multipart payload for FLUX.2 model.');
      }

      return env.AI.run(requestedModelId as '@cf/black-forest-labs/flux-2-klein-4b', {
        multipart: {
          body: serialized.body,
          contentType,
        },
      });
    };

    let aiResult: unknown;
    try {
      aiResult = await runFlux2Once(true);
    } catch (firstErr) {
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      if (/3043|processing error/i.test(msg)) {
        aiResult = await runFlux2Once(false);
      } else if (/3030|flagged/i.test(msg)) {
        const safePrompt = `Wholesome clean 2D Japanese anime character icon portrait transforming the exact subject from image 0 into cheerful Kyoto Animation CITY THE ANIMATION style with uniform dark ink outlines, bright flat cel-shading, and a clean ${bg.promptBackdrop}, preserving full subject likeness edge-to-edge without text or borders.`;
        aiResult = await runFlux2Once(false, safePrompt);
      } else {
        throw firstErr;
      }
    }

    const { base64, mimeType } = await normalizeAiImageOutput(aiResult);
    const durationMs = Date.now() - startedAt;
    succeeded = true;

    const latestStatus = await guardStub.release({
      ipHash,
      reservationId,
      refund: false,
      creditCost,
      neuronCost,
      ipLimit,
      globalNeuronLimit: globalLimit,
    });

    console.log(
      JSON.stringify({
        event: 'avatar_stylized',
        modelId: requestedModelId,
        bgId: bg.id,
        styleId,
        expressionId,
        subjectType,
        refKind,
        size,
        creditCost,
        neuronCost,
        seed,
        durationMs,
      })
    );

    return jsonResponse({
      imageDataUrl: `data:${mimeType};base64,${base64}`,
      prompt,
      modelId: requestedModelId,
      modelName: modelMeta.name,
      bgId: bg.id,
      styleId,
      expressionId,
      subjectType,
      seed,
      size,
      usedStyleRef: Boolean(styleBlob),
      refKind,
      durationMs,
      quota: publicQuotaPayload(latestStatus, env),
    });
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startedAt;

    const latestStatus = await guardStub.release({
      ipHash,
      reservationId,
      refund: !succeeded,
      creditCost,
      neuronCost,
      ipLimit,
      globalNeuronLimit: globalLimit,
    });

    console.error(
      JSON.stringify({
        event: 'avatar_stylize_failed',
        modelId: requestedModelId,
        bgId: bg.id,
        durationMs,
        refunded: !succeeded,
        error: rawMessage,
      })
    );

    const isQuota = /quota|neuron|limit|429|capacity|rate/i.test(rawMessage);
    const isFlagged = /3030|flagged/i.test(rawMessage);

    return jsonResponse(
      {
        error: isQuota
          ? 'Cloudflare Workers AI 请求额度或速率已达上限，请稍后再试（本次点数已退回）。'
          : isFlagged
            ? '当前图片或描述触发了模型安全误判，建议调整描述词或换一张照片重试（本次点数已退回）。'
            : `风格化生成失败：${rawMessage}（本次点数已退回）`,
        detail: rawMessage,
        quota: publicQuotaPayload(latestStatus, env),
      },
      isQuota ? 429 : isFlagged ? 422 : 502
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return jsonResponse({
        ok: true,
        service: 'city-avatar',
        domain: 'avatar.city.chius.dev',
        mode: 'photo-to-city-stylizer',
        protection: {
          turnstileEnabled: Boolean(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY),
          generationEnabled: isGenerationEnabled(env),
        },
        models: AI_MODELS.map((m) => ({
          id: m.id,
          name: m.name,
          creditCost: m.creditCost,
        })),
      });
    }

    if (url.pathname === '/api/quota') {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method Not Allowed' }, 405);
      }
      return handleQuotaStatus(request, env);
    }

    if (url.pathname === '/api/stylize') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
      }
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method Not Allowed' }, 405);
      }
      return handleStylize(request, env);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
