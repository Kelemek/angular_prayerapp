import type { CategoryDisplayOrderRange } from './prayer-personal-category';
import {
  countPersonalPrayersInCategory,
  mapAllCategoryDisplayOrders,
  personalCategoryRangeForUncategorized,
  personalCategoryRangeFromQueryState,
  shouldFetchAllCategoryDisplayOrders,
} from './prayer-personal-category-query';

export type PersonalCategoryDisplayOrderRow = {
  display_order?: number | null;
};

export type PersonalCategoryAllDisplayOrderRow = {
  category?: string | null;
  display_order: number;
};

export type PersonalCategoryIdRow = { id: string };

export function personalCategoryDbEqValue(
  category: string | null | undefined
): string | null {
  return category || null;
}

export async function resolvePersonalCategoryRangeWithDb(
  category: string | null | undefined,
  userEmail: string | null,
  fetchCategoryPrayers: (
    userEmail: string,
    categoryEq: string | null
  ) => Promise<{ data: PersonalCategoryDisplayOrderRow[] | null; error: unknown }>,
  fetchAllCategoryDisplayOrders: (
    userEmail: string,
    minDisplayOrder: number
  ) => Promise<{ data: PersonalCategoryAllDisplayOrderRow[] | null; error: unknown }>,
  uncategorizedMaxPlusOne: number
): Promise<CategoryDisplayOrderRange> {
  const uncategorizedRange = personalCategoryRangeForUncategorized(category);
  if (uncategorizedRange) {
    return uncategorizedRange;
  }

  if (!userEmail) {
    throw new Error('User email not available');
  }

  const categoryEq = personalCategoryDbEqValue(category);
  const { data: categoryPrayers, error } = await fetchCategoryPrayers(
    userEmail,
    categoryEq
  );
  if (error) {
    throw error;
  }

  let allCategoryDisplayOrders: number[] = [];
  if (shouldFetchAllCategoryDisplayOrders(categoryPrayers)) {
    const { data: allCategoryData, error: allError } =
      await fetchAllCategoryDisplayOrders(userEmail, uncategorizedMaxPlusOne);
    if (allError) {
      throw allError;
    }
    allCategoryDisplayOrders = mapAllCategoryDisplayOrders(allCategoryData);
  }

  return personalCategoryRangeFromQueryState(
    category,
    categoryPrayers,
    allCategoryDisplayOrders
  );
}

export async function fetchPersonalCategoryPrayerCountWithDb(
  userEmail: string | null,
  category: string | null | undefined,
  fetchCategoryIds: (
    userEmail: string,
    categoryEq: string | null
  ) => Promise<{ data: PersonalCategoryIdRow[] | null; error: unknown }>
): Promise<number> {
  if (!userEmail) {
    return 0;
  }

  const { data: prayers, error } = await fetchCategoryIds(
    userEmail,
    personalCategoryDbEqValue(category)
  );
  if (error) {
    console.error('Error counting category prayers:', error);
    return 0;
  }

  return countPersonalPrayersInCategory(prayers);
}
