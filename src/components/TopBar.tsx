import React from 'react';
import { Images } from 'lucide-react';
import type { Locale } from '../data/presets';
import { UI_TEXT } from '../data/i18n';
import { CityTopShell } from './city-shell';

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
    <CityTopShell
      siteId="avatar"
      locale={locale}
      onChangeLocale={onChangeLocale}
      menuOpen={menuOpen}
      onToggleMenu={onToggleMenu}
      onBrandClick={onResetWorkspace}
      brandTitle="CITY AVATAR"
    >
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
    </CityTopShell>
  );
};
