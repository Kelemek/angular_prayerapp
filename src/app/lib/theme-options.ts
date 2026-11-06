import {
  type ResolvedTheme,
  type ThemeFamily,
  type ThemeMode,
  type ThemeSelection,
  resolveThemeFromSelection,
} from '../services/theme.service';

export type ThemeFamilySelectOption = {
  value: ThemeFamily;
  label: string;
  /** Optional tour id for the row in open list. */
  tourOptionId?: string;
};

export type ThemeModeSelectOption = {
  value: ThemeMode;
  label: string;
  tourOptionId?: string;
};

/** Display order: Family (left dropdown). */
export const THEME_FAMILY_OPTIONS: readonly ThemeFamilySelectOption[] = [
  { value: 'default', label: 'Default' },
  {
    value: 'high-contrast',
    label: 'High Contrast',
    tourOptionId: 'tour-settings-theme-high-contrast',
  },
  { value: 'blossom', label: 'Blossom', tourOptionId: 'tour-settings-theme-blossom' },
  { value: 'christmas', label: 'Christmas', tourOptionId: 'tour-settings-theme-christmas' },
];

/** Display order: Mode (right dropdown). */
export const THEME_MODE_OPTIONS: readonly ThemeModeSelectOption[] = [
  { value: 'light', label: 'Light', tourOptionId: 'tour-settings-theme-mode-light' },
  { value: 'dark', label: 'Dark', tourOptionId: 'tour-settings-theme-mode-dark' },
  { value: 'system', label: 'System', tourOptionId: 'tour-settings-theme-mode-system' },
];

export const PRESENTATION_THEME_FAMILY_OPTIONS: readonly ThemeFamilySelectOption[] =
  THEME_FAMILY_OPTIONS.map((option) => ({
    ...option,
    tourOptionId: option.tourOptionId
      ? option.tourOptionId.replace('tour-settings-', 'tour-presentation-setting-')
      : undefined,
  }));

export const PRESENTATION_THEME_MODE_OPTIONS: readonly ThemeModeSelectOption[] =
  THEME_MODE_OPTIONS.map((option) => ({
    ...option,
    tourOptionId: option.tourOptionId
      ? option.tourOptionId.replace('tour-settings-', 'tour-presentation-setting-')
      : undefined,
  }));

const RESOLVED_SUCCESS_LABEL: Record<ResolvedTheme, string> = {
  light: 'Default Light',
  dark: 'Default Dark',
  day: 'Day',
  black: 'Night',
  blossom: 'Blossom Light',
  'blossom-dark': 'Blossom Dark',
  'christmas-light': 'Christmas Light',
  'christmas-dark': 'Christmas Dark',
};

export function resolvedThemeSuccessLabel(resolved: ResolvedTheme): string {
  return RESOLVED_SUCCESS_LABEL[resolved];
}

export function closedFamilyTriggerLabel(
  family: ThemeFamily,
  resolved: ResolvedTheme,
): string {
  if (family === 'high-contrast') {
    return resolved === 'day' ? 'Day' : 'Night';
  }
  const opt = THEME_FAMILY_OPTIONS.find((o) => o.value === family);
  return opt?.label ?? family;
}

export function themeSelectionTriggerSummary(selection: ThemeSelection, prefersDark: boolean): string {
  const resolved = resolveThemeFromSelection(selection.family, selection.mode, prefersDark);
  const family = closedFamilyTriggerLabel(selection.family, resolved);
  const mode =
    selection.mode === 'system'
      ? 'System'
      : selection.mode === 'light'
        ? 'Light'
        : 'Dark';
  return `${family} · ${mode}`;
}
