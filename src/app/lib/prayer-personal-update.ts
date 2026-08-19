import type { CategoryDisplayOrderRange } from './prayer-personal-category';
import {
  isPersonalCategoryAtPrayerLimit,
  personalCategoryDisplayName,
} from './prayer-personal-category';
import {
  displayOrderAfterCategoryChange,
  maxDisplayOrderFromCategoryQuery,
} from './prayer-personal-mutations';
import type { PrayerRequest } from './prayer-types';

export function findPersonalPrayerById(
  prayers: PrayerRequest[],
  id: string
): PrayerRequest | undefined {
  return prayers.find((p) => p.id === id);
}

export function resolvePersonalPrayerCategoryEdit(
  currentPrayer: PrayerRequest,
  updates: Partial<Pick<PrayerRequest, 'category'>>,
  sanitize: (category: string | null | undefined) => string | null
): { newCategory: string | null; categoryChanged: boolean } {
  const newCategory: string | null =
    updates.category !== undefined
      ? sanitize(updates.category)
      : (currentPrayer.category ?? null);
  return {
    newCategory,
    categoryChanged: newCategory !== currentPrayer.category,
  };
}

export function personalCategoryAtLimitMessage(category: string | null): string {
  return `Category '${personalCategoryDisplayName(category)}' has reached its limit of 1,000 prayers. Please archive or delete some prayers, or organize into multiple categories.`;
}

export function isPersonalCategoryCountAtLimit(categoryCount: number): boolean {
  return isPersonalCategoryAtPrayerLimit(categoryCount);
}

export function buildClearPersonalPrayerAnsweredFlagsPayload(): Record<string, unknown> {
  return {
    mark_as_answered: false,
    updated_at: new Date().toISOString(),
  };
}

export function displayOrderForPersonalCategoryChange(
  maxError: unknown,
  maxData: { display_order?: number | null } | null,
  range: CategoryDisplayOrderRange
): number {
  const maxInRange = maxDisplayOrderFromCategoryQuery(maxError, maxData, range.min);
  return displayOrderAfterCategoryChange(maxInRange, range);
}
