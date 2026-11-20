import React, { useEffect } from 'react';
import { Compass, ExternalLink, Images, Sparkles } from 'lucide-react';
import type { Locale } from '../data/presets';
import { UI_TEXT } from '../data/i18n';
import { CityLogo, MiminekoMascot } from './CityLogo';

interface MenuOverlayProps {
  open: boolean;
  locale: Locale;
  galleryCount: number;
  onClose: () => void;
  onOpenGallery: () => void;
}

export const MenuOverlay: React.FC<MenuOverlayProps> = ({
  open,
  locale,
  galleryCount,
  onClose,
  onOpenGallery,
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
      className={`city-menu-overlay ${open ? 'is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t.menuLabel}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="city-menu-overlay-inner">
        <div className="city-menu-hero">
          <div className="city-menu-brand">
            <div className="city-menu-brand-row">
              <CityLogo subtitle="AVATAR" />
              <MiminekoMascot />
            </div>
            <p className="city-menu-tagline">{t.tagline}</p>
          </div>

          <div className="city-menu-tiles">
            <button
              type="button"
              className="city-menu-tile tile-c"
              onClick={onClose}
            >
              <Sparkles size={22} strokeWidth={2.5} />
              <div>
                <div className="tile-title">{t.menuStudio}</div>
                <div className="tile-sub">{t.menuStudioSub}</div>
              </div>
            </button>

            <button
              type="button"
              className="city-menu-tile tile-i"
              onClick={() => {
                onClose();
                onOpenGallery();
              }}
            >
              <Images size={22} strokeWidth={2.5} />
              <div>
                <div className="tile-title">{t.menuGallery}</div>
                <div className="tile-sub">{galleryCount} items</div>
              </div>
            </button>

            <a
              className="city-menu-tile tile-t"
              href="https://social.city.chius.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Compass size={22} strokeWidth={2.5} />
              <div>
                <div className="tile-title">{t.menuSocialMap}</div>
                <div className="tile-sub">{t.menuSocialMapSub} ↗</div>
              </div>
            </a>

            <a
              className="city-menu-tile tile-y"
              href="https://city-the-animation.com/character/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={22} strokeWidth={2.5} />
              <div>
                <div className="tile-title">{t.menuOfficial}</div>
                <div className="tile-sub">{t.menuOfficialSub} ↗</div>
              </div>
            </a>
          </div>
        </div>

        <div className="city-menu-links">
          <a
            href="https://github.com/chius-me/awesome-citytheanimation"
            target="_blank"
            rel="noopener noreferrer"
            className="city-link-pill"
          >
            {t.awesomeRepo} ↗
          </a>
          <a
            href="https://github.com/chius-me/city-avatar"
            target="_blank"
            rel="noopener noreferrer"
            className="city-link-pill"
          >
            GitHub ↗
          </a>
        </div>

        <footer className="city-menu-footer">{t.footerDisclaimer}</footer>
      </div>
    </div>
  );
};
