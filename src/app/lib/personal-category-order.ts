import type { PrayerRequest } from "../services/prayer.service";

type CategoryOrderPrayer = Pick<PrayerRequest, "category" | "display_order">;

/** Category names sorted by minimum display_order descending (highest range first). */
export function personalCategoryNamesFromPrayers(
  prayers: ReadonlyArray<CategoryOrderPrayer>
): string[] {
  const categories = new Map<string, number>();

  for (const prayer of prayers) {
    if (!prayer.category?.trim()) {
      continue;
    }
    const category = prayer.category.trim();
    const displayOrder = prayer.display_order ?? 0;
    const current = categories.get(category);
    if (current === undefined || displayOrder < current) {
      categories.set(category, displayOrder);
    }
  }

  return Array.from(categories.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

/** Named personal category chips exclude the reserved Answered label. */
export function namedPersonalCategoryNamesFromPrayers(
  prayers: ReadonlyArray<CategoryOrderPrayer>
): string[] {
  return personalCategoryNamesFromPrayers(prayers).filter(
    (category) => category !== "Answered"
  );
}
