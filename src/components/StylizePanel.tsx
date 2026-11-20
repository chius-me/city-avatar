import React, { useMemo, useState } from 'react';
import {
  Cat,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Lock,
  Sparkles,
  User,
  Wand2,
} from 'lucide-react';
import {
  AI_MODELS,
  BACKDROP_PRESETS,
  EXPRESSION_PRESETS,
  STYLE_PRESETS,
  buildStylizePrompt,
  type Locale,
  type ModelId,
  type SubjectType,
} from '../data/presets';
import { UI_TEXT, pickText } from '../data/i18n';
import type { QuotaState } from '../App';
import { TurnstileWidget } from './TurnstileWidget';

export interface StylizeParams {
  modelId: ModelId;
  bgId: string;
  styleId: string;
  expressionId: string;
  subjectType: SubjectType;
  useStyleRef: boolean;
  customPrompt: string;
  size: 768 | 1024;
  seedInput: string;
}

interface StylizePanelProps {
  locale: Locale;
  params: StylizeParams;
  onChangeParams: (patch: Partial<StylizeParams>) => void;
  hasSourcePhoto: boolean;
  hasOutput: boolean;
  isGenerating: boolean;
  elapsedSec: number;
  errorMessage: string | null;
  lastMeta: {
    modelName: string;
    seed: number;
    durationMs: number;
  } | null;
  quota: QuotaState | null;
  turnstileToken: string | null;
  turnstileResetTick: number;
  onTurnstileToken: (token: string | null) => void;
  onGenerate: () => void;
}

export const StylizePanel: React.FC<StylizePanelProps> = ({
  locale,
  params,
  onChangeParams,
  hasSourcePhoto,
  hasOutput,
  isGenerating,
  elapsedSec,
  errorMessage,
  lastMeta,
  quota,
  turnstileToken,
  turnstileResetTick,
  onTurnstileToken,
  onGenerate,
}) => {
  const t = UI_TEXT[locale];
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const selectedBg =
    BACKDROP_PRESETS.find((b) => b.id === params.bgId) ?? BACKDROP_PRESETS[0];

  const refKind: 'character-icon' | 'star-pattern' | 'none' = useMemo(() => {
    if (!params.useStyleRef) return 'none';
    if (
      selectedBg.slot === 'C' ||
      selectedBg.slot === 'I' ||
      selectedBg.slot === 'T' ||
      selectedBg.slot === 'Y'
    ) {
      return 'star-pattern';
    }
    return 'none';
  }, [params.useStyleRef, selectedBg.slot]);

  const livePrompt = useMemo(
    () =>
      buildStylizePrompt({
        bgId: params.bgId,
        styleId: params.styleId,
        expressionId: params.expressionId,
        subjectType: params.subjectType,
        customPrompt: params.customPrompt,
        useStyleRef: params.useStyleRef,
        refKind,
      }),
    [params, refKind]
  );

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(livePrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="panel-col">
      <div className="control-card">
        {/* 1. Subject Type */}
        <section className="control-section">
          <div className="control-label">{t.subjectLabel}</div>
          <div className="subject-segment" role="radiogroup" aria-label={t.subjectLabel}>
            {(
              [
                { id: 'auto', label: t.subjectAuto, icon: <Sparkles size={14} /> },
                { id: 'person', label: t.subjectPerson, icon: <User size={14} /> },
                { id: 'creature', label: t.subjectCreature, icon: <Cat size={14} /> },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={params.subjectType === opt.id}
                className={`subject-pill ${params.subjectType === opt.id ? 'is-active' : ''}`}
                onClick={() => onChangeParams({ subjectType: opt.id })}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Backdrop Color Swatches (C-I-T-Y Star Slots + Sky/Sunset) */}
        <section className="control-section">
          <div className="control-label">{t.backdropLabel}</div>
          <div className="swatch-grid">
            {BACKDROP_PRESETS.map((bg) => {
              const active = params.bgId === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  className={`swatch-btn ${active ? 'is-active' : ''}`}
                  onClick={() => onChangeParams({ bgId: bg.id })}
                >
                  <span
                    className="swatch-dot"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${bg.softColor}, ${bg.color} 72%)`,
                    }}
                  />
                  <span>{pickText(bg.label, locale)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Art Style */}
        <section className="control-section">
          <div className="control-label">{t.styleLabel}</div>
          <div className="choice-chips">
            {STYLE_PRESETS.map((st) => (
              <button
                key={st.id}
                type="button"
                className={`choice-chip ${params.styleId === st.id ? 'is-active' : ''}`}
                onClick={() => onChangeParams({ styleId: st.id })}
              >
                {pickText(st.label, locale)}
              </button>
            ))}
          </div>
        </section>

        {/* 4. Expression */}
        <section className="control-section">
          <div className="control-label">{t.expressionLabel}</div>
          <div className="choice-chips">
            {EXPRESSION_PRESETS.map((ex) => (
              <button
                key={ex.id}
                type="button"
                className={`choice-chip ${params.expressionId === ex.id ? 'is-active' : ''}`}
                onClick={() => onChangeParams({ expressionId: ex.id })}
              >
                {pickText(ex.label, locale)}
              </button>
            ))}
          </div>
        </section>

        {/* 5. Optional Custom Detail */}
        <section className="control-section">
          <div className="control-label">{t.detailLabel}</div>
          <input
            type="text"
            className="city-input"
            maxLength={200}
            value={params.customPrompt}
            onChange={(e) => onChangeParams({ customPrompt: e.target.value })}
            placeholder={t.detailPlaceholder}
          />
        </section>

        {/* 6. Advanced Accordion */}
        <section className="control-section">
          <button
            type="button"
            className="advanced-toggle-btn"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
          >
            <span>{t.advancedToggle}</span>
            {advancedOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {advancedOpen && (
            <div className="advanced-drawer">
              <div>
                <div className="adv-sublabel">{t.modelLabel}</div>
                <div className="model-pills">
                  {AI_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`model-pill ${params.modelId === m.id ? 'is-active' : ''}`}
                      onClick={() => onChangeParams({ modelId: m.id })}
                    >
                      <span className="model-pill-name">{m.name}</span>
                      <span className="model-pill-tag">{pickText(m.badge, locale)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="adv-inline-row">
                <label className="city-checkbox">
                  <input
                    type="checkbox"
                    checked={params.useStyleRef}
                    onChange={(e) => onChangeParams({ useStyleRef: e.target.checked })}
                  />
                  <span>{t.styleRefLabel}</span>
                </label>

                <div className="adv-mini-inputs">
                  <select
                    aria-label={t.sizeLabel}
                    value={params.size}
                    onChange={(e) =>
                      onChangeParams({ size: e.target.value === '768' ? 768 : 1024 })
                    }
                    className="city-chip-btn"
                  >
                    <option value={1024}>1024×1024</option>
                    <option value={768}>768×768</option>
                  </select>

                  <input
                    type="number"
                    min={0}
                    max={2147483646}
                    value={params.seedInput}
                    onChange={(e) => onChangeParams({ seedInput: e.target.value })}
                    placeholder={t.seedPlaceholder}
                    aria-label={t.seedLabel}
                    className="city-chip-btn adv-seed-input"
                  />
                </div>
              </div>

              <div className="prompt-helper-wrap">
                <div className="adv-prompt-head">
                  <span className="adv-sublabel">{t.promptLabel}</span>
                  <button
                    type="button"
                    className="city-chip-btn"
                    onClick={handleCopyPrompt}
                  >
                    {copiedPrompt ? (
                      <>
                        <Check size={11} /> {t.copiedBtn}
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> {t.copyPrompt}
                      </>
                    )}
                  </button>
                </div>
                <div className="prompt-preview-text">{livePrompt}</div>
              </div>
            </div>
          )}
        </section>

        {errorMessage && (
          <div className="studio-error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Primary CTA + Security + Daily Credits */}
        {(() => {
          const selectedModel =
            AI_MODELS.find((m) => m.id === params.modelId) ?? AI_MODELS[0];
          const paused = quota?.generationEnabled === false;
          const globalExhausted = Boolean(quota?.globalExhausted);
          const insufficientCredits =
            quota !== null && selectedModel.creditCost > quota.ipRemaining;
          const waitingForTurnstile =
            Boolean(quota?.turnstileEnabled) && !turnstileToken;
          const ctaDisabled =
            !hasSourcePhoto ||
            isGenerating ||
            paused ||
            globalExhausted ||
            insufficientCredits ||
            waitingForTurnstile;

          const showTurnstile =
            Boolean(quota?.turnstileEnabled && quota.turnstileSiteKey) &&
            hasSourcePhoto &&
            !paused &&
            !globalExhausted;

          let statusHint: string | null = null;
          let statusTone: 'muted' | 'warn' = 'muted';

          if (!hasSourcePhoto) {
            statusHint = t.needPhotoHint;
          } else if (paused) {
            statusHint = t.servicePaused;
            statusTone = 'warn';
          } else if (globalExhausted) {
            statusHint = t.globalExhausted;
            statusTone = 'warn';
          } else if (insufficientCredits && quota) {
            statusHint = t.quotaInsufficient
              .replace('{rem}', String(quota.ipRemaining))
              .replace('{cost}', String(selectedModel.creditCost));
            statusTone = 'warn';
          } else if (waitingForTurnstile) {
            statusHint = t.turnstileWaiting;
          } else if (quota) {
            statusHint = t.quotaStatus
              .replace('{rem}', String(quota.ipRemaining))
              .replace('{lim}', String(quota.ipLimit))
              .replace('{cost}', String(selectedModel.creditCost));
          }

          return (
            <div className="cta-block">
              {showTurnstile && quota && (
                <TurnstileWidget
                  siteKey={quota.turnstileSiteKey}
                  resetSignal={turnstileResetTick}
                  onToken={onTurnstileToken}
                />
              )}

              <button
                type="button"
                className="city-pill city-pill--primary generate-main-btn"
                disabled={ctaDisabled}
                onClick={onGenerate}
              >
                <Wand2 size={18} strokeWidth={2.5} />
                <span>
                  {isGenerating
                    ? `${elapsedSec.toFixed(1)}s…`
                    : hasOutput
                      ? t.regenerateCta
                      : t.generateCta}
                </span>
              </button>

              {statusHint && (
                <div
                  className={`need-photo-hint ${
                    statusTone === 'warn' ? 'is-warn' : ''
                  }`}
                >
                  {statusHint}
                </div>
              )}

              {lastMeta && !isGenerating && (
                <div className="last-meta-row">
                  <span>
                    {lastMeta.modelName} · {(lastMeta.durationMs / 1000).toFixed(1)}s · Seed{' '}
                    <code>{lastMeta.seed}</code>
                  </span>
                  <button
                    type="button"
                    className="city-chip-btn"
                    onClick={() => onChangeParams({ seedInput: String(lastMeta.seed) })}
                  >
                    <Lock size={11} /> {t.lockSeed}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
