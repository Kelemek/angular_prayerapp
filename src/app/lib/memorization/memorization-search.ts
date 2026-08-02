import type { MemorizedItem } from '../../types/memorization';

/** Trim, lowercase, and collapse whitespace for Memorize list search. */
export function normalizeMemorizationSearchQuery(
  query: string | null | undefined
): string {
  if (!query) {
    return '';
  }
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Empty query matches all items. Otherwise matches reference (book + verse)
 * or translation (e.g. kjv), including Bible Books card labels on `reference`.
 */
export function memorizedItemMatchesSearch(
  item: MemorizedItem,
  query: string | null | undefined
): boolean {
  const normalized = normalizeMemorizationSearchQuery(query);
  if (!normalized) {
    return true;
  }

  const reference = (item.reference ?? '').toLowerCase();
  const translation = (item.translation ?? '').toLowerCase();
  return reference.includes(normalized) || translation.includes(normalized);
}

export function filterMemorizedItemsBySearch(
  items: readonly MemorizedItem[],
  query: string | null | undefined
): MemorizedItem[] {
  const normalized = normalizeMemorizationSearchQuery(query);
  if (!normalized) {
    return [...items];
  }
  return items.filter((item) => memorizedItemMatchesSearch(item, normalized));
}
