import {
  isUncategorizedCategory,
  resolvePersonalCategoryRangeFromDbState,
  uncategorizedCategoryRange,
  type CategoryDisplayOrderRange,
} from './prayer-personal-category';

export function personalCategoryRangeForUncategorized(
  category: string | null | undefined
): CategoryDisplayOrderRange | null {
  if (isUncategorizedCategory(category)) {
    return uncategorizedCategoryRange();
  }
  return null;
}

export function shouldFetchAllCategoryDisplayOrders(
  categoryPrayers: { display_order?: number | null }[] | null | undefined
): boolean {
  return !categoryPrayers || categoryPrayers.length === 0;
}

export function mapAllCategoryDisplayOrders(
  rows: { display_order: number }[] | null | undefined
): number[] {
  return (rows || []).map((row) => row.display_order);
}

export function personalCategoryRangeFromQueryState(
  category: string | null | undefined,
  categoryPrayers: { display_order?: number | null }[] | null | undefined,
  allCategoryDisplayOrders: number[]
): CategoryDisplayOrderRange {
  return resolvePersonalCategoryRangeFromDbState(
    category,
    categoryPrayers,
    allCategoryDisplayOrders
  );
}

export function countPersonalPrayersInCategory(
  rows: { id: string }[] | null | undefined
): number {
  return (rows || []).length;
}
