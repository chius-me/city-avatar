import React, { useEffect } from 'react';
import { Download, RotateCcw, Trash2, X } from 'lucide-react';
import { BACKDROP_PRESETS, type Locale } from '../data/presets';
import { UI_TEXT, pickText } from '../data/i18n';
import type { SavedAvatarItem } from '../utils/galleryDb';

interface HistoryDrawerProps {
  open: boolean;
  locale: Locale;
  items: SavedAvatarItem[];
  onClose: () => void;
  onLoadItem: (item: SavedAvatarItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  open,
  locale,
  items,
  onClose,
  onLoadItem,
  onDeleteItem,
  onClearAll,
}) => {
  const t = UI_TEXT[locale];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`city-drawer-backdrop ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="city-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.galleryTitle}
      >
        <div className="city-drawer-head">
          <div className="city-drawer-title-row">
            <h2>{t.galleryTitle}</h2>
            <span className="city-dots" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          </div>

          <div className="city-drawer-head-actions">
            {items.length > 0 && (
              <button
                type="button"
                className="city-chip-btn"
                onClick={onClearAll}
              >
                <Trash2 size={13} /> {t.clearAll}
              </button>
            )}
            <button
              type="button"
              className="city-close-circle"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} strokeWidth={2.8} />
            </button>
          </div>
        </div>

        <div className="city-drawer-body">
          {items.length === 0 ? (
            <div className="city-drawer-empty">{t.galleryEmpty}</div>
          ) : (
            <div className="city-history-list">
              {items.map((item) => {
                const bg = BACKDROP_PRESETS.find((b) => b.id === item.bgId);
                const dateText = new Date(item.createdAt).toLocaleString(
                  locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'zh-CN',
                  {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );
                return (
                  <article key={item.id} className="city-history-card">
                    <div className="city-history-thumbs">
                      <img
                        src={item.imageDataUrl}
                        alt="CITY stylized avatar"
                        className="city-history-output"
                        loading="lazy"
                      />
                      {item.sourceThumbUrl && (
                        <img
                          src={item.sourceThumbUrl}
                          alt="Original photo"
                          className="city-history-orig"
                        />
                      )}
                    </div>
                    <div className="city-history-meta">
                      <div className="city-history-bg">
                        <span
                          className="city-history-dot"
                          style={{ backgroundColor: bg?.color ?? '#f7b647' }}
                        />
                        <span>{bg ? pickText(bg.label, locale) : item.bgId}</span>
                      </div>
                      <div className="city-history-time">{dateText}</div>
                      <div className="city-history-actions">
                        <button
                          type="button"
                          className="city-chip-btn is-primary"
                          onClick={() => {
                            onLoadItem(item);
                            onClose();
                          }}
                        >
                          <RotateCcw size={12} /> {t.loadCreation}
                        </button>
                        <a
                          href={item.imageDataUrl}
                          download={`city-avatar-${item.seed}.png`}
                          className="city-chip-btn"
                          title={t.exportPng}
                        >
                          <Download size={12} />
                        </a>
                        <button
                          type="button"
                          className="city-chip-btn"
                          onClick={() => onDeleteItem(item.id)}
                          aria-label="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
