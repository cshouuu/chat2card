/** 卡片主题定义 */
export interface CardTheme {
  id: string;
  name: string;
  desc: string;
  isDark: boolean;
  /** 卡片背景,支持 CSS 渐变 */
  background: string;
  textPrimary: string;
  textSecondary: string;
  bubbleUserBg: string;
  bubbleUserText: string;
  bubbleAssistantBg: string;
  bubbleAssistantText: string;
  codeBg: string;
  codeText: string;
  accent: string;
  headerTitle: string;
  footerText: string;
  link: string;
}

export const THEMES: CardTheme[] = [
  {
    id: 'aurora',
    name: '极光 Aurora',
    desc: '深色渐变 + 霓虹点缀,AI 感拉满',
    isDark: true,
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%)',
    textPrimary: '#f3f4f6',
    textSecondary: '#a5b4fc',
    bubbleUserBg: '#6366f1',
    bubbleUserText: '#ffffff',
    bubbleAssistantBg: 'rgba(255,255,255,0.10)',
    bubbleAssistantText: '#e9e9f3',
    codeBg: 'rgba(0,0,0,0.35)',
    codeText: '#c4b5fd',
    accent: '#a78bfa',
    headerTitle: '#f3f4f6',
    footerText: '#8b93c9',
    link: '#a5b4fc',
  },
  {
    id: 'midnight',
    name: '午夜 Midnight',
    desc: '纯粹深色,极客最爱',
    isDark: true,
    background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    bubbleUserBg: '#3b82f6',
    bubbleUserText: '#ffffff',
    bubbleAssistantBg: 'rgba(148,163,184,0.15)',
    bubbleAssistantText: '#e2e8f0',
    codeBg: 'rgba(2,6,23,0.7)',
    codeText: '#7dd3fc',
    accent: '#38bdf8',
    headerTitle: '#e2e8f0',
    footerText: '#64748b',
    link: '#7dd3fc',
  },
  {
    id: 'terminal',
    name: '终端 Terminal',
    desc: '黑底绿字,复古黑客风',
    isDark: true,
    background: 'linear-gradient(180deg, #0c0c0c 0%, #111a11 100%)',
    textPrimary: '#d1fae5',
    textSecondary: '#6ee7b7',
    bubbleUserBg: '#065f46',
    bubbleUserText: '#ecfdf5',
    bubbleAssistantBg: 'rgba(16,185,129,0.08)',
    bubbleAssistantText: '#d1fae5',
    codeBg: '#050805',
    codeText: '#34d399',
    accent: '#10b981',
    headerTitle: '#6ee7b7',
    footerText: '#4ade80',
    link: '#34d399',
  },
  {
    id: 'paper',
    name: '纸张 Paper',
    desc: '米白纸张,舒适阅读',
    isDark: false,
    background: 'linear-gradient(160deg, #fafaf9 0%, #f5f5f4 100%)',
    textPrimary: '#292524',
    textSecondary: '#78716c',
    bubbleUserBg: '#292524',
    bubbleUserText: '#fafaf9',
    bubbleAssistantBg: '#ffffff',
    bubbleAssistantText: '#292524',
    codeBg: '#f0f0ee',
    codeText: '#a16207',
    accent: '#d97706',
    headerTitle: '#292524',
    footerText: '#a8a29e',
    link: '#d97706',
  },
  {
    id: 'ocean',
    name: '海洋 Ocean',
    desc: '清爽蓝白,微信分享首选',
    isDark: false,
    background: 'linear-gradient(160deg, #eff6ff 0%, #e0f2fe 100%)',
    textPrimary: '#1e3a5f',
    textSecondary: '#5b7a9d',
    bubbleUserBg: '#0ea5e9',
    bubbleUserText: '#ffffff',
    bubbleAssistantBg: '#ffffff',
    bubbleAssistantText: '#1e3a5f',
    codeBg: '#e0f2fe',
    codeText: '#0369a1',
    accent: '#0284c7',
    headerTitle: '#1e3a5f',
    footerText: '#7ba3c7',
    link: '#0284c7',
  },
  {
    id: 'sunset',
    name: '日落 Sunset',
    desc: '暖橙渐变,适合生活向内容',
    isDark: false,
    background: 'linear-gradient(150deg, #fff7ed 0%, #ffedd5 55%, #fef3c7 100%)',
    textPrimary: '#431407',
    textSecondary: '#9a5b3f',
    bubbleUserBg: '#f97316',
    bubbleUserText: '#ffffff',
    bubbleAssistantBg: '#ffffff',
    bubbleAssistantText: '#431407',
    codeBg: '#ffedd5',
    codeText: '#c2410c',
    accent: '#ea580c',
    headerTitle: '#431407',
    footerText: '#c49a7a',
    link: '#ea580c',
  },
];

export function getTheme(id: string): CardTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
