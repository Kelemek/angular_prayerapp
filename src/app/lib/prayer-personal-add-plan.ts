import type { CategoryDisplayOrderRange } from './prayer-personal-category';
import { planPersonalPrayerInsertDisplayOrder } from './prayer-personal-insert';
import {
  isPersonalCategoryCountAtLimit,
  personalCategoryAtLimitMessage,
} from './prayer-personal-update';

export type PersonalCategoryMaxOrderQuery = (
  userEmail: string,
  category: string | null,
  range: CategoryDisplayOrderRange
) => Promise<{
  data: { display_order?: number | null } | null;
  error: unknown;
}>;

export type PersonalCategoryDeps = {
  getCategoryCount: (category: string | null) => Promise<number>;
  getCategoryRange: (category: string | null) => Promise<CategoryDisplayOrderRange>;
  queryMaxDisplayOrderInRange: PersonalCategoryMaxOrderQuery;
};

export type PersonalPrayerAddPlan =
  | { ok: false; userMessage: string }
  | { ok: true; category: string | null; displayOrder: number };

export async function planPersonalPrayerAdd(
  prayerCategory: string | null | undefined,
  userEmail: string,
  sanitizeCategory: (category: string | null | undefined) => string | null,
  deps: PersonalCategoryDeps
): Promise<PersonalPrayerAddPlan> {
  const category = sanitizeCategory(prayerCategory);
  const categoryCount = await deps.getCategoryCount(category);
  if (isPersonalCategoryCountAtLimit(categoryCount)) {
    return { ok: false, userMessage: personalCategoryAtLimitMessage(category) };
  }

  const range = await deps.getCategoryRange(category);
  const { data: maxData, error: maxError } = await deps.queryMaxDisplayOrderInRange(
    userEmail,
    category,
    range
  );

  const displayOrderPlan = planPersonalPrayerInsertDisplayOrder(
    maxError,
    maxData,
    range,
    category
  );
  if (!displayOrderPlan.ok) {
    return { ok: false, userMessage: displayOrderPlan.userMessage };
  }

  return {
    ok: true,
    category,
    displayOrder: displayOrderPlan.displayOrder,
  };
}
