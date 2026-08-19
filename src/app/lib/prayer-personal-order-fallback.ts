import {
  buildCategoryReorderDisplayOrderUpdates,
  buildCategorySwapFallbackSteps,
  buildPrayerOrderDisplayOrderUpdates,
  groupPersonalPrayersByCategory,
  type CategoryDisplayOrderRange,
  type CategorySwapFallbackSteps,
  type PersonalPrayerDisplayOrderUpdate,
} from './prayer-personal-category';
import type { PrayerRequest } from './prayer-types';

export async function collectPersonalPrayerOrderFallbackUpdates(
  prayers: PrayerRequest[],
  resolveCategoryRange: (
    category: string | null | undefined
  ) => Promise<CategoryDisplayOrderRange>
): Promise<PersonalPrayerDisplayOrderUpdate[]> {
  const prayersByCategory = groupPersonalPrayersByCategory(prayers);
  const updates: PersonalPrayerDisplayOrderUpdate[] = [];

  for (const [category, categoryPrayers] of prayersByCategory) {
    const range = await resolveCategoryRange(category);
    updates.push(...buildPrayerOrderDisplayOrderUpdates(categoryPrayers, range));
  }

  return updates;
}

export function personalPrayersInCategory(
  prayers: PrayerRequest[],
  category: string
): PrayerRequest[] {
  return prayers.filter((p) => p.category === category);
}

export function buildCategorySwapFallbackPlan(
  allPrayers: PrayerRequest[],
  categoryA: string,
  categoryB: string
): CategorySwapFallbackSteps | null {
  const prayersA = personalPrayersInCategory(allPrayers, categoryA);
  const prayersB = personalPrayersInCategory(allPrayers, categoryB);
  return buildCategorySwapFallbackSteps(prayersA, prayersB);
}

export async function applyCategorySwapFallbackSteps(
  steps: CategorySwapFallbackSteps,
  applyBatch: (updates: PersonalPrayerDisplayOrderUpdate[]) => Promise<void>
): Promise<void> {
  await applyBatch(steps.step1);
  await applyBatch(steps.step2);
  await applyBatch(steps.step3);
}

export function categoryReorderFallbackUpdates(
  orderedCategories: (string | null)[],
  allPrayers: PrayerRequest[]
): PersonalPrayerDisplayOrderUpdate[] {
  return buildCategoryReorderDisplayOrderUpdates(orderedCategories, allPrayers);
}
