import {
  nextDisplayOrderInCategoryRange,
  personalCategoryDisplayName,
  type CategoryDisplayOrderRange,
} from './prayer-personal-category';
import { maxDisplayOrderFromCategoryQuery } from './prayer-personal-mutations';

export type PersonalPrayerInsertDisplayOrderPlan =
  | { ok: true; displayOrder: number }
  | { ok: false; userMessage: string };

export function planPersonalPrayerInsertDisplayOrder(
  maxError: unknown,
  maxData: { display_order?: number | null } | null,
  range: CategoryDisplayOrderRange,
  category: string | null
): PersonalPrayerInsertDisplayOrderPlan {
  const maxInRange = maxDisplayOrderFromCategoryQuery(maxError, maxData, range.min);
  const displayOrder = nextDisplayOrderInCategoryRange(maxInRange, range);
  if (displayOrder === null) {
    return {
      ok: false,
      userMessage: `Category '${personalCategoryDisplayName(category)}' is full (display order at maximum). Please reorder prayers or use a different category.`,
    };
  }
  return { ok: true, displayOrder };
}
