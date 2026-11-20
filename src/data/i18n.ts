import type { Locale, LocalizedText } from './presets';

export function pickText(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

export interface UiDictionary {
  tagline: string;
  galleryBtn: string;
  menuLabel: string;
  introTitle: string;
  introSub: string;
  stylePreviewHint: string;
  dropHeadline: string;
  dropHint: string;
  chooseFile: string;
  orTrySample: string;
  tabOutput: string;
  tabCompare: string;
  tabOriginal: string;
  replacePhoto: string;
  resetAll: string;
  generatingTitle: string;
  generatingSub: string;
  maskRounded: string;
  maskCircle: string;
  maskSquare: string;
  decorateToggle: string;
  frameLabel: string;
  zoomLabel: string;
  resetView: string;
  dotsToggle: string;
  sparklesToggle: string;
  captionPlaceholder: string;
  exportPng: string;
  exportWebp: string;
  copyBtn: string;
  copiedBtn: string;
  copyUnsupported: string;
  compareBefore: string;
  compareAfter: string;
  subjectLabel: string;
  subjectAuto: string;
  subjectPerson: string;
  subjectCreature: string;
  backdropLabel: string;
  styleLabel: string;
  expressionLabel: string;
  detailLabel: string;
  detailPlaceholder: string;
  advancedToggle: string;
  modelLabel: string;
  styleRefLabel: string;
  sizeLabel: string;
  seedLabel: string;
  seedPlaceholder: string;
  promptLabel: string;
  copyPrompt: string;
  generateCta: string;
  regenerateCta: string;
  needPhotoHint: string;
  lockSeed: string;
  galleryTitle: string;
  galleryEmpty: string;
  loadCreation: string;
  clearAll: string;
  menuStudio: string;
  menuStudioSub: string;
  menuGallery: string;
  menuSocialMap: string;
  menuSocialMapSub: string;
  menuOfficial: string;
  menuOfficialSub: string;
  footerDisclaimer: string;
  officialSite: string;
  awesomeRepo: string;
  socialMap: string;
  uploadError: string;
}

export const UI_TEXT: Record<Locale, UiDictionary> = {
  zh: {
    tagline: '把你的照片、宠物或任意小生物，变成『CITY THE ANIMATION』官网风角色头像。',
    galleryBtn: '作品集',
    menuLabel: '导航菜单',
    introTitle: 'CITY 风格头像生成',
    introSub: '上传人像、萌宠或生物照片，一键风格化为京阿尼《小城日常》角色星光头像',
    stylePreviewHint: '官方参照风格',
    dropHeadline: '拖入或点击上传照片',
    dropHint: '支持 JPG / PNG / WebP，也支持直接 Ctrl+V 粘贴剪贴板图片',
    chooseFile: '选择本地图片',
    orTrySample: '或先用示例试试',
    tabOutput: 'CITY 头像',
    tabCompare: '滑动对比',
    tabOriginal: '原图',
    replacePhoto: '换图',
    resetAll: '清空',
    generatingTitle: '正在重绘为 CITY 风格…',
    generatingSub: '由 Cloudflare Workers AI (FLUX.2) 实时生成',
    maskRounded: '圆角',
    maskCircle: '圆形',
    maskSquare: '方形',
    decorateToggle: '画框与装饰',
    frameLabel: 'CITY 画框',
    zoomLabel: '缩放',
    resetView: '重置位置',
    dotsToggle: '四色圆点',
    sparklesToggle: '绘本星光',
    captionPlaceholder: '底部署名 / 短句（可选）',
    exportPng: '下载 PNG',
    exportWebp: 'WebP',
    copyBtn: '复制',
    copiedBtn: '已复制',
    copyUnsupported: '无法复制',
    compareBefore: '原图',
    compareAfter: 'CITY',
    subjectLabel: '照片主体',
    subjectAuto: '自动识别',
    subjectPerson: '人物',
    subjectCreature: '宠物 / 生物',
    backdropLabel: '背景底色',
    styleLabel: '风格演绎',
    expressionLabel: '表情神态',
    detailLabel: '细节补充',
    detailPlaceholder: '可选：如戴红色贝雷帽、加草帽、蓝围巾…',
    advancedToggle: '模型与高级参数',
    modelLabel: 'AI 模型',
    styleRefLabel: '注入 CITY 官方风格参照',
    sizeLabel: '分辨率',
    seedLabel: 'Seed',
    seedPlaceholder: '随机',
    promptLabel: '生成提示词',
    copyPrompt: '复制 Prompt',
    generateCta: '风格化为 CITY 头像',
    regenerateCta: '重新生成',
    needPhotoHint: '请先上传照片，或点选示例图片',
    lockSeed: '锁定 Seed',
    galleryTitle: '我的 CITY 头像集',
    galleryEmpty: '还没有保存过头像。上传照片生成后，会自动收录在这里。',
    loadCreation: '载入编辑',
    clearAll: '清空',
    menuStudio: '头像工坊',
    menuStudioSub: '照片风格化',
    menuGallery: '我的作品集',
    menuSocialMap: 'CITY 人物关系图',
    menuSocialMapSub: '全城居民星图',
    menuOfficial: '动画官方网站',
    menuOfficialSub: '官方角色展示页',
    footerDisclaimer: '非官方同人工具 · 原作 © あらゐけいいち・講談社／CITY THE ANIMATION 製作委員会',
    officialSite: '动画官网',
    awesomeRepo: 'Awesome CITY',
    socialMap: '人物关系图',
    uploadError: '读取图片失败，请尝试 PNG / JPG / WebP 格式照片。',
  },
  en: {
    tagline: 'Turn any photo of yourself, a friend, or a pet into a CITY THE ANIMATION official-style avatar.',
    galleryBtn: 'Gallery',
    menuLabel: 'Menu',
    introTitle: 'CITY Avatar Stylizer',
    introSub: 'Upload a person, pet, or creature photo and stylize it into Kyoto Animation CITY artwork',
    stylePreviewHint: 'Target Official Look',
    dropHeadline: 'Drop or click to upload photo',
    dropHint: 'PNG, JPG, or WebP — or press Ctrl+V / Cmd+V to paste directly',
    chooseFile: 'Choose Image',
    orTrySample: 'Or try a sample',
    tabOutput: 'CITY Avatar',
    tabCompare: 'Compare',
    tabOriginal: 'Original',
    replacePhoto: 'Change',
    resetAll: 'Clear',
    generatingTitle: 'Stylizing into CITY art…',
    generatingSub: 'Powered by Cloudflare Workers AI (FLUX.2)',
    maskRounded: 'Rounded',
    maskCircle: 'Circle',
    maskSquare: 'Square',
    decorateToggle: 'Frame & Decor',
    frameLabel: 'CITY Frame',
    zoomLabel: 'Zoom',
    resetView: 'Reset',
    dotsToggle: '4 Dots',
    sparklesToggle: 'Sparkles',
    captionPlaceholder: 'Optional badge caption…',
    exportPng: 'Download PNG',
    exportWebp: 'WebP',
    copyBtn: 'Copy',
    copiedBtn: 'Copied',
    copyUnsupported: 'Failed',
    compareBefore: 'Before',
    compareAfter: 'CITY',
    subjectLabel: 'Subject Type',
    subjectAuto: 'Auto',
    subjectPerson: 'Person',
    subjectCreature: 'Pet / Creature',
    backdropLabel: 'Backdrop',
    styleLabel: 'Art Style',
    expressionLabel: 'Expression',
    detailLabel: 'Extra Detail',
    detailPlaceholder: 'Optional: red beret, straw hat, cute scarf…',
    advancedToggle: 'Model & Advanced',
    modelLabel: 'AI Model',
    styleRefLabel: 'Use official CITY style reference',
    sizeLabel: 'Size',
    seedLabel: 'Seed',
    seedPlaceholder: 'Random',
    promptLabel: 'Live Prompt',
    copyPrompt: 'Copy',
    generateCta: 'Stylize into CITY Avatar',
    regenerateCta: 'Regenerate',
    needPhotoHint: 'Upload a photo or pick a sample to begin',
    lockSeed: 'Lock Seed',
    galleryTitle: 'Saved Avatars',
    galleryEmpty: 'No saved avatars yet. Generated works appear here automatically.',
    loadCreation: 'Load',
    clearAll: 'Clear All',
    menuStudio: 'Avatar Studio',
    menuStudioSub: 'Photo Stylizer',
    menuGallery: 'Saved Gallery',
    menuSocialMap: 'CITY Social Map',
    menuSocialMapSub: 'Resident Network',
    menuOfficial: 'Official Site',
    menuOfficialSub: 'Character Gallery',
    footerDisclaimer: 'Unofficial fan tool · © Keiichi Arawi · Kodansha / CITY THE ANIMATION',
    officialSite: 'Official Site',
    awesomeRepo: 'Awesome CITY',
    socialMap: 'Social Map',
    uploadError: 'Could not read image. Please upload a valid PNG, JPG, or WebP file.',
  },
  ja: {
    tagline: '人物やペット・生き物の写真を『CITY THE ANIMATION』公式風アイコンに変換。',
    galleryBtn: '履歴',
    menuLabel: 'メニュー',
    introTitle: 'CITY 風アイコン変換スタジオ',
    introSub: 'お気に入りの写真から京アニ『CITY』公式キャラクター風のスターアイコンを生成',
    stylePreviewHint: '公式スタイル見本',
    dropHeadline: '写真をドロップまたは選択',
    dropHint: 'JPG / PNG / WebP 対応（Ctrl+V / Cmd+V で貼り付け可）',
    chooseFile: '画像を選ぶ',
    orTrySample: 'サンプルで試す',
    tabOutput: 'CITY 風',
    tabCompare: '比較',
    tabOriginal: '元画像',
    replacePhoto: '変更',
    resetAll: 'クリア',
    generatingTitle: 'CITY タッチで描画中…',
    generatingSub: 'Cloudflare Workers AI (FLUX.2) で変換中',
    maskRounded: '角丸',
    maskCircle: '丸形',
    maskSquare: '正方形',
    decorateToggle: 'フレーム装飾',
    frameLabel: 'フレーム',
    zoomLabel: '拡大率',
    resetView: 'リセット',
    dotsToggle: '4色ドット',
    sparklesToggle: 'キラキラ',
    captionPlaceholder: 'キャプション（任意）',
    exportPng: 'PNG 保存',
    exportWebp: 'WebP',
    copyBtn: 'コピー',
    copiedBtn: '完了',
    copyUnsupported: '不可',
    compareBefore: '元画像',
    compareAfter: 'CITY',
    subjectLabel: '被写体',
    subjectAuto: '自動判別',
    subjectPerson: '人物',
    subjectCreature: 'ペット・生物',
    backdropLabel: '背景カラー',
    styleLabel: 'テイスト',
    expressionLabel: '表情',
    detailLabel: '追加指示',
    detailPlaceholder: '任意：ベレー帽、麦わら帽子、マフラーなど…',
    advancedToggle: 'モデル・詳細設定',
    modelLabel: 'AI モデル',
    styleRefLabel: '公式スタイル参照を使用',
    sizeLabel: '解像度',
    seedLabel: 'Seed',
    seedPlaceholder: 'ランダム',
    promptLabel: 'プロンプト',
    copyPrompt: 'コピー',
    generateCta: 'CITY 風アイコンを生成',
    regenerateCta: '再生成',
    needPhotoHint: '左側から写真をアップロード、またはサンプルを選択してください',
    lockSeed: 'Seed 固定',
    galleryTitle: '生成履歴',
    galleryEmpty: 'まだ作品がありません。生成したアイコンは自動保存されます。',
    loadCreation: '読み込む',
    clearAll: '全削除',
    menuStudio: 'アイコン工房',
    menuStudioSub: '写真スタイル変換',
    menuGallery: '生成履歴',
    menuSocialMap: 'CITY 相関図',
    menuSocialMapSub: '住民ネットワーク',
    menuOfficial: 'アニメ公式サイト',
    menuOfficialSub: 'キャラクター一覧',
    footerDisclaimer: '非公式ファンツール · © あらゐけいいち・講談社／CITY THE ANIMATION 製作委員会',
    officialSite: '公式サイト',
    awesomeRepo: 'Awesome CITY',
    socialMap: '相関図',
    uploadError: '画像の読み込みに失敗しました。PNG / JPG / WebP をお試しください。',
  },
};
