import type { Theme } from '../services/theme.service';

export type ThemeSelectOption = {
  value: Theme;
  label: string;
  /** Optional element id for guided tours (Night / seasonal themes). */
  tourOptionId?: string;
};

/** Display order for settings and presentation theme dropdowns. */
export const THEME_SELECT_OPTIONS: readonly ThemeSelectOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  {
    value: 'black',
    label: 'Night',
    tourOptionId: 'tour-settings-theme-night',
  },
  { value: 'blossom', label: 'Blossom', tourOptionId: 'tour-settings-theme-blossom' },
  {
    value: 'christmas-light',
    label: 'Christmas Light',
    tourOptionId: 'tour-settings-theme-christmas-light',
  },
  {
    value: 'christmas-dark',
    label: 'Christmas Dark',
    tourOptionId: 'tour-settings-theme-christmas-dark',
  },
  { value: 'system', label: 'System' },
];

export const PRESENTATION_THEME_SELECT_OPTIONS: readonly ThemeSelectOption[] =
  THEME_SELECT_OPTIONS.map((option) => ({
    ...option,
    tourOptionId: option.tourOptionId
      ? option.tourOptionId.replace('tour-settings-', 'tour-presentation-setting-')
      : undefined,
  }));

export function themeSelectLabel(theme: Theme): string {
  const match = THEME_SELECT_OPTIONS.find((o) => o.value === theme);
  return match?.label ?? 'System';
}

export const THEME_SUCCESS_LABEL: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  black: 'Night',
  blossom: 'Blossom',
  'christmas-light': 'Christmas Light',
  'christmas-dark': 'Christmas Dark',
  system: 'System',
};