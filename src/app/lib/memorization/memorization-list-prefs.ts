export type MemorizeListView = 'cards' | 'table';

export type MemorizeTableSortBy = 'reference' | 'sessions' | 'mastery';

export type MemorizeTableSortDirection = 'asc' | 'desc';

export interface MemorizeTableSortPrefs {
  sortBy: MemorizeTableSortBy;
  sortDirection: MemorizeTableSortDirection;
}

export const MEMORIZE_LIST_VIEW_KEY = 'prayer_app_memorize_list_view';
export const MEMORIZE_TABLE_SORT_KEY = 'prayer_app_memorize_table_sort';

export const DEFAULT_MEMORIZE_LIST_VIEW: MemorizeListView = 'cards';

export const DEFAULT_MEMORIZE_TABLE_SORT: MemorizeTableSortPrefs = {
  sortBy: 'mastery',
  sortDirection: 'asc',
};

const SORT_BY_VALUES: readonly MemorizeTableSortBy[] = [
  'reference',
  'sessions',
  'mastery',
];

function isMemorizeListView(value: unknown): value is MemorizeListView {
  return value === 'cards' || value === 'table';
}

function isMemorizeTableSortBy(value: unknown): value is MemorizeTableSortBy {
  return (
    typeof value === 'string' &&
    (SORT_BY_VALUES as readonly string[]).includes(value)
  );
}

function isMemorizeTableSortDirection(
  value: unknown
): value is MemorizeTableSortDirection {
  return value === 'asc' || value === 'desc';
}

export function loadMemorizeListView(): MemorizeListView {
  try {
    const stored = localStorage.getItem(MEMORIZE_LIST_VIEW_KEY);
    if (isMemorizeListView(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_MEMORIZE_LIST_VIEW;
}

export function saveMemorizeListView(view: MemorizeListView): void {
  try {
    localStorage.setItem(MEMORIZE_LIST_VIEW_KEY, view);
  } catch {
    /* ignore */
  }
}

export function loadMemorizeTableSort(): MemorizeTableSortPrefs {
  try {
    const raw = localStorage.getItem(MEMORIZE_TABLE_SORT_KEY);
    if (!raw) return { ...DEFAULT_MEMORIZE_TABLE_SORT };
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      isMemorizeTableSortBy((parsed as MemorizeTableSortPrefs).sortBy) &&
      isMemorizeTableSortDirection((parsed as MemorizeTableSortPrefs).sortDirection)
    ) {
      return {
        sortBy: (parsed as MemorizeTableSortPrefs).sortBy,
        sortDirection: (parsed as MemorizeTableSortPrefs).sortDirection,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_MEMORIZE_TABLE_SORT };
}

export function saveMemorizeTableSort(prefs: MemorizeTableSortPrefs): void {
  try {
    localStorage.setItem(
      MEMORIZE_TABLE_SORT_KEY,
      JSON.stringify({
        sortBy: prefs.sortBy,
        sortDirection: prefs.sortDirection,
      })
    );
  } catch {
    /* ignore */
  }
}
