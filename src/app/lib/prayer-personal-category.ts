import {
  PRAYER_PERSONAL_CATEGORY_RANGE_SIZE,
  PRAYER_PERSONAL_UNCATEGORIZED_MAX,
  PRAYER_PERSONAL_UNCATEGORIZED_MIN,
  sanitizePersonalPrayerCategory,
} from './prayer-personal-display';
import type { PrayerRequest } from './prayer-types';

export type CategoryDisplayOrderRange = { min: number; max: number };

export type PersonalPrayerDisplayOrderUpdate = {
  prayerId: string;
  displayOrder: number;
};

export const PERSONAL_CATEGORY_SWAP_TEMP_PREFIX = 999;

export function uncategorizedCategoryRange(): CategoryDisplayOrderRange {
  return {
    min: PRAYER_PERSONAL_UNCATEGORIZED_MIN,
    max: PRAYER_PERSONAL_UNCATEGORIZED_MAX,
  };
}

export function isUncategorizedCategory(category: string | null | undefined): boolean {
  return !category || category.trim().length === 0;
}

export function personalCategoryDisplayName(category: string | null | undefined): string {
  return category || 'Uncategorized';
}

export function isPersonalCategoryAtPrayerLimit(
  count: number,
  rangeSize = PRAYER_PERSONAL_CATEGORY_RANGE_SIZE
): boolean {
  return count >= rangeSize;
}

export function displayOrderRangeFromExistingCategory(
  displayOrders: number[]
): CategoryDisplayOrderRange {
  const minOrder = Math.min(...displayOrders);
  const prefix = Math.floor(minOrder / 1000);
  const min = prefix * 1000;
  const max = min + PRAYER_PERSONAL_CATEGORY_RANGE_SIZE - 1;
  return { min, max };
}

export function nextAvailableCategoryRange(
  categoryDisplayOrders: number[]
): CategoryDisplayOrderRange {
  let maxPrefix = 0;
  categoryDisplayOrders.forEach((displayOrder) => {
    const prefix = Math.floor(displayOrder / 1000);
    maxPrefix = Math.max(maxPrefix, prefix);
  });
  const nextPrefix = maxPrefix + 1;
  const min = nextPrefix * 1000;
  const max = min + PRAYER_PERSONAL_CATEGORY_RANGE_SIZE - 1;
  return { min, max };
}

export function nextDisplayOrderInCategoryRange(
  maxDisplayOrderInRange: number | null | undefined,
  range: CategoryDisplayOrderRange
): number | null {
  const max =
    maxDisplayOrderInRange !== null && maxDisplayOrderInRange !== undefined
      ? maxDisplayOrderInRange
      : range.min - 1;
  if (max >= range.max) {
    return null;
  }
  return max + 1;
}

export function groupPersonalPrayersByCategory(
  prayers: PrayerRequest[]
): Map<string | null | undefined, PrayerRequest[]> {
  const prayersByCategory = new Map<string | null | undefined, PrayerRequest[]>();
  for (const prayer of prayers) {
    const category = prayer.category as string | null | undefined;
    if (!prayersByCategory.has(category)) {
      prayersByCategory.set(category, []);
    }
    prayersByCategory.get(category)!.push(prayer);
  }
  return prayersByCategory;
}

export function buildCategoryReorderDisplayOrderUpdates(
  orderedCategories: (string | null)[],
  allPrayers: PrayerRequest[]
): PersonalPrayerDisplayOrderUpdate[] {
  const updates: PersonalPrayerDisplayOrderUpdate[] = [];
  for (let newIndex = 0; newIndex < orderedCategories.length; newIndex++) {
    const category = orderedCategories[newIndex];
    if (!category) {
      continue;
    }
    const newPrefix = orderedCategories.length - newIndex;
    const categoryPrayers = allPrayers.filter((p) => p.category === category);
    for (const prayer of categoryPrayers) {
      const lastThreeDigits = (prayer.display_order ?? 0) % 1000;
      updates.push({
        prayerId: prayer.id,
        displayOrder: newPrefix * 1000 + lastThreeDigits,
      });
    }
  }
  return updates;
}

export function buildPrayerOrderDisplayOrderUpdates(
  categoryPrayers: PrayerRequest[],
  range: CategoryDisplayOrderRange
): PersonalPrayerDisplayOrderUpdate[] {
  return categoryPrayers.map((prayer, index) => {
    const orderWithinRange = categoryPrayers.length - 1 - index;
    const displayOrder = Math.min(range.min + orderWithinRange, range.max);
    return { prayerId: prayer.id, displayOrder };
  });
}

export function buildDisplayOrderUpdatesWithPrefix(
  prayers: PrayerRequest[],
  prefix: number
): PersonalPrayerDisplayOrderUpdate[] {
  return prayers.map((prayer) => {
    const lastThreeDigits = (prayer.display_order ?? 0) % 1000;
    return {
      prayerId: prayer.id,
      displayOrder: prefix * 1000 + lastThreeDigits,
    };
  });
}

export type CategorySwapFallbackSteps = {
  step1: PersonalPrayerDisplayOrderUpdate[];
  step2: PersonalPrayerDisplayOrderUpdate[];
  step3: PersonalPrayerDisplayOrderUpdate[];
};

export function buildCategorySwapFallbackSteps(
  prayersA: PrayerRequest[],
  prayersB: PrayerRequest[]
): CategorySwapFallbackSteps | null {
  if (prayersA.length === 0 || prayersB.length === 0) {
    return null;
  }
  const minOrderA = Math.min(...prayersA.map((p) => p.display_order ?? 0));
  const minOrderB = Math.min(...prayersB.map((p) => p.display_order ?? 0));
  const prefixA = Math.floor(minOrderA / 1000);
  const prefixB = Math.floor(minOrderB / 1000);
  return {
    step1: buildDisplayOrderUpdatesWithPrefix(
      prayersA,
      PERSONAL_CATEGORY_SWAP_TEMP_PREFIX
    ),
    step2: buildDisplayOrderUpdatesWithPrefix(prayersB, prefixA),
    step3: buildDisplayOrderUpdatesWithPrefix(prayersA, prefixB),
  };
}

export function filterValidCategoryNames(
  orderedCategories: (string | null)[]
): string[] {
  return orderedCategories.filter((c) => c !== null && c !== undefined) as string[];
}

export function rpcMutationSucceeded(data: unknown): boolean {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return true;
  }
  return Boolean((data[0] as { success?: boolean }).success);
}

export function rpcMutationErrorMessage(data: unknown): string | undefined {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return undefined;
  }
  return (data[0] as { message?: string }).message;
}

export type PersonalCategoryRpcInterpretation =
  | { ok: true; logMessage?: string }
  | { ok: false; message: string };

export function interpretPersonalCategoryRpcMutation(
  data: unknown
): PersonalCategoryRpcInterpretation {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { ok: true };
  }
  if (!rpcMutationSucceeded(data)) {
    return {
      ok: false,
      message: rpcMutationErrorMessage(data) || 'Personal category mutation failed',
    };
  }
  const logMessage = rpcMutationErrorMessage(data);
  return logMessage ? { ok: true, logMessage } : { ok: true };
}

export type PersonalCategorySwapValidation =
  | { ok: true; categoryA: string; categoryB: string }
  | { ok: false; reason: 'no_email' | 'missing_category' };

export function validatePersonalCategorySwapInputs(
  userEmail: string | null,
  categoryA: string | null | undefined,
  categoryB: string | null | undefined
): PersonalCategorySwapValidation {
  if (!userEmail) {
    return { ok: false, reason: 'no_email' };
  }
  if (!categoryA || !categoryB) {
    return { ok: false, reason: 'missing_category' };
  }
  return { ok: true, categoryA, categoryB };
}

export function personalCategoryReorderRpcArgs(
  userEmail: string,
  orderedCategories: (string | null)[]
): { p_user_email: string; p_ordered_categories: string[] } {
  return {
    p_user_email: userEmail,
    p_ordered_categories: filterValidCategoryNames(orderedCategories),
  };
}

export function personalCategorySwapRpcArgs(
  userEmail: string,
  categoryA: string,
  categoryB: string
): { p_user_email: string; p_category_a: string; p_category_b: string } {
  return {
    p_user_email: userEmail,
    p_category_a: categoryA,
    p_category_b: categoryB,
  };
}

export function personalPrayerOrderRpcArgs(
  userEmail: string,
  orderedPrayerIds: string[],
  category: string | null | undefined
): {
  p_user_email: string;
  p_ordered_prayer_ids: string[];
  p_category: string | null;
} {
  return {
    p_user_email: userEmail,
    p_ordered_prayer_ids: orderedPrayerIds,
    p_category: category || null,
  };
}

export function resolvePersonalCategoryRangeFromDbState(
  category: string | null | undefined,
  categoryPrayers: { display_order?: number | null }[] | null | undefined,
  allCategoryDisplayOrders: number[]
): CategoryDisplayOrderRange {
  if (isUncategorizedCategory(category)) {
    return uncategorizedCategoryRange();
  }

  if (!categoryPrayers || categoryPrayers.length === 0) {
    return nextAvailableCategoryRange(allCategoryDisplayOrders);
  }

  return displayOrderRangeFromExistingCategory(
    categoryPrayers.map((p) => p.display_order || 0)
  );
}

export type PersonalCategoryRenameValidation =
  | { ok: true; oldName: string; newName: string; unchanged?: boolean }
  | { ok: false; errorMessage: string };

export function validatePersonalCategoryRename(
  oldCategory: string | null | undefined,
  newCategory: string | null | undefined,
  sanitize: (category: string | null | undefined) => string | null,
  existingNames: string[],
  reservedNames: string[] = []
): PersonalCategoryRenameValidation {
  const oldName = sanitize(oldCategory);
  if (!oldName) {
    return { ok: false, errorMessage: 'Category not found' };
  }

  const newName = sanitize(newCategory);
  if (!newName) {
    return { ok: false, errorMessage: 'Enter a category name' };
  }

  if (oldName === newName) {
    return { ok: true, oldName, newName, unchanged: true };
  }

  if (isReservedOrExistingCategoryName(newName, existingNames, reservedNames)) {
    return { ok: false, errorMessage: `Category "${newName}" already exists` };
  }

  return { ok: true, oldName, newName };
}

export function buildPersonalCategoryRenameDbPayload(
  newName: string
): Record<string, unknown> {
  return {
    category: newName,
    updated_at: new Date().toISOString(),
  };
}

export function isReservedOrExistingCategoryName(
  newName: string,
  existingNames: string[],
  reservedNames: string[] = []
): boolean {
  const duplicateNames = new Set([...existingNames, ...reservedNames]);
  return duplicateNames.has(newName);
}

export function personalPrayerIdsWithTrimmedCategory(
  rows: Array<{ id: string; category: string | null }>,
  oldName: string
): string[] {
  return rows
    .filter((row) => sanitizePersonalPrayerCategory(row.category) === oldName)
    .map((row) => row.id);
}

export function applyPersonalCategoryRenameLocally(
  allPrayers: PrayerRequest[],
  oldName: string,
  newName: string
): PrayerRequest[] {
  return allPrayers.map((p) =>
    sanitizePersonalPrayerCategory(p.category) === oldName
      ? { ...p, category: newName }
      : p
  );
}
