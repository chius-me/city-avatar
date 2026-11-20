import React from 'react';
import { Images } from 'lucide-react';
import type { Locale } from '../data/presets';
import { UI_TEXT } from '../data/i18n';
import { CityLogo } from './CityLogo';

interface TopBarProps {
  locale: Locale;
  onChangeLocale: (next: Locale) => void;
  galleryCount: number;
  onOpenGallery: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onResetWorkspace: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  locale,
  onChangeLocale,
  galleryCount,
  onOpenGallery,
  menuOpen,
  onToggleMenu,
  onResetWorkspace,
}) => {
  const t = UI_TEXT[locale];

  return (
    <>
      {/* Top-Left Brand Ink-Card */}
      <header className="city-topbar-brand">
        <button
          type="button"
          className="city-brand-pill"
          onClick={onResetWorkspace}
          title="CITY AVATAR"
        >
          <CityLogo compact subtitle="AVATAR" />
        </button>
      </header>

      {/* Top-Right Official-Site-Inspired Curved Frosted Shelf */}
      <div className="city-top-shelf">
        <button
          type="button"
          className="city-gallery-trigger"
          onClick={onOpenGallery}
          aria-label={t.galleryBtn}
        >
          <Images size={15} strokeWidth={2.5} />
          <span>{t.galleryBtn}</span>
          {galleryCount > 0 && (
            <span className="city-gallery-badge">{galleryCount}</span>
          )}
        </button>

        <div className="city-locale-switch" role="group" aria-label="Language">
          {(
            [
              { code: 'zh', label: '中' },
              { code: 'en', label: 'EN' },
              { code: 'ja', label: '日' },
            ] as const
          ).map(({ code, label }) => (
            <button
              key={code}
              type="button"
              className={`city-locale-btn ${locale === code ? 'is-active' : ''}`}
              onClick={() => onChangeLocale(code)}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`city-menu-btn ${menuOpen ? 'is-open' : ''}`}
          onClick={onToggleMenu}
          aria-label={t.menuLabel}
          aria-expanded={menuOpen}
        >
          <div className="city-menu-btn-lines" aria-hidden="true">
            <span className="city-menu-btn-line" />
            <span className="city-menu-btn-line" />
            <span className="city-menu-btn-line" />
            <span className="city-menu-btn-line" />
          </div>
        </button>
      </div>
    </>
  );
};
