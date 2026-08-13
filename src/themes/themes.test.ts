import { describe, expect, it } from 'vitest';
import { getTheme, THEMES } from '.';

describe('theme registry', () => {
  it('ships a broad set of social sharing themes', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);
  });

  it('includes the three reference-inspired themes', () => {
    expect(getTheme('redblue-editorial').shortName).toBe('红蓝编辑部');
    expect(getTheme('maker-scrapbook').shortName).toBe('创作手帐');
    expect(getTheme('build-note').shortName).toBe('构建笔记');
  });

  it('keeps every theme renderable by preview and export', () => {
    for (const theme of THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.shortName).toBeTruthy();
      expect(theme.preview).toBeTruthy();
      expect(theme.background).toBeTruthy();
      expect(theme.cardBorder).toBeTruthy();
      expect(theme.cardShadow).toBeTruthy();
      expect(theme.titleFont).toBeTruthy();
      expect(theme.bodyFont).toBeTruthy();
      expect(theme.bubbleUserBg).toBeTruthy();
      expect(theme.bubbleAssistantBg).toBeTruthy();
    }
  });

  it('falls back to the default aurora theme', () => {
    expect(getTheme('does-not-exist').id).toBe('aurora');
  });
});
