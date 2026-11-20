import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Download,
  ImagePlus,
  MoveHorizontal,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquareRoundCorner,
  Trash2,
} from 'lucide-react';
import {
  BACKDROP_PRESETS,
  FRAME_PRESETS,
  SAMPLE_PHOTOS,
  type FramePreset,
  type Locale,
  type SamplePhoto,
} from '../data/presets';
import { UI_TEXT, pickText } from '../data/i18n';
import { CityDots, CityLoadingDots } from './city-shell';

export type PreviewMask = 'circle' | 'rounded' | 'square';
export type StageViewMode = 'output' | 'compare' | 'original';

interface AvatarStageProps {
  locale: Locale;
  sourceDataUrl: string | null;
  stylizedDataUrl: string | null;
  bgId: string;
  viewMode: StageViewMode;
  onChangeViewMode: (mode: StageViewMode) => void;
  isGenerating: boolean;
  elapsedSec: number;
  activeModelName: string;
  onUploadFile: (file: File) => void;
  onSelectSample: (sample: SamplePhoto) => void;
  onClearAll: () => void;
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  fill: string,
  stroke?: string
) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFivePointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  fill: string,
  stroke?: string
) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export const AvatarStage: React.FC<AvatarStageProps> = ({
  locale,
  sourceDataUrl,
  stylizedDataUrl,
  bgId,
  viewMode,
  onChangeViewMode,
  isGenerating,
  elapsedSec,
  activeModelName,
  onUploadFile,
  onSelectSample,
  onClearAll,
}) => {
  const t = UI_TEXT[locale];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const compareBoxRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const [isDragOver, setIsDragOver] = useState(false);
  const [mask, setMask] = useState<PreviewMask>('rounded');
  const [frame, setFrame] = useState<FramePreset['id']>('none');
  const [zoom, setZoom] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [showDots, setShowDots] = useState<boolean>(false);
  const [showSparkles, setShowSparkles] = useState<boolean>(false);
  const [caption, setCaption] = useState<string>('');
  const [decorateOpen, setDecorateOpen] = useState<boolean>(false);
  const [imageTick, setImageTick] = useState<number>(0);
  const [copiedState, setCopiedState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [comparePos, setComparePos] = useState<number>(50);
  const [compareDragging, setCompareDragging] = useState<boolean>(false);

  const activeBg =
    BACKDROP_PRESETS.find((b) => b.id === bgId) ?? BACKDROP_PRESETS[0];

  const activeCanvasSrc =
    viewMode === 'original' || !stylizedDataUrl ? sourceDataUrl : stylizedDataUrl;

  useEffect(() => {
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1.0);
  }, [activeCanvasSrc]);

  useEffect(() => {
    if (!activeCanvasSrc) {
      loadedImageRef.current = null;
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) {
        loadedImageRef.current = img;
        setImageTick((tick) => tick + 1);
      }
    };
    img.src = activeCanvasSrc;
    return () => {
      cancelled = true;
    };
  }, [activeCanvasSrc]);

  const drawFrameDecoration = useCallback(
    (ctx: CanvasRenderingContext2D, S: number, shapeMask: PreviewMask) => {
      if (frame === 'city-conic') {
        ctx.save();
        const ringWidth = 34;
        if (shapeMask === 'circle') {
          const cx = S / 2;
          const cy = S / 2;
          const r = S / 2 - ringWidth / 2 - 4;
          const colors = ['#f7b647', '#f09cb4', '#99cb77', '#ee847d'];
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, i * (Math.PI / 2), (i + 1) * (Math.PI / 2));
            ctx.strokeStyle = colors[i];
            ctx.lineWidth = ringWidth;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(cx, cy, S / 2 - 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 8;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, S / 2 - ringWidth - 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 6;
          ctx.stroke();
        } else {
          const colors = ['#f7b647', '#f09cb4', '#99cb77', '#ee847d'];
          const half = S / 2;
          const rects: [number, number, number, number][] = [
            [0, 0, half, half],
            [half, 0, half, half],
            [0, half, half, half],
            [half, half, half, half],
          ];
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, S, S);
          const inset = ringWidth + 4;
          const innerRadius = shapeMask === 'rounded' ? 148 : 18;
          drawRoundedRectPath(ctx, inset, inset, S - inset * 2, S - inset * 2, innerRadius);
          ctx.clip('evenodd');
          rects.forEach(([rx, ry, rw, rh], idx) => {
            ctx.fillStyle = colors[idx];
            ctx.fillRect(rx, ry, rw, rh);
          });
          ctx.restore();

          drawRoundedRectPath(ctx, 4, 4, S - 8, S - 8, shapeMask === 'rounded' ? 178 : 8);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 8;
          ctx.stroke();

          drawRoundedRectPath(ctx, inset, inset, S - inset * 2, S - inset * 2, innerRadius);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 6;
          ctx.stroke();
        }
        ctx.restore();
      } else if (frame === 'storybook-ink') {
        ctx.save();
        if (shapeMask === 'circle') {
          ctx.beginPath();
          ctx.arc(S / 2, S / 2, S / 2 - 22, 0, Math.PI * 2);
          ctx.strokeStyle = '#fefaf2';
          ctx.lineWidth = 28;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 10;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(S / 2, S / 2, S / 2 - 36, 0, Math.PI * 2);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 6;
          ctx.stroke();
        } else {
          const rad = shapeMask === 'rounded' ? 172 : 12;
          drawRoundedRectPath(ctx, 20, 20, S - 40, S - 40, rad);
          ctx.strokeStyle = '#fefaf2';
          ctx.lineWidth = 28;
          ctx.stroke();

          drawRoundedRectPath(ctx, 6, 6, S - 12, S - 12, rad);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 10;
          ctx.stroke();

          drawRoundedRectPath(ctx, 34, 34, S - 68, S - 68, Math.max(8, rad - 28));
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 6;
          ctx.stroke();
        }
        ctx.restore();
      } else if (frame === 'star-ring') {
        ctx.save();
        const cx = S / 2;
        const cy = S / 2;
        if (shapeMask === 'circle') {
          ctx.beginPath();
          ctx.arc(cx, cy, S / 2 - 14, 0, Math.PI * 2);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 12;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, S / 2 - 24, 0, Math.PI * 2);
          ctx.strokeStyle = activeBg.color;
          ctx.lineWidth = 10;
          ctx.stroke();
        } else {
          drawRoundedRectPath(ctx, 14, 14, S - 28, S - 28, shapeMask === 'rounded' ? 168 : 8);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 10;
          ctx.stroke();
        }
        drawFivePointStar(ctx, 138, 138, 52, 24, '#f7b647', '#141419');
        drawFivePointStar(ctx, S - 134, 152, 42, 19, '#f09cb4', '#141419');
        drawFourPointStar(ctx, 154, S - 142, 44, 16, '#99cb77', '#141419');
        drawFivePointStar(ctx, S - 142, S - 136, 48, 22, '#ee847d', '#141419');
        ctx.restore();
      } else if (frame === 'dotted-pop') {
        ctx.save();
        const colors = ['#f7b647', '#f09cb4', '#99cb77', '#ee847d'];
        const count = 24;
        const rOrbit = S / 2 - 30;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          const dx =
            shapeMask === 'circle'
              ? S / 2 + Math.cos(angle) * rOrbit
              : i < 6
                ? 85 + i * 170
                : i < 12
                  ? S - 36
                  : i < 18
                    ? S - 85 - (i - 12) * 170
                    : 36;
          const dy =
            shapeMask === 'circle'
              ? S / 2 + Math.sin(angle) * rOrbit
              : i < 6
                ? 36
                : i < 12
                  ? 85 + (i - 6) * 170
                  : i < 18
                    ? S - 36
                    : S - 85 - (i - 18) * 170;
          ctx.beginPath();
          ctx.arc(dx, dy, 16, 0, Math.PI * 2);
          ctx.fillStyle = colors[i % 4];
          ctx.fill();
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        ctx.restore();
      } else if (frame === 'resident-card') {
        ctx.save();
        const pad = 26;
        const r = shapeMask === 'circle' ? S / 2 - pad : shapeMask === 'rounded' ? 160 : 20;
        if (shapeMask === 'circle') {
          ctx.beginPath();
          ctx.arc(S / 2, S / 2, r, 0, Math.PI * 2);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 10;
          ctx.stroke();
        } else {
          drawRoundedRectPath(ctx, pad, pad, S - pad * 2, S - pad * 2, r);
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 10;
          ctx.stroke();
        }
        const badgeW = 290;
        const badgeH = 58;
        const bx = S / 2 - badgeW / 2;
        const by = 40;
        drawRoundedRectPath(ctx, bx, by, badgeW, badgeH, 29);
        ctx.fillStyle = '#141419';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 28px "M PLUS Rounded 1c", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CITY RESIDENT', S / 2 - 22, by + badgeH / 2 + 1);

        const dotColors = ['#f7b647', '#f09cb4', '#99cb77', '#ee847d'];
        dotColors.forEach((col, i) => {
          ctx.beginPath();
          ctx.arc(bx + badgeW - 76 + i * 16, by + badgeH / 2, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
        });
        ctx.restore();
      }
    },
    [activeBg.color, frame]
  );

  const renderCompositeToContext = useCallback(
    (ctx: CanvasRenderingContext2D, S: number, clipMask: PreviewMask | null) => {
      ctx.clearRect(0, 0, S, S);

      ctx.save();
      if (clipMask === 'circle') {
        ctx.beginPath();
        ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
        ctx.clip();
      } else if (clipMask === 'rounded') {
        drawRoundedRectPath(ctx, 0, 0, S, S, S * 0.18);
        ctx.clip();
      }

      ctx.fillStyle = activeBg.softColor;
      ctx.fillRect(0, 0, S, S);

      const img = loadedImageRef.current;
      if (img && img.naturalWidth > 0) {
        const coverScale = Math.max(S / img.naturalWidth, S / img.naturalHeight);
        const drawScale = coverScale * zoom;
        const dw = img.naturalWidth * drawScale;
        const dh = img.naturalHeight * drawScale;
        const dx = (S - dw) / 2 + offsetX;
        const dy = (S - dh) / 2 + offsetY;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, dx, dy, dw, dh);
      }

      if (showSparkles) {
        drawFourPointStar(ctx, 184, 212, 34, 11, '#fff3b0', '#141419');
        drawFourPointStar(ctx, 846, 260, 26, 9, '#ffffff', '#141419');
        drawFourPointStar(ctx, 810, 744, 30, 10, '#f7b647', '#141419');
        drawFourPointStar(ctx, 206, 760, 22, 8, '#f09cb4', '#141419');
      }

      if (showDots) {
        const dotColors = ['#f7b647', '#f09cb4', '#99cb77', '#ee847d'];
        const startX = S / 2 - 48;
        const yPos = 96;
        dotColors.forEach((col, i) => {
          ctx.beginPath();
          ctx.arc(startX + i * 32, yPos, 11, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.strokeStyle = '#141419';
          ctx.lineWidth = 4;
          ctx.stroke();
        });
      }

      drawFrameDecoration(ctx, S, clipMask ?? mask);

      const cleanCaption = caption.trim();
      if (cleanCaption) {
        ctx.save();
        ctx.font = '900 38px "M PLUS Rounded 1c", "Noto Sans SC", sans-serif';
        const metrics = ctx.measureText(cleanCaption);
        const pillW = Math.min(S - 180, Math.max(240, metrics.width + 88));
        const pillH = 74;
        const px = S / 2 - pillW / 2;
        const py = S - pillH - 64;

        drawRoundedRectPath(ctx, px + 5, py + 6, pillW, pillH, 37);
        ctx.fillStyle = '#141419';
        ctx.fill();

        drawRoundedRectPath(ctx, px, py, pillW, pillH, 37);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#141419';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#141419';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cleanCaption, S / 2, py + pillH / 2 + 2, pillW - 44);
        ctx.restore();
      }

      ctx.restore();
    },
    [activeBg.softColor, caption, drawFrameDecoration, mask, offsetX, offsetY, showDots, showSparkles, zoom]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const S = 1024;
    if (canvas.width !== S || canvas.height !== S) {
      canvas.width = S;
      canvas.height = S;
    }
    renderCompositeToContext(ctx, S, null);
  }, [renderCompositeToContext, imageTick, sourceDataUrl, stylizedDataUrl, viewMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeCanvasSrc || viewMode === 'compare') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: offsetX,
      origY: offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const factor = 1024 / Math.max(1, rect.width);
    const dx = (e.clientX - dragRef.current.startX) * factor;
    const dy = (e.clientY - dragRef.current.startY) * factor;
    setOffsetX(Math.max(-420, Math.min(420, dragRef.current.origX + dx)));
    setOffsetY(Math.max(-420, Math.min(420, dragRef.current.origY + dy)));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const updateCompareFromClientX = (clientX: number) => {
    const el = compareBoxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    setComparePos(Math.max(4, Math.min(96, pct)));
  };

  const renderExportCanvas = (): HTMLCanvasElement | null => {
    const out = document.createElement('canvas');
    out.width = 1024;
    out.height = 1024;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    renderCompositeToContext(ctx, 1024, mask);
    return out;
  };

  const exportAvatar = (format: 'png' | 'webp') => {
    const outCanvas = renderExportCanvas();
    if (!outCanvas) return;
    const mime = format === 'png' ? 'image/png' : 'image/webp';
    outCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `city-avatar-${Date.now()}.${format}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      },
      mime,
      0.95
    );
  };

  const handleCopyClipboard = async () => {
    const outCanvas = renderExportCanvas();
    if (!outCanvas || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
      setCopiedState('error');
      setTimeout(() => setCopiedState('idle'), 2000);
      return;
    }
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        outCanvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('Failed to encode PNG');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedState('copied');
      setTimeout(() => setCopiedState('idle'), 2000);
    } catch {
      setCopiedState('error');
      setTimeout(() => setCopiedState('idle'), 2000);
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = '';
  };

  const maskClass =
    mask === 'circle'
      ? 'mask-circle'
      : mask === 'rounded'
        ? 'mask-rounded'
        : 'mask-square';

  return (
    <div className="stage-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Rotating 4-color C-I-T-Y jewel border around the Studio Stage */}
      <div className="stage-conic-frame">
        <div
          className="stage-card"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDropFiles}
        >
          {/* Top Bar */}
          {sourceDataUrl ? (
            <div className="stage-topbar">
              <div className="stage-view-tabs" role="tablist">
                {stylizedDataUrl && (
                  <>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'output'}
                      className={`stage-tab ${viewMode === 'output' ? 'is-active' : ''}`}
                      onClick={() => onChangeViewMode('output')}
                    >
                      {t.tabOutput}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'compare'}
                      className={`stage-tab ${viewMode === 'compare' ? 'is-active' : ''}`}
                      onClick={() => onChangeViewMode('compare')}
                    >
                      {t.tabCompare}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'original' || !stylizedDataUrl}
                  className={`stage-tab ${
                    viewMode === 'original' || !stylizedDataUrl ? 'is-active' : ''
                  }`}
                  onClick={() => onChangeViewMode('original')}
                >
                  {t.tabOriginal}
                </button>
              </div>

              <div className="stage-quick-actions">
                <button
                  type="button"
                  className="city-chip-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={13} /> {t.replacePhoto}
                </button>
                <button
                  type="button"
                  className="city-chip-btn"
                  onClick={onClearAll}
                  title={t.resetAll}
                  aria-label={t.resetAll}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="stage-topbar stage-topbar--empty">
              <span className="stage-empty-badge">
                <Sparkles size={13} /> PHOTO → CITY AVATAR
              </span>
              <CityDots />
            </div>
          )}

          {/* Square 1:1 Viewport */}
          {!sourceDataUrl ? (
            <div
              className={`stage-dropzone ${isDragOver ? 'is-drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="dropzone-icon-ring">
                <ImagePlus size={30} strokeWidth={2.4} />
              </div>
              <div className="dropzone-headline">{t.dropHeadline}</div>
              <p className="dropzone-hint">{t.dropHint}</p>
              <span className="city-pill city-pill--primary dropzone-btn">
                {t.chooseFile}
              </span>

              <div
                className="dropzone-samples"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="dropzone-samples-label">{t.orTrySample}:</span>
                {SAMPLE_PHOTOS.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    className="sample-pill"
                    onClick={() => onSelectSample(sp)}
                  >
                    <img src={sp.url} alt="" />
                    <span>{pickText(sp.label, locale)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : viewMode === 'compare' && stylizedDataUrl ? (
            <div
              ref={compareBoxRef}
              className={`stage-viewport stage-compare-box ${isDragOver ? 'is-drag-over' : ''}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setCompareDragging(true);
                updateCompareFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (compareDragging) updateCompareFromClientX(e.clientX);
              }}
              onPointerUp={() => setCompareDragging(false)}
              onPointerCancel={() => setCompareDragging(false)}
            >
              <img
                src={stylizedDataUrl}
                alt={t.compareAfter}
                className={`compare-layer compare-after ${maskClass}`}
                draggable={false}
              />
              <div
                className="compare-before-clip"
                style={{ clipPath: `inset(0 ${100 - comparePos}% 0 0)` }}
              >
                <img
                  src={sourceDataUrl}
                  alt={t.compareBefore}
                  className={`compare-layer ${maskClass}`}
                  draggable={false}
                />
              </div>
              <div className="compare-divider" style={{ left: `${comparePos}%` }}>
                <div className="compare-handle">
                  <MoveHorizontal size={15} strokeWidth={2.8} />
                </div>
              </div>
              <span className="compare-tag compare-tag--left">{t.compareBefore}</span>
              <span className="compare-tag compare-tag--right">{t.compareAfter}</span>

              {isGenerating && (
                <div className="stage-loading-veil">
                  <CityLoadingDots />
                  <div className="stage-loading-title">
                    {t.generatingTitle} ({elapsedSec.toFixed(1)}s)
                  </div>
                  <div className="stage-loading-sub">
                    {activeModelName} · {t.generatingSub}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`stage-viewport ${isDragOver ? 'is-drag-over' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                width={1024}
                height={1024}
                className={`stage-canvas ${maskClass}`}
              />
              {isGenerating && (
                <div className="stage-loading-veil">
                  <CityLoadingDots />
                  <div className="stage-loading-title">
                    {t.generatingTitle} ({elapsedSec.toFixed(1)}s)
                  </div>
                  <div className="stage-loading-sub">
                    {activeModelName} · {t.generatingSub}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mask + Collapsible Frame & Export Controls when an image is loaded */}
          {sourceDataUrl && (
            <>
              <div className="stage-controls-row">
                <div className="stage-mask-group" role="group" aria-label="Shape">
                  <button
                    type="button"
                    className={`stage-mask-btn ${mask === 'rounded' ? 'is-active' : ''}`}
                    onClick={() => setMask('rounded')}
                  >
                    <SquareRoundCorner size={13} /> {t.maskRounded}
                  </button>
                  <button
                    type="button"
                    className={`stage-mask-btn ${mask === 'circle' ? 'is-active' : ''}`}
                    onClick={() => setMask('circle')}
                  >
                    <Circle size={13} /> {t.maskCircle}
                  </button>
                  <button
                    type="button"
                    className={`stage-mask-btn ${mask === 'square' ? 'is-active' : ''}`}
                    onClick={() => setMask('square')}
                  >
                    <Square size={13} /> {t.maskSquare}
                  </button>
                </div>

                <button
                  type="button"
                  className={`city-chip-btn ${decorateOpen ? 'is-primary' : ''}`}
                  onClick={() => setDecorateOpen((v) => !v)}
                >
                  <SlidersHorizontal size={13} />
                  <span>{t.decorateToggle}</span>
                  {decorateOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {decorateOpen && (
                <div className="stage-decorate-tray">
                  <div className="decorate-row">
                    <div className="decorate-label">{t.frameLabel}</div>
                    <div className="decorate-chips">
                      {FRAME_PRESETS.map((fp) => (
                        <button
                          key={fp.id}
                          type="button"
                          className={`city-chip-btn ${frame === fp.id ? 'is-primary' : ''}`}
                          onClick={() => setFrame(fp.id)}
                        >
                          {pickText(fp.label, locale)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="decorate-row">
                    <div className="decorate-label-between">
                      <span>
                        {t.zoomLabel} ({Math.round(zoom * 100)}%)
                      </span>
                      <button
                        type="button"
                        className="city-chip-btn"
                        onClick={() => {
                          setZoom(1.0);
                          setOffsetX(0);
                          setOffsetY(0);
                        }}
                      >
                        <RotateCcw size={11} /> {t.resetView}
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0.8}
                      max={2.2}
                      step={0.02}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="city-slider"
                      aria-label={t.zoomLabel}
                    />
                  </div>

                  <div className="decorate-row">
                    <div className="decorate-toggles">
                      <label className="city-checkbox">
                        <input
                          type="checkbox"
                          checked={showDots}
                          onChange={(e) => setShowDots(e.target.checked)}
                        />
                        <span>{t.dotsToggle}</span>
                      </label>
                      <label className="city-checkbox">
                        <input
                          type="checkbox"
                          checked={showSparkles}
                          onChange={(e) => setShowSparkles(e.target.checked)}
                        />
                        <span>{t.sparklesToggle}</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      className="city-input"
                      maxLength={24}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={t.captionPlaceholder}
                    />
                  </div>
                </div>
              )}

              <div className="stage-export-bar">
                <button
                  type="button"
                  className="city-pill city-pill--primary"
                  onClick={() => exportAvatar('png')}
                >
                  <Download size={15} strokeWidth={2.5} /> {t.exportPng}
                </button>
                <button
                  type="button"
                  className="city-pill"
                  onClick={() => exportAvatar('webp')}
                >
                  <Download size={14} strokeWidth={2.4} /> {t.exportWebp}
                </button>
                <button
                  type="button"
                  className="city-pill"
                  onClick={handleCopyClipboard}
                  title={t.copyBtn}
                >
                  {copiedState === 'copied' ? (
                    <>
                      <Check size={14} /> {t.copiedBtn}
                    </>
                  ) : copiedState === 'error' ? (
                    t.copyUnsupported
                  ) : (
                    <>
                      <Copy size={14} /> {t.copyBtn}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
