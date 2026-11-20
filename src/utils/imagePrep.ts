export interface PreparedImage {
  dataUrl: string;
  thumbDataUrl: string;
  width: number;
  height: number;
}

export async function prepareUploadImage(blob: Blob): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(blob);
  try {
    const maxDim = 768;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(64, Math.round(bitmap.width * scale));
    const h = Math.max(64, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // 180x180 square-cover thumbnail for compact IndexedDB gallery storage
    const thumbSize = 180;
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbSize;
    thumbCanvas.height = thumbSize;
    const tctx = thumbCanvas.getContext('2d');
    if (!tctx) throw new Error('Canvas 2D context unavailable');

    const srcSide = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - srcSide) / 2;
    const sy = (bitmap.height - srcSide) / 2;
    tctx.drawImage(bitmap, sx, sy, srcSide, srcSide, 0, 0, thumbSize, thumbSize);
    const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);

    return { dataUrl, thumbDataUrl, width: w, height: h };
  } finally {
    bitmap.close();
  }
}

export async function loadImageUrlAsPrepared(url: string): Promise<PreparedImage> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load sample image (${resp.status})`);
  }
  const blob = await resp.blob();
  return prepareUploadImage(blob);
}
