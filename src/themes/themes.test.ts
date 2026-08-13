import { describe, expect, it } from 'vitest';
import { getTheme, THEMES } from './themes';

describe('theme registry', () => {
  it('ships a broad set of social sharing themes', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);
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
