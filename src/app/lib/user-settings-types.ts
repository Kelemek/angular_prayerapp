export type ThemeOption = 'light' | 'dark' | 'system';
export type PrintRange = 'week' | 'twoweeks' | 'month' | 'year' | 'all';

export const USER_SETTINGS_THEME_OPTIONS: Array<{
  value: ThemeOption;
  label: string;
  icon: string;
}> = [
  {
    value: 'light',
    label: 'Light',
    icon:
      '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
  },
  {
    value: 'system',
    label: 'System',
    icon:
      '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
  },
];

export const USER_SETTINGS_PRINT_RANGE_OPTIONS: Array<{
  value: PrintRange;
  label: string;
}> = [
  { value: 'week', label: 'Last Week' },
  { value: 'twoweeks', label: 'Last 2 Weeks' },
  { value: 'month', label: 'Last Month' },
  { value: 'year', label: 'Last Year' },
  { value: 'all', label: 'All Prayers' },
];
