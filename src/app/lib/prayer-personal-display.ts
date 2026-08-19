import type { PrayerRequest, PrayerStatus } from './prayer-types';

export const PERSONAL_PRAYERS_LIST_SELECT = `
  id,
  title,
  description,
  category,
  prayer_for,
  user_email,
  display_order,
  created_at,
  updated_at,
  prayed_for_count,
  personal_prayer_updates (
    id,
    content,
    author,
    author_email,
    mark_as_answered,
    created_at
  )
`;

export const PRAYER_PERSONAL_CATEGORY_RANGE_SIZE = 1000;
export const PRAYER_PERSONAL_UNCATEGORIZED_MIN = 0;
export const PRAYER_PERSONAL_UNCATEGORIZED_MAX = 999;

export function sanitizePersonalPrayerCategory(
  category: string | null | undefined
): string | null {
  if (!category || typeof category !== 'string') {
    return null;
  }

  const trimmed = category.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > 50) {
    console.warn(`Category name exceeds 50 characters, truncating: "${trimmed}"`);
    return trimmed.substring(0, 50);
  }

  return trimmed;
}

export function isPersonalPrayerDisplayOrderOnlyChange(
  oldRow: Record<string, unknown> | undefined,
  newRow: Record<string, unknown> | undefined
): boolean {
  if (!oldRow || !newRow || oldRow['display_order'] === newRow['display_order']) {
    return false;
  }
  const ignoreKeys = new Set(['display_order', 'updated_at']);
  const keys = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);
  for (const key of keys) {
    if (ignoreKeys.has(key)) {
      continue;
    }
    if (oldRow[key] !== newRow[key]) {
      return false;
    }
  }
  return true;
}

export function sortPersonalPrayersByDisplayOrder(prayers: PrayerRequest[]): PrayerRequest[] {
  return [...prayers].sort((a, b) => {
    const oa = a.display_order ?? 0;
    const ob = b.display_order ?? 0;
    if (ob !== oa) return ob - oa;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
}

export function applyPersonalCategorySwapLocally(
  allPrayers: PrayerRequest[],
  categoryA: string,
  categoryB: string
): PrayerRequest[] | null {
  const prayersA = allPrayers.filter((p) => p.category === categoryA);
  const prayersB = allPrayers.filter((p) => p.category === categoryB);
  if (prayersA.length === 0 || prayersB.length === 0) {
    return null;
  }

  const minOrderA = Math.min(...prayersA.map((p) => p.display_order ?? 0));
  const minOrderB = Math.min(...prayersB.map((p) => p.display_order ?? 0));
  const prefixA = Math.floor(minOrderA / 1000);
  const prefixB = Math.floor(minOrderB / 1000);

  const updated = allPrayers.map((p) => {
    const cat = p.category as string | null | undefined;
    if (cat === categoryA) {
      const lastThree = (p.display_order ?? 0) % 1000;
      return { ...p, display_order: prefixB * 1000 + lastThree };
    }
    if (cat === categoryB) {
      const lastThree = (p.display_order ?? 0) % 1000;
      return { ...p, display_order: prefixA * 1000 + lastThree };
    }
    return p;
  });

  return sortPersonalPrayersByDisplayOrder(updated);
}

export function applyPersonalCategoryReorderLocally(
  allPrayers: PrayerRequest[],
  orderedCategories: (string | null)[]
): PrayerRequest[] {
  const updated = allPrayers.map((p) => {
    const idx = orderedCategories.indexOf(p.category as string | null);
    if (idx === -1) return p;
    const newPrefix = orderedCategories.length - idx;
    const lastThree = (p.display_order ?? 0) % 1000;
    return { ...p, display_order: newPrefix * 1000 + lastThree };
  });
  return sortPersonalPrayersByDisplayOrder(updated);
}

export type PersonalPrayerDbRow = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  prayer_for: string;
  user_email: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  prayed_for_count?: number | null;
  personal_prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    author_email?: string;
    mark_as_answered?: boolean;
    created_at: string;
  }>;
};

export function personalPrayerRowToPrayerRequest(row: PersonalPrayerDbRow): PrayerRequest {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: (row.category === 'Answered' ? 'answered' : 'current') as PrayerStatus,
    prayer_for: row.prayer_for,
    requester: row.user_email,
    email: row.user_email,
    user_email: row.user_email,
    is_anonymous: false,
    date_requested: row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    approval_status: 'approved',
    type: 'prayer',
    display_order: row.display_order,
    prayed_for_count: row.prayed_for_count ?? 0,
    updates: (row.personal_prayer_updates || []).map((u) => ({
      id: u.id,
      prayer_id: row.id,
      content: u.content,
      author: u.author,
      author_email: u.author_email,
      is_anonymous: false,
      mark_as_answered: u.mark_as_answered,
      created_at: u.created_at,
      approval_status: 'approved',
    })),
  };
}

export function withPersonalPrayerUserEmail(prayer: PrayerRequest): PrayerRequest {
  const userEmail = prayer.user_email ?? prayer.email;
  if (!userEmail) {
    return prayer;
  }
  return {
    ...prayer,
    email: prayer.email ?? userEmail,
    user_email: userEmail,
  };
}

export function normalizePersonalPrayerCache(prayers: PrayerRequest[]): PrayerRequest[] {
  return prayers.map((prayer) => withPersonalPrayerUserEmail(prayer));
}
