import { THEMES as BASE_THEMES } from './themes';
import type { CardTheme } from './themes';
import { REFERENCE_THEMES } from './referenceThemes';

export type { CardTheme, ThemeCategory, ThemeMotif } from './themes';

export const THEMES: CardTheme[] = [...BASE_THEMES, ...REFERENCE_THEMES];

export function getTheme(id: string): CardTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
