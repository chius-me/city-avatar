import {
  AI_MODELS,
  BACKDROP_PRESETS,
  buildStylizePrompt,
  type ModelId,
  type SubjectType,
} from '../src/data/presets';

interface StylizeRequestBody {
  sourceImageDataUrl?: string;
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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
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

function decodeDataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const match = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl.trim()
  );
  if (!match) return null;
  const [, mimeType, subtype, b64] = match;
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes <= 0 || approxBytes > MAX_SOURCE_IMAGE_BYTES) return null;

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
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

async function handleStylize(request: Request, env: Env): Promise<Response> {
  const startedAt = Date.now();

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
      { error: '图片格式不受支持或体积超过 4MB，请使用 PNG / JPG / WebP 图片。' },
      400
    );
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
  const size = body.size === 768 ? 768 : 1024;
  const seed =
    typeof body.seed === 'number' && Number.isInteger(body.seed) && body.seed >= 0
      ? body.seed % 2147483647
      : crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647;

  const styleId = typeof body.styleId === 'string' ? body.styleId : 'official-icon';
  const expressionId = typeof body.expressionId === 'string' ? body.expressionId : 'keep';
  const customPrompt =
    typeof body.customPrompt === 'string' ? body.customPrompt.trim().slice(0, 240) : '';

  // Pass pure five-point star pattern card as input_image_1 on C-I-T-Y star slots across all subject types
  // so FLUX.2 inherits the exact pastel star backdrop without leaking another human character's face/outfit/bangs.
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
    });
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startedAt;
    console.error(
      JSON.stringify({
        event: 'avatar_stylize_failed',
        modelId: requestedModelId,
        bgId: bg.id,
        durationMs,
        error: rawMessage,
      })
    );

    const isQuota = /quota|neuron|limit|429|capacity|rate/i.test(rawMessage);
    const isFlagged = /3030|flagged/i.test(rawMessage);

    return jsonResponse(
      {
        error: isQuota
          ? 'Cloudflare Workers AI 请求额度或速率已达上限，请稍后再试。'
          : isFlagged
            ? '当前图片或描述触发了模型安全误判，建议调整描述词、切换为 9B 模型或换一张照片重试。'
            : `风格化生成失败：${rawMessage}`,
        detail: rawMessage,
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
        models: AI_MODELS.map((m) => ({
          id: m.id,
          name: m.name,
        })),
      });
    }

    if (url.pathname === '/api/stylize') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'content-type',
          },
        });
      }
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method Not Allowed' }, 405);
      }
      return handleStylize(request, env);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
