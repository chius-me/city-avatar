import React, { useCallback, useEffect, useState } from 'react';
import {
  AI_MODELS,
  BACKDROP_PRESETS,
  type Locale,
  type SamplePhoto,
} from './data/presets';
import { UI_TEXT } from './data/i18n';
import { TopBar } from './components/TopBar';
import { MenuOverlay } from './components/MenuOverlay';
import { AvatarStage, type StageViewMode } from './components/AvatarStage';
import { StylizePanel, type StylizeParams } from './components/StylizePanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { loadImageUrlAsPrepared, prepareUploadImage } from './utils/imagePrep';
import {
  clearGalleryItems,
  deleteGalleryItem,
  loadGalleryItems,
  saveGalleryItem,
  type SavedAvatarItem,
} from './utils/galleryDb';

interface StylizeApiResponse {
  imageDataUrl: string;
  prompt: string;
  modelId: StylizeParams['modelId'];
  modelName: string;
  bgId: string;
  styleId: string;
  expressionId: string;
  subjectType: StylizeParams['subjectType'];
  seed: number;
  size: number;
  usedStyleRef: boolean;
  durationMs: number;
}

const DEFAULT_PARAMS: StylizeParams = {
  modelId: '@cf/black-forest-labs/flux-2-klein-4b',
  bgId: 'c-marigold',
  styleId: 'official-icon',
  expressionId: 'keep',
  subjectType: 'auto',
  useStyleRef: true,
  customPrompt: '',
  size: 1024,
  seedInput: '',
};

const OFFICIAL_EXEMPLARS = [
  { id: 'c-marigold', src: '/style-refs/c-marigold.png', label: 'C' },
  { id: 'i-sakura', src: '/style-refs/i-sakura.png', label: 'I' },
  { id: 't-meadow', src: '/style-refs/t-meadow.png', label: 'T' },
  { id: 'y-coral', src: '/style-refs/y-coral.png', label: 'Y' },
];

export const App: React.FC = () => {
  const [locale, setLocale] = useState<Locale>('zh');
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [params, setParams] = useState<StylizeParams>(DEFAULT_PARAMS);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [sourceThumbUrl, setSourceThumbUrl] = useState<string>('');
  const [stylizedDataUrl, setStylizedDataUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<StageViewMode>('original');

  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<{
    modelName: string;
    seed: number;
    durationMs: number;
  } | null>(null);

  const [gallery, setGallery] = useState<SavedAvatarItem[]>([]);

  const t = UI_TEXT[locale];
  const activeModel =
    AI_MODELS.find((m) => m.id === params.modelId) ?? AI_MODELS[0];

  useEffect(() => {
    void loadGalleryItems().then(setGallery);
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const start = performance.now();
    setElapsedSec(0);
    const id = window.setInterval(() => {
      setElapsedSec((performance.now() - start) / 1000);
    }, 100);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  const handleUploadBlob = useCallback(
    async (blob: Blob) => {
      setErrorMessage(null);
      try {
        const prepared = await prepareUploadImage(blob);
        setSourceDataUrl(prepared.dataUrl);
        setSourceThumbUrl(prepared.thumbDataUrl);
        setStylizedDataUrl(null);
        setLastMeta(null);
        setViewMode('original');
      } catch {
        setErrorMessage(UI_TEXT[locale].uploadError);
      }
    },
    [locale]
  );

  // Clipboard Ctrl+V / Cmd+V instant paste upload
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            void handleUploadBlob(blob);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleUploadBlob]);

  const handleSelectSample = useCallback(
    async (sample: SamplePhoto) => {
      setErrorMessage(null);
      try {
        const prepared = await loadImageUrlAsPrepared(sample.url);
        setSourceDataUrl(prepared.dataUrl);
        setSourceThumbUrl(prepared.thumbDataUrl);
        setStylizedDataUrl(null);
        setLastMeta(null);
        setViewMode('original');
        setParams((prev) => ({
          ...prev,
          subjectType: sample.defaultSubject,
          bgId: sample.defaultBg,
        }));
      } catch {
        setErrorMessage(UI_TEXT[locale].uploadError);
      }
    },
    [locale]
  );

  const handleClearAll = useCallback(() => {
    setSourceDataUrl(null);
    setSourceThumbUrl('');
    setStylizedDataUrl(null);
    setLastMeta(null);
    setErrorMessage(null);
    setViewMode('original');
  }, []);

  const handleChangeParams = useCallback((patch: Partial<StylizeParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!sourceDataUrl) return;
    setIsGenerating(true);
    setErrorMessage(null);

    const parsedSeed =
      params.seedInput.trim() !== '' && Number.isFinite(Number(params.seedInput))
        ? Math.max(0, Math.floor(Number(params.seedInput)))
        : undefined;

    try {
      const resp = await fetch('/api/stylize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceImageDataUrl: sourceDataUrl,
          modelId: params.modelId,
          bgId: params.bgId,
          styleId: params.styleId,
          expressionId: params.expressionId,
          subjectType: params.subjectType,
          useStyleRef: params.useStyleRef,
          customPrompt: params.customPrompt,
          size: params.size,
          seed: parsedSeed,
        }),
      });

      const payload = (await resp.json()) as Partial<StylizeApiResponse> & {
        error?: string;
      };

      if (!resp.ok || !payload.imageDataUrl) {
        throw new Error(payload.error || `HTTP ${resp.status}`);
      }

      setStylizedDataUrl(payload.imageDataUrl);
      setViewMode('output');
      setLastMeta({
        modelName: payload.modelName ?? activeModel.name,
        seed: payload.seed ?? 0,
        durationMs: payload.durationMs ?? 0,
      });

      const savedItem: SavedAvatarItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourceThumbUrl,
        imageDataUrl: payload.imageDataUrl,
        bgId: params.bgId,
        styleId: params.styleId,
        expressionId: params.expressionId,
        subjectType: params.subjectType,
        modelId: params.modelId,
        modelName: payload.modelName ?? activeModel.name,
        customPrompt: params.customPrompt,
        prompt: payload.prompt ?? '',
        seed: payload.seed ?? 0,
        durationMs: payload.durationMs ?? 0,
        createdAt: Date.now(),
      };
      const updated = await saveGalleryItem(savedItem);
      setGallery(updated);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Generation failed. Please retry.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [activeModel.name, params, sourceDataUrl, sourceThumbUrl]);

  const handleLoadHistoryItem = useCallback((item: SavedAvatarItem) => {
    setSourceDataUrl(item.sourceThumbUrl || item.imageDataUrl);
    setSourceThumbUrl(item.sourceThumbUrl);
    setStylizedDataUrl(item.imageDataUrl);
    setViewMode('output');
    setErrorMessage(null);
    setParams((prev) => ({
      ...prev,
      modelId: item.modelId,
      bgId: item.bgId,
      styleId: item.styleId,
      expressionId: item.expressionId,
      subjectType: item.subjectType,
      customPrompt: item.customPrompt,
      seedInput: String(item.seed),
    }));
    setLastMeta({
      modelName: item.modelName,
      seed: item.seed,
      durationMs: item.durationMs,
    });
  }, []);

  const handleDeleteHistoryItem = useCallback(async (id: string) => {
    const next = await deleteGalleryItem(id);
    setGallery(next);
  }, []);

  const handleClearGallery = useCallback(async () => {
    await clearGalleryItems();
    setGallery([]);
  }, []);

  return (
    <div className="city-app">
      <TopBar
        locale={locale}
        onChangeLocale={setLocale}
        galleryCount={gallery.length}
        onOpenGallery={() => setDrawerOpen(true)}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        onResetWorkspace={handleClearAll}
      />

      <main className="studio-shell">
        {/* Compact Hero Strip + Clickable Official Style Exemplars */}
        <section className="studio-intro">
          <div className="intro-copy">
            <div className="intro-heading-row">
              <h1 className="intro-title">{t.introTitle}</h1>
              <span className="city-dots" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
            </div>
            <p className="intro-sub">{t.introSub}</p>
          </div>

          <div className="intro-exemplars">
            <span className="exemplar-caption">{t.stylePreviewHint}</span>
            <div className="exemplar-strip">
              {OFFICIAL_EXEMPLARS.map((ex) => {
                const preset = BACKDROP_PRESETS.find((b) => b.id === ex.id);
                const active = params.bgId === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    className={`exemplar-thumb ${active ? 'is-active' : ''}`}
                    style={{ borderColor: active ? '#141419' : undefined }}
                    onClick={() => handleChangeParams({ bgId: ex.id })}
                    title={preset ? `${preset.label[locale]}` : ex.label}
                  >
                    <img src={ex.src} alt={ex.label} />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Focused Two-Column Workspace */}
        <section className="studio-workspace">
          <AvatarStage
            locale={locale}
            sourceDataUrl={sourceDataUrl}
            stylizedDataUrl={stylizedDataUrl}
            bgId={params.bgId}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            isGenerating={isGenerating}
            elapsedSec={elapsedSec}
            activeModelName={activeModel.name}
            onUploadFile={(file) => void handleUploadBlob(file)}
            onSelectSample={(sp) => void handleSelectSample(sp)}
            onClearAll={handleClearAll}
          />

          <StylizePanel
            locale={locale}
            params={params}
            onChangeParams={handleChangeParams}
            hasSourcePhoto={Boolean(sourceDataUrl)}
            hasOutput={Boolean(stylizedDataUrl)}
            isGenerating={isGenerating}
            elapsedSec={elapsedSec}
            errorMessage={errorMessage}
            lastMeta={lastMeta}
            onGenerate={() => void handleGenerate()}
          />
        </section>
      </main>

      <footer className="city-footer">
        <span>{t.footerDisclaimer}</span>
        <span className="footer-sep">·</span>
        <a href="https://city-the-animation.com/character/" target="_blank" rel="noreferrer">
          {t.officialSite}
        </a>
        <span className="footer-sep">·</span>
        <a href="https://social.city.chius.dev" target="_blank" rel="noreferrer">
          {t.socialMap}
        </a>
        <span className="footer-sep">·</span>
        <a
          href="https://github.com/chius-me/awesome-citytheanimation"
          target="_blank"
          rel="noreferrer"
        >
          {t.awesomeRepo}
        </a>
      </footer>

      <HistoryDrawer
        open={drawerOpen}
        locale={locale}
        items={gallery}
        onClose={() => setDrawerOpen(false)}
        onLoadItem={handleLoadHistoryItem}
        onDeleteItem={(id) => void handleDeleteHistoryItem(id)}
        onClearAll={() => void handleClearGallery()}
      />

      <MenuOverlay
        open={menuOpen}
        locale={locale}
        galleryCount={gallery.length}
        onClose={() => setMenuOpen(false)}
        onOpenGallery={() => setDrawerOpen(true)}
      />
    </div>
  );
};

export default App;
