import type { ThemeSelection } from '../services/theme.service';

export type ThemeOption = ThemeSelection;

export {
  THEME_FAMILY_OPTIONS as USER_SETTINGS_THEME_FAMILY_OPTIONS,
  THEME_MODE_OPTIONS as USER_SETTINGS_THEME_MODE_OPTIONS,
  closedFamilyTriggerLabel,
  resolvedThemeSuccessLabel,
  themeSelectionTriggerSummary,
} from './theme-options';
