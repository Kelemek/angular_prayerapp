import type { BadgeCachedItem, BadgeItemType } from './badge-types';

export const BADGE_READ_PRAYERS_DATA_KEY = 'read_prayers_data';
export const BADGE_READ_PROMPTS_DATA_KEY = 'read_prompts_data';

export function badgeCacheStorageKey(type: BadgeItemType): string {
  return type === 'prayers' ? 'prayers_cache' : 'prompts_cache';
}

export function parseBadgeCachedItems(cacheKey: string): BadgeCachedItem[] {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      return [];
    }

    const parsedCache = JSON.parse(cached);
    const items = parsedCache?.data ?? parsedCache ?? [];

    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function parseBadgeCachedItemsByType(type: BadgeItemType): BadgeCachedItem[] {
  return parseBadgeCachedItems(badgeCacheStorageKey(type));
}

export function findBadgeCachedItem(
  items: BadgeCachedItem[],
  itemId: string
): BadgeCachedItem | undefined {
  return items.find((item) => item.id === itemId);
}
