import React from 'react';
import { Compass, ExternalLink, Images, Sparkles } from 'lucide-react';
import type { Locale } from '../data/presets';
import { UI_TEXT } from '../data/i18n';
import {
  CITY_EXTERNAL_LINKS,
  CITY_SITES,
  CityMenuOverlay,
  type CityMenuTile,
} from './city-shell';

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
  const socialMapSite = CITY_SITES['social-map'];

  const tiles: CityMenuTile[] = [
    {
      id: 'studio',
      tone: 'c',
      icon: <Sparkles size={22} strokeWidth={2.5} />,
      title: t.menuStudio,
      subtitle: t.menuStudioSub,
    },
    {
      id: 'gallery',
      tone: 'i',
      icon: <Images size={22} strokeWidth={2.5} />,
      title: t.menuGallery,
      subtitle: `${galleryCount} items`,
      onClick: onOpenGallery,
    },
    {
      id: 'social-map',
      tone: 't',
      icon: <Compass size={22} strokeWidth={2.5} />,
      title: t.menuSocialMap,
      subtitle: `${t.menuSocialMapSub} ↗`,
      href: socialMapSite.url,
    },
    {
      id: 'official',
      tone: 'y',
      icon: <ExternalLink size={22} strokeWidth={2.5} />,
      title: t.menuOfficial,
      subtitle: `${t.menuOfficialSub} ↗`,
      href: CITY_EXTERNAL_LINKS.officialCharacters,
    },
  ];

  return (
    <CityMenuOverlay
      siteId="avatar"
      open={open}
      locale={locale}
      tagline={t.tagline}
      tiles={tiles}
      onClose={onClose}
    />
  );
};
