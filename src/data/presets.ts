export type Locale = 'zh' | 'en' | 'ja';

export interface LocalizedText {
  zh: string;
  en: string;
  ja: string;
}

export type SubjectType = 'auto' | 'person' | 'creature';

export type ModelId =
  | '@cf/black-forest-labs/flux-2-klein-4b'
  | '@cf/black-forest-labs/flux-2-klein-9b'
  | '@cf/black-forest-labs/flux-2-dev';

export interface AiModelOption {
  id: ModelId;
  name: string;
  badge: LocalizedText;
  defaultSteps?: number;
}

export const AI_MODELS: AiModelOption[] = [
  {
    id: '@cf/black-forest-labs/flux-2-klein-4b',
    name: 'FLUX.2 [klein] 4B',
    badge: { zh: '极速推荐', en: 'Fast', ja: '高速' },
  },
  {
    id: '@cf/black-forest-labs/flux-2-klein-9b',
    name: 'FLUX.2 [klein] 9B',
    badge: { zh: '高精编辑', en: 'HD Edit', ja: '高精度' },
  },
  {
    id: '@cf/black-forest-labs/flux-2-dev',
    name: 'FLUX.2 [dev]',
    badge: { zh: '旗舰 18 步', en: 'Flagship', ja: '高画質' },
    defaultSteps: 18,
  },
];

export interface BackdropPreset {
  id: string;
  slot: 'C' | 'I' | 'T' | 'Y' | 'SKY' | 'SUNSET';
  color: string;
  softColor: string;
  styleRefUrl: string;
  patternRefUrl: string;
  label: LocalizedText;
  promptBackdrop: string;
}

export const BACKDROP_PRESETS: BackdropPreset[] = [
  {
    id: 'c-marigold',
    slot: 'C',
    color: '#f7b647',
    softColor: '#fce09b',
    styleRefUrl: '/style-refs/c-marigold.png',
    patternRefUrl: '/style-refs/bg-c.png',
    label: { zh: '暖黄星光', en: 'Marigold', ja: '黄色スター' },
    promptBackdrop:
      'solid bright marigold yellow (#f7b647) backdrop tiled with soft butter-yellow (#fce09b) five-point stars matching the official CITY THE ANIMATION website character card',
  },
  {
    id: 'i-sakura',
    slot: 'I',
    color: '#f09cb4',
    softColor: '#f8cad7',
    styleRefUrl: '/style-refs/i-sakura.png',
    patternRefUrl: '/style-refs/bg-i.png',
    label: { zh: '樱粉星光', en: 'Sakura', ja: 'ピンクスター' },
    promptBackdrop:
      'solid soft sakura pink (#f09cb4) backdrop tiled with pale rose-pink (#f8cad7) five-point stars matching the official CITY THE ANIMATION website character card',
  },
  {
    id: 't-meadow',
    slot: 'T',
    color: '#99cb77',
    softColor: '#c8e5b2',
    styleRefUrl: '/style-refs/t-meadow.png',
    patternRefUrl: '/style-refs/bg-t.png',
    label: { zh: '嫩绿星光', en: 'Meadow', ja: '緑スター' },
    promptBackdrop:
      'solid fresh meadow green (#99cb77) backdrop tiled with soft pastel mint-green (#c8e5b2) five-point stars and four-point sparkles matching the official CITY THE ANIMATION website character card',
  },
  {
    id: 'y-coral',
    slot: 'Y',
    color: '#ee847d',
    softColor: '#f7bbb7',
    styleRefUrl: '/style-refs/y-coral.png',
    patternRefUrl: '/style-refs/bg-y.png',
    label: { zh: '珊瑚星光', en: 'Coral', ja: 'コーラル' },
    promptBackdrop:
      'solid warm coral salmon (#ee847d) backdrop tiled with soft peach-coral (#f7bbb7) five-point stars matching the official CITY THE ANIMATION website character card',
  },
  {
    id: 'sky-clouds',
    slot: 'SKY',
    color: '#1194eb',
    softColor: '#c4e4f5',
    styleRefUrl: '/style-refs/c-marigold.png',
    patternRefUrl: '/style-refs/bg-c.png',
    label: { zh: '夏日晴空', en: 'Summer Sky', ja: '夏の青空' },
    promptBackdrop:
      'bright cerulean summer sky (#1194eb) with hand-inked fluffy cream-white anime cumulonimbus clouds matching Keiichi Arawi picture-book skies',
  },
  {
    id: 'sunset-clouds',
    slot: 'SUNSET',
    color: '#f2764e',
    softColor: '#ffd199',
    styleRefUrl: '/style-refs/y-coral.png',
    patternRefUrl: '/style-refs/bg-y.png',
    label: { zh: '夕阳云海', en: 'Sunset Clouds', ja: '夕焼け雲' },
    promptBackdrop:
      'warm vermilion coral sunset sky (#f2764e) with golden hand-hatched ink clouds inspired by the CITY THE ANIMATION evening header illustration',
  },
];

export interface StylePreset {
  id: string;
  label: LocalizedText;
  promptFragment: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'official-icon',
    label: { zh: '官网角色风', en: 'Official Icon', ja: '公式アイコン' },
    promptFragment:
      'authentic Kyoto Animation 2025 CITY THE ANIMATION official character card art by Keiichi Arawi: crisp clean uniform charcoal-black ink outlines, flat matte 2D cel colors without 3D shading or glossy highlights, large rounded vertical-oval anime eyes with dark irises and crisp white dot catchlights, signature fine diagonal red-ink cheek hatch lines, clean simplified nose dot, charming expressive mouth',
  },
  {
    id: 'storybook-gouache',
    label: { zh: '绘本水彩', en: 'Storybook', ja: '絵本タッチ' },
    promptFragment:
      'Keiichi Arawi hand-drawn picture-book gouache and ink illustration style from CITY THE ANIMATION ending theme: organic charcoal brush ink outlines, flat warm pastel gouache fills, subtle tactile paper grain, charming storybook comedy warmth',
  },
  {
    id: 'manga-halftone',
    label: { zh: '漫画网点', en: 'Manga Pop', ja: '漫画ポップ' },
    promptFragment:
      'Keiichi Arawi Morning magazine manga pop-art anime portrait style: bold expressive clean black ink linework, crisp flat cel shading with subtle vintage halftone dot accents, cheerful nostalgic Japanese slice-of-life comedy aesthetic',
  },
];

export interface ExpressionPreset {
  id: string;
  label: LocalizedText;
  promptFragment: string;
}

export const EXPRESSION_PRESETS: ExpressionPreset[] = [
  {
    id: 'keep',
    label: { zh: '保持原样', en: 'Match Photo', ja: '元の表情' },
    promptFragment:
      'faithfully mirror the exact facial expression from image 0 (if the subject is smiling warmly with an open grin, draw a joyful open CITY anime smile; if calm or curious, match that exact mood)',
  },
  {
    id: 'joyful-laugh',
    label: { zh: '元气大笑', en: 'Big Laugh', ja: '元気な笑顔' },
    promptFragment:
      'give a wide open-mouth cheerful Kyoto Animation laugh, beaming sparkling eyes, and rosy cheek hatching lines',
  },
  {
    id: 'city-shock',
    label: { zh: '爆笑惊慌', en: 'Comedic Shock', ja: 'びっくり顔' },
    promptFragment:
      'give a classic Keiichi Arawi slapstick comedy wide-eyed surprised expression with expressive comic sweatdrop',
  },
  {
    id: 'gentle-smile',
    label: { zh: '温柔微笑', en: 'Warm Smile', ja: 'やさしい笑顔' },
    promptFragment:
      'give a relaxed gentle happy smile with friendly bright eyes and warm everyday slice-of-life charm',
  },
  {
    id: 'starry-eyes',
    label: { zh: '星星眼', en: 'Starry Eyes', ja: 'キラキラ目' },
    promptFragment:
      'give excited sparkling starry eyes with tiny hand-drawn four-point stars around the subject',
  },
];

export interface FramePreset {
  id: 'none' | 'city-conic' | 'storybook-ink' | 'star-ring' | 'dotted-pop' | 'resident-card';
  label: LocalizedText;
}

export const FRAME_PRESETS: FramePreset[] = [
  { id: 'none', label: { zh: '纯净无框', en: 'Clean', ja: 'フレームなし' } },
  { id: 'city-conic', label: { zh: 'C-I-T-Y 光环', en: 'C-I-T-Y Ring', ja: '4色リング' } },
  { id: 'storybook-ink', label: { zh: '绘本黑框', en: 'Ink Border', ja: '絵本枠' } },
  { id: 'star-ring', label: { zh: '星光徽章', en: 'Star Badge', ja: 'スター枠' } },
  { id: 'dotted-pop', label: { zh: '四色圆点', en: 'Color Dots', ja: 'ドット枠' } },
  { id: 'resident-card', label: { zh: '住民名牌', en: 'Resident Tag', ja: '住民タグ' } },
];

export interface SamplePhoto {
  id: string;
  url: string;
  label: LocalizedText;
  defaultSubject: SubjectType;
  defaultBg: string;
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: 'sample-cat',
    url: '/samples/sample-cat.jpg',
    label: { zh: '橘猫示例', en: 'Tabby Cat', ja: '茶トラ猫' },
    defaultSubject: 'creature',
    defaultBg: 'c-marigold',
  },
  {
    id: 'sample-portrait',
    url: '/samples/sample-portrait.jpg',
    label: { zh: '人像示例', en: 'Portrait', ja: '人物サンプル' },
    defaultSubject: 'person',
    defaultBg: 'i-sakura',
  },
];

export interface StylizePromptInput {
  bgId: string;
  styleId: string;
  expressionId: string;
  subjectType: SubjectType;
  customPrompt?: string;
  useStyleRef: boolean;
  refKind: 'character-icon' | 'star-pattern' | 'none';
}

export function buildStylizePrompt(input: StylizePromptInput): string {
  const bg = BACKDROP_PRESETS.find((b) => b.id === input.bgId) ?? BACKDROP_PRESETS[0];
  const style = STYLE_PRESETS.find((s) => s.id === input.styleId) ?? STYLE_PRESETS[0];
  const expr =
    EXPRESSION_PRESETS.find((e) => e.id === input.expressionId) ?? EXPRESSION_PRESETS[0];

  const subjectDirective =
    input.subjectType === 'creature'
      ? 'Keep the EXACT animal or creature species from image 0 as a cute flat 2D anime animal portrait with lively dark-ringed irises, clear dark pupils, white dot catchlights, and exact ear shape, fur/feather markings, and accessories preserved.'
      : input.subjectType === 'person'
        ? 'Faithfully preserve the EXACT person from image 0 — keeping their exact hairstyle, hair parting, hair color, face proportions, and exact outfit color/texture intact without adding unprompted accessories.'
        : 'Faithfully preserve the EXACT subject from image 0 (whether human, animal, or creature) with exact silhouette, hair or fur pattern, outfit or collar, and true facial likeness intact without adding unprompted items.';

  const styleRefClause =
    input.useStyleRef && input.refKind === 'character-icon'
      ? 'Match the clean 2D ink outline thickness and anime card vibe of image 1 while preserving 100% of the subject identity and outfit from image 0.'
      : input.useStyleRef && input.refKind === 'star-pattern'
        ? 'Use the flat pastel color palette and crisp five-point star pattern from image 1 ONLY as the clean flat background behind the subject from image 0.'
        : '';

  const customClean = (input.customPrompt ?? '').trim().slice(0, 240);

  const parts = [
    'Square 1:1 full-bleed flat 2D Japanese TV anime character icon portrait redrawing the exact subject from image 0 in',
    `${style.promptFragment}.`,
    subjectDirective,
    `Expression: ${expr.promptFragment}.`,
    styleRefClause,
    `Replace the background completely edge-to-edge with a clean ${bg.promptBackdrop}.`,
    customClean ? `Additional detail: ${customClean}.` : '',
    'Centered head-and-shoulders framing filling the square edge-to-edge, flat matte 2D Kyoto Animation cel art, uniform crisp ink contours, solid clean color blocks, clean frame.',
  ].filter(Boolean);

  return parts.join(' ');
}
