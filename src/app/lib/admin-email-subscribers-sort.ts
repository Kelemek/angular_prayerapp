import type {
  EmailSubscriberRow,
  EmailSubscriberSortColumn,
} from './admin-email-subscribers';

function sortDateMs(value: string | null | undefined): number {
  if (value == null || value === '') return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function sortEmailSubscriberRows(
  rows: EmailSubscriberRow[],
  sortBy: EmailSubscriberSortColumn,
  sortDirection: 'asc' | 'desc',
): EmailSubscriberRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortBy) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'email':
        aVal = (a.email || '').toLowerCase();
        bVal = (b.email || '').toLowerCase();
        break;
      case 'created_at':
        aVal = sortDateMs(a.created_at);
        bVal = sortDateMs(b.created_at);
        break;
      case 'last_activity_date':
        aVal = sortDateMs(a.last_activity_date);
        bVal = sortDateMs(b.last_activity_date);
        break;
      case 'is_active':
        aVal = a.is_active ? 1 : 0;
        bVal = b.is_active ? 1 : 0;
        break;
      case 'receive_push':
        aVal = (a.receive_push ?? false) ? 1 : 0;
        bVal = (b.receive_push ?? false) ? 1 : 0;
        break;
      case 'is_blocked':
        aVal = a.is_blocked ? 1 : 0;
        bVal = b.is_blocked ? 1 : 0;
        break;
      case 'in_planning_center':
        aVal =
          a.in_planning_center === true
            ? 1
            : a.in_planning_center === false
              ? 0
              : -1;
        bVal =
          b.in_planning_center === true
            ? 1
            : b.in_planning_center === false
              ? 0
              : -1;
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

export function nextEmailSubscriberSort(
  sortBy: EmailSubscriberSortColumn,
  sortDirection: 'asc' | 'desc',
  column: EmailSubscriberSortColumn,
): { sortBy: EmailSubscriberSortColumn; sortDirection: 'asc' | 'desc' } {
  if (sortBy === column) {
    return {
      sortBy: column,
      sortDirection: sortDirection === 'asc' ? 'desc' : 'asc',
    };
  }
  return {
    sortBy: column,
    sortDirection: column === 'last_activity_date' ? 'desc' : 'asc',
  };
}

export function emailSubscriberSortIndicator(
  sortBy: EmailSubscriberSortColumn,
  sortDirection: 'asc' | 'desc',
  column: EmailSubscriberSortColumn,
): string {
  if (sortBy !== column) return '';
  return sortDirection === 'asc' ? ' ↑' : ' ↓';
}

export function countActiveEmailSubscribers(rows: EmailSubscriberRow[]): number {
  return rows.filter((row) => row.is_active).length;
}
