/** Settings Print tiles — bordered choice shells (pair with {@link settingsChoiceNgClass}). */
export const SETTINGS_CHOICE_SELECTED_CLASS =
  'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30';

export const SETTINGS_CHOICE_UNSELECTED_CLASS =
  'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20';

export const SETTINGS_CHOICE_DROPDOWN_SHELL_CLASS =
  'flex w-full min-w-0 rounded-lg border overflow-hidden transition-colors duration-150 ease-out';

export const SETTINGS_CHOICE_ACTION_ROW_CLASS =
  `w-full min-w-0 flex flex-row items-center justify-center gap-2 p-2 sm:p-3 rounded-lg border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SETTINGS_CHOICE_UNSELECTED_CLASS} transition-colors duration-150 ease-out active:scale-[0.96] active:disabled:scale-100`;

export const SETTINGS_CHOICE_SPLIT_TILE_BTN_CLASS =
  'flex-1 flex flex-col items-center justify-center gap-2 p-2 sm:p-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors transition-transform duration-150 ease-out active:scale-[0.96] active:disabled:scale-100';

export function settingsChoiceNgClass(selected: boolean): Record<string, boolean> {
  return {
    [SETTINGS_CHOICE_SELECTED_CLASS]: selected,
    [SETTINGS_CHOICE_UNSELECTED_CLASS]: !selected,
  };
}
