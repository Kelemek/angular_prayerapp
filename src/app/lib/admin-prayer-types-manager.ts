import type { PrayerTypeRecord } from '../types/prayer';

export type PrayerTypeRowAction =
  | { type: 'edit' }
  | { type: 'delete' }
  | { type: 'toggleBooklet' }
  | { type: 'toggleActive' };

export function formatPrayerTypeDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function countActivePrayerTypes(types: PrayerTypeRecord[]): number {
  return types.filter((t) => t.is_active).length;
}
