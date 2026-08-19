export function filterPersonalPrayerCategories(
  availableCategories: string[],
  searchTerm: string
): string[] {
  const normalized = searchTerm.toLowerCase().trim();
  if (normalized === '') {
    return [];
  }
  return availableCategories.filter((cat) =>
    cat.toLowerCase().includes(normalized)
  );
}

export type PrayerFormCategoryKeyAction =
  | { type: 'move-down' }
  | { type: 'move-up' }
  | { type: 'select'; category: string }
  | { type: 'close' }
  | { type: 'noop' };

export function prayerFormCategoryKeyAction(
  key: string,
  showCategoryDropdown: boolean,
  filteredCategories: string[],
  selectedCategoryIndex: number
): PrayerFormCategoryKeyAction {
  if (!showCategoryDropdown || filteredCategories.length === 0) {
    return { type: 'noop' };
  }

  switch (key) {
    case 'ArrowDown':
      return { type: 'move-down' };
    case 'ArrowUp':
      return { type: 'move-up' };
    case 'Enter':
      if (selectedCategoryIndex >= 0) {
        return {
          type: 'select',
          category: filteredCategories[selectedCategoryIndex],
        };
      }
      return { type: 'noop' };
    case 'Escape':
      return { type: 'close' };
    default:
      return { type: 'noop' };
  }
}

export function nextCategorySelectionIndex(
  action: PrayerFormCategoryKeyAction,
  currentIndex: number,
  listLength: number
): number {
  switch (action.type) {
    case 'move-down':
      return Math.min(currentIndex + 1, listLength - 1);
    case 'move-up':
      return Math.max(currentIndex - 1, -1);
    case 'select':
    case 'close':
      return -1;
    case 'noop':
      return currentIndex;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
