/** 卡片主题定义：不再只是换色，而是描述一套完整视觉语言。 */
export type ThemeCategory = 'premium' | 'fun' | 'tech' | 'calm';
export type ThemeMotif = 'glass' | 'editorial' | 'paper' | 'terminal' | 'sticker' | 'zen' | 'minimal' | 'space' | 'forest' | 'candy' | 'grid';

export interface CardTheme {
  id: string;
  name: string;
  shortName: string;
  desc: string;
  category: ThemeCategory;
  motif: ThemeMotif;
  isDark: boolean;
  /** 主题选择器的小预览背景 */
  preview: string;
  /** 卡片背景，支持 CSS 渐变 */
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  bubbleUserBg: string;
  bubbleUserText: string;
  bubbleUserBorder: string;
  bubbleAssistantBg: string;
  bubbleAssistantText: string;
  bubbleAssistantBorder: string;
  bubbleShadow: string;
  codeBg: string;
  codeText: string;
  accent: string;
  accentSoft: string;
  headerTitle: string;
  footerText: string;
  link: string;
  cardBorder: string;
  cardShadow: string;
  cardRadius: number;
  titleFont: string;
  bodyFont: string;
  titleWeight: number;
  headerAlign: 'left' | 'center';
}

const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
const serif = "'Songti SC', 'STSong', 'Noto Serif CJK SC', Georgia, serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

export const THEMES: CardTheme[] = [
  {
    id: 'aurora',
    name: '极光玻璃 Aurora Glass',
    shortName: '极光玻璃',
    desc: '深空极光、玻璃拟态和柔和霓虹边缘，最适合 AI / 产品 / 技术内容。',
    category: 'premium',
    motif: 'glass',
    isDark: true,
    preview: 'radial-gradient(circle at 78% 20%, #22d3ee 0, transparent 28%), radial-gradient(circle at 18% 82%, #a855f7 0, transparent 35%), #07111f',
    background: 'radial-gradient(circle at 85% 10%, rgba(34,211,238,.30), transparent 30%), radial-gradient(circle at 5% 82%, rgba(168,85,247,.34), transparent 34%), linear-gradient(145deg,#07111f 0%,#10142b 52%,#190f32 100%)',
    surface: 'linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.055))',
    textPrimary: '#f7f8ff', textSecondary: '#aab5d6',
    bubbleUserBg: 'linear-gradient(135deg, rgba(139,92,246,.36), rgba(109,40,217,.22))', bubbleUserText: '#ffffff', bubbleUserBorder: 'rgba(196,181,253,.38)',
    bubbleAssistantBg: 'linear-gradient(135deg, rgba(8,47,73,.72), rgba(15,23,42,.66))', bubbleAssistantText: '#eefbff', bubbleAssistantBorder: 'rgba(103,232,249,.28)',
    bubbleShadow: '0 16px 36px rgba(0,0,0,.18)',
    codeBg: 'rgba(2,6,23,.7)', codeText: '#c4b5fd', accent: '#a78bfa', accentSoft: 'rgba(167,139,250,.18)', headerTitle: '#ffffff', footerText: '#8e9bbd', link: '#67e8f9',
    cardBorder: 'rgba(167,139,250,.46)', cardShadow: '0 34px 90px rgba(0,0,0,.5), 0 0 80px rgba(124,58,237,.12)', cardRadius: 34,
    titleFont: sans, bodyFont: sans, titleWeight: 800, headerAlign: 'left',
  },
  {
    id: 'editorial',
    name: '象牙金刊 Editorial Ivory',
    shortName: '象牙金刊',
    desc: '杂志编辑感、象牙白与克制金色，适合观点、品牌与深度内容。',
    category: 'premium', motif: 'editorial', isDark: false,
    preview: 'linear-gradient(135deg,#fffdf7 0%,#f5ead4 65%,#c79a4b 100%)',
    background: 'linear-gradient(145deg,#fffdf8 0%,#f8f2e8 100%)', surface: 'rgba(255,255,255,.68)',
    textPrimary: '#1f1c18', textSecondary: '#7d7061',
    bubbleUserBg: 'rgba(255,255,255,.74)', bubbleUserText: '#28221b', bubbleUserBorder: 'rgba(177,132,66,.26)',
    bubbleAssistantBg: 'rgba(255,253,247,.92)', bubbleAssistantText: '#28221b', bubbleAssistantBorder: 'rgba(154,113,52,.42)', bubbleShadow: '0 14px 30px rgba(94,67,31,.08)',
    codeBg: '#f2eadf', codeText: '#855f24', accent: '#b7863d', accentSoft: 'rgba(183,134,61,.12)', headerTitle: '#17130f', footerText: '#9b8d7d', link: '#9a6f2b',
    cardBorder: 'rgba(183,134,61,.26)', cardShadow: '0 28px 70px rgba(76,55,29,.16)', cardRadius: 28,
    titleFont: serif, bodyFont: sans, titleWeight: 700, headerAlign: 'left',
  },
  {
    id: 'sunset',
    name: '日落纸感 Sunset Paper', shortName: '日落纸感',
    desc: '温暖日落、纸张肌理和邮戳感，适合小红书、朋友圈与生活化内容。',
    category: 'fun', motif: 'paper', isDark: false,
    preview: 'linear-gradient(145deg,#fff1dc 0%,#ffb58f 58%,#f86f52 100%)',
    background: 'linear-gradient(150deg,#fff8ec 0%,#ffe6cf 58%,#ffd9c0 100%)', surface: 'rgba(255,250,242,.72)',
    textPrimary: '#4a2618', textSecondary: '#9b6854',
    bubbleUserBg: 'rgba(255,215,190,.78)', bubbleUserText: '#4a2618', bubbleUserBorder: 'rgba(238,111,73,.26)',
    bubbleAssistantBg: 'rgba(255,252,245,.88)', bubbleAssistantText: '#4a2618', bubbleAssistantBorder: 'rgba(175,115,82,.2)', bubbleShadow: '0 12px 24px rgba(133,77,44,.1)',
    codeBg: '#ffe4cf', codeText: '#b64c31', accent: '#ef704c', accentSoft: 'rgba(239,112,76,.14)', headerTitle: '#3c1f14', footerText: '#b08069', link: '#d85c3d',
    cardBorder: 'rgba(214,112,74,.25)', cardShadow: '0 26px 64px rgba(135,73,45,.2)', cardRadius: 30,
    titleFont: sans, bodyFont: sans, titleWeight: 850, headerAlign: 'left',
  },
  {
    id: 'terminal',
    name: '霓虹终端 Neo Terminal', shortName: '霓虹终端',
    desc: '克制的黑绿终端与青色辅助光，专为开发者和技术内容设计。',
    category: 'tech', motif: 'terminal', isDark: true,
    preview: 'linear-gradient(135deg,#04120d 0%,#05271c 58%,#06b6d4 150%)',
    background: 'linear-gradient(160deg,#020807 0%,#04140f 58%,#071216 100%)', surface: 'rgba(3,23,18,.78)',
    textPrimary: '#e8fff6', textSecondary: '#79a997',
    bubbleUserBg: 'rgba(15,118,78,.22)', bubbleUserText: '#eafff5', bubbleUserBorder: 'rgba(74,222,128,.52)',
    bubbleAssistantBg: 'rgba(8,47,73,.32)', bubbleAssistantText: '#e7fbff', bubbleAssistantBorder: 'rgba(34,211,238,.54)', bubbleShadow: '0 0 28px rgba(34,211,238,.06)',
    codeBg: '#010504', codeText: '#4ade80', accent: '#4ade80', accentSoft: 'rgba(74,222,128,.12)', headerTitle: '#f2fff8', footerText: '#63aa8d', link: '#22d3ee',
    cardBorder: 'rgba(74,222,128,.46)', cardShadow: '0 30px 78px rgba(0,0,0,.6),0 0 70px rgba(34,211,238,.08)', cardRadius: 24,
    titleFont: sans, bodyFont: mono, titleWeight: 850, headerAlign: 'left',
  },
  {
    id: 'sticker',
    name: '趣味贴纸 Sticker Pop', shortName: '趣味贴纸',
    desc: '紫粉蓝绿贴纸与手帐拼贴，适合年轻、轻松、娱乐和社媒内容。',
    category: 'fun', motif: 'sticker', isDark: false,
    preview: 'linear-gradient(135deg,#8b5cf6 0%,#f472b6 38%,#facc15 68%,#60a5fa 100%)',
    background: 'linear-gradient(145deg,#fffdf6 0%,#fff8fd 100%)', surface: 'rgba(255,255,255,.78)',
    textPrimary: '#16163a', textSecondary: '#716f98',
    bubbleUserBg: 'linear-gradient(135deg,#f2e8ff,#fce7f3)', bubbleUserText: '#20204f', bubbleUserBorder: 'rgba(139,92,246,.2)',
    bubbleAssistantBg: 'linear-gradient(135deg,#f0fce3,#fffad9)', bubbleAssistantText: '#263113', bubbleAssistantBorder: 'rgba(132,204,22,.2)', bubbleShadow: '0 12px 0 rgba(99,102,241,.055),0 18px 34px rgba(79,70,229,.08)',
    codeBg: '#f3f0ff', codeText: '#6d28d9', accent: '#8b5cf6', accentSoft: 'rgba(139,92,246,.12)', headerTitle: '#17173d', footerText: '#8581a7', link: '#7c3aed',
    cardBorder: 'rgba(139,92,246,.2)', cardShadow: '0 30px 72px rgba(82,71,160,.17)', cardRadius: 34,
    titleFont: sans, bodyFont: sans, titleWeight: 900, headerAlign: 'left',
  },
  {
    id: 'zen',
    name: '禅意艺廊 Zen Gallery', shortName: '禅意艺廊',
    desc: '石、墨、砂与大量留白，适合哲思、读书摘录和长期主义内容。',
    category: 'premium', motif: 'zen', isDark: false,
    preview: 'linear-gradient(135deg,#ebe6dc 0%,#c5b9a6 70%,#34312d 100%)',
    background: 'linear-gradient(145deg,#eeeae2 0%,#ddd7cb 100%)', surface: 'rgba(250,248,243,.64)',
    textPrimary: '#2f2d29', textSecondary: '#777168',
    bubbleUserBg: 'rgba(250,248,243,.72)', bubbleUserText: '#312e29', bubbleUserBorder: 'rgba(135,113,83,.18)',
    bubbleAssistantBg: 'rgba(235,231,223,.78)', bubbleAssistantText: '#312e29', bubbleAssistantBorder: 'rgba(78,75,69,.16)', bubbleShadow: '0 14px 28px rgba(53,48,40,.08)',
    codeBg: '#ded9d0', codeText: '#6e5639', accent: '#9b7a51', accentSoft: 'rgba(155,122,81,.12)', headerTitle: '#292724', footerText: '#827b70', link: '#755d3d',
    cardBorder: 'rgba(132,106,70,.34)', cardShadow: '0 30px 72px rgba(45,41,35,.18)', cardRadius: 18,
    titleFont: serif, bodyFont: serif, titleWeight: 650, headerAlign: 'center',
  },
  {
    id: 'space',
    name: '深空黑 Deep Space', shortName: '深空黑',
    desc: '几乎纯黑的高对比主题，克制、现代，适合硬核观点和产品发布。',
    category: 'premium', motif: 'space', isDark: true,
    preview: 'radial-gradient(circle at 70% 20%,#334155 0,transparent 30%),#020617',
    background: 'radial-gradient(circle at 80% 15%,rgba(51,65,85,.45),transparent 30%),linear-gradient(150deg,#020617,#090d17)', surface: 'rgba(15,23,42,.72)',
    textPrimary: '#f8fafc', textSecondary: '#94a3b8',
    bubbleUserBg: 'rgba(51,65,85,.68)', bubbleUserText: '#f8fafc', bubbleUserBorder: 'rgba(148,163,184,.18)',
    bubbleAssistantBg: 'rgba(15,23,42,.82)', bubbleAssistantText: '#e2e8f0', bubbleAssistantBorder: 'rgba(148,163,184,.16)', bubbleShadow: '0 14px 30px rgba(0,0,0,.22)',
    codeBg: '#020617', codeText: '#93c5fd', accent: '#f8fafc', accentSoft: 'rgba(248,250,252,.09)', headerTitle: '#ffffff', footerText: '#64748b', link: '#93c5fd',
    cardBorder: 'rgba(148,163,184,.14)', cardShadow: '0 34px 90px rgba(0,0,0,.58)', cardRadius: 28,
    titleFont: sans, bodyFont: sans, titleWeight: 850, headerAlign: 'left',
  },
  {
    id: 'mist',
    name: '雾凇蓝 Mist Blue', shortName: '雾凇蓝',
    desc: '低饱和雾蓝和轻玻璃质感，适合知识、职场和通用分享。',
    category: 'calm', motif: 'minimal', isDark: false,
    preview: 'linear-gradient(135deg,#eef6ff,#b9d5ee)',
    background: 'linear-gradient(150deg,#f5faff 0%,#e6f1f8 100%)', surface: 'rgba(255,255,255,.7)',
    textPrimary: '#17324a', textSecondary: '#698398',
    bubbleUserBg: 'rgba(207,229,245,.82)', bubbleUserText: '#17324a', bubbleUserBorder: 'rgba(66,126,166,.16)',
    bubbleAssistantBg: 'rgba(255,255,255,.82)', bubbleAssistantText: '#17324a', bubbleAssistantBorder: 'rgba(73,115,143,.15)', bubbleShadow: '0 12px 28px rgba(45,88,118,.08)',
    codeBg: '#e6f1f8', codeText: '#255f83', accent: '#4f8db5', accentSoft: 'rgba(79,141,181,.12)', headerTitle: '#142b3e', footerText: '#7f98aa', link: '#2f759d',
    cardBorder: 'rgba(67,108,136,.16)', cardShadow: '0 28px 68px rgba(49,90,115,.14)', cardRadius: 30,
    titleFont: sans, bodyFont: sans, titleWeight: 800, headerAlign: 'left',
  },
  {
    id: 'forest',
    name: '森野刊 Forest Editorial', shortName: '森野刊',
    desc: '植物绿、乳白与杂志排版，适合自然、生活方式与可持续话题。',
    category: 'calm', motif: 'forest', isDark: false,
    preview: 'linear-gradient(135deg,#f4f4e7,#9bb58d 62%,#425d48)',
    background: 'linear-gradient(145deg,#f7f6ea 0%,#edf1e3 100%)', surface: 'rgba(255,255,248,.68)',
    textPrimary: '#253428', textSecondary: '#6b7c6a',
    bubbleUserBg: 'rgba(210,225,196,.68)', bubbleUserText: '#243526', bubbleUserBorder: 'rgba(70,104,71,.18)',
    bubbleAssistantBg: 'rgba(255,255,250,.82)', bubbleAssistantText: '#243526', bubbleAssistantBorder: 'rgba(79,99,69,.14)', bubbleShadow: '0 14px 30px rgba(62,86,57,.08)',
    codeBg: '#e8eddf', codeText: '#426146', accent: '#597d5d', accentSoft: 'rgba(89,125,93,.11)', headerTitle: '#203124', footerText: '#81907f', link: '#426d48',
    cardBorder: 'rgba(72,99,70,.19)', cardShadow: '0 28px 68px rgba(62,82,57,.14)', cardRadius: 28,
    titleFont: serif, bodyFont: sans, titleWeight: 700, headerAlign: 'left',
  },
  {
    id: 'candy',
    name: '糖果气泡 Candy Bubble', shortName: '糖果气泡',
    desc: '柔和糖果渐变和圆润卡片，轻松但不幼稚，适合日常社交内容。',
    category: 'fun', motif: 'candy', isDark: false,
    preview: 'linear-gradient(135deg,#fbcfe8,#ddd6fe 45%,#bae6fd 100%)',
    background: 'linear-gradient(145deg,#fff7fb 0%,#f8f5ff 48%,#f2fbff 100%)', surface: 'rgba(255,255,255,.72)',
    textPrimary: '#34304a', textSecondary: '#817b9c',
    bubbleUserBg: 'linear-gradient(135deg,#fce7f3,#ede9fe)', bubbleUserText: '#3b3154', bubbleUserBorder: 'rgba(219,39,119,.1)',
    bubbleAssistantBg: 'linear-gradient(135deg,#eff6ff,#ecfeff)', bubbleAssistantText: '#273a50', bubbleAssistantBorder: 'rgba(14,165,233,.1)', bubbleShadow: '0 16px 32px rgba(124,58,237,.07)',
    codeBg: '#f3efff', codeText: '#7c3aed', accent: '#ec4899', accentSoft: 'rgba(236,72,153,.11)', headerTitle: '#302945', footerText: '#928ba9', link: '#8b5cf6',
    cardBorder: 'rgba(139,92,246,.13)', cardShadow: '0 30px 72px rgba(112,93,157,.13)', cardRadius: 38,
    titleFont: sans, bodyFont: sans, titleWeight: 850, headerAlign: 'left',
  },
  {
    id: 'paper',
    name: '极简纸张 Paper Minimal', shortName: '极简纸张',
    desc: '干净纸张、黑色正文和单一强调色，最通用、最耐看。',
    category: 'calm', motif: 'minimal', isDark: false,
    preview: 'linear-gradient(135deg,#f8f7f2,#e7e5df)',
    background: 'linear-gradient(150deg,#fbfaf7 0%,#f2f0ea 100%)', surface: 'rgba(255,255,255,.72)',
    textPrimary: '#262522', textSecondary: '#7a7871',
    bubbleUserBg: '#262522', bubbleUserText: '#ffffff', bubbleUserBorder: '#262522',
    bubbleAssistantBg: 'rgba(255,255,255,.82)', bubbleAssistantText: '#262522', bubbleAssistantBorder: 'rgba(38,37,34,.1)', bubbleShadow: '0 10px 22px rgba(0,0,0,.055)',
    codeBg: '#eceae4', codeText: '#7c5c25', accent: '#b7853e', accentSoft: 'rgba(183,133,62,.11)', headerTitle: '#171715', footerText: '#959188', link: '#9a6a27',
    cardBorder: 'rgba(38,37,34,.09)', cardShadow: '0 28px 65px rgba(41,37,31,.12)', cardRadius: 26,
    titleFont: sans, bodyFont: sans, titleWeight: 800, headerAlign: 'left',
  },
  {
    id: 'blueprint',
    name: '蓝图网格 Blueprint Grid', shortName: '蓝图网格',
    desc: '结构化蓝图、细网格与工程标记，适合架构、代码、流程与教程。',
    category: 'tech', motif: 'grid', isDark: true,
    preview: 'linear-gradient(135deg,#082f49,#0c4a6e 68%,#38bdf8)',
    background: 'linear-gradient(145deg,#08283b 0%,#0b3a55 100%)', surface: 'rgba(7,40,61,.72)',
    textPrimary: '#ecfeff', textSecondary: '#9dcfe1',
    bubbleUserBg: 'rgba(14,116,144,.26)', bubbleUserText: '#ecfeff', bubbleUserBorder: 'rgba(103,232,249,.38)',
    bubbleAssistantBg: 'rgba(3,105,161,.18)', bubbleAssistantText: '#e7faff', bubbleAssistantBorder: 'rgba(125,211,252,.28)', bubbleShadow: '0 14px 30px rgba(0,0,0,.15)',
    codeBg: 'rgba(2,25,39,.78)', codeText: '#7dd3fc', accent: '#67e8f9', accentSoft: 'rgba(103,232,249,.1)', headerTitle: '#ffffff', footerText: '#86b6c9', link: '#a5f3fc',
    cardBorder: 'rgba(125,211,252,.34)', cardShadow: '0 30px 78px rgba(0,20,35,.42)', cardRadius: 22,
    titleFont: mono, bodyFont: sans, titleWeight: 800, headerAlign: 'left',
  },
];

export function getTheme(id: string): CardTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
