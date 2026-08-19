import { displayOrderForPersonalCategoryChange } from './prayer-personal-update';
import { validatePersonalCategoryChangeForUpdate } from './prayer-personal-update-plan';
import type { PersonalCategoryDeps } from './prayer-personal-add-plan';

export type PersonalPrayerCategoryChangePlan =
  | { ok: false; userMessage: string }
  | { ok: true; displayOrder: number };

export async function resolvePersonalPrayerCategoryChangeDisplayOrder(
  categoryChanged: boolean,
  updatesCategoryDefined: boolean,
  newCategory: string | null,
  currentDisplayOrder: number | undefined,
  userEmail: string,
  deps: PersonalCategoryDeps
): Promise<PersonalPrayerCategoryChangePlan> {
  let displayOrder = currentDisplayOrder ?? 0;
  if (!categoryChanged || !updatesCategoryDefined) {
    return { ok: true, displayOrder };
  }

  const categoryValidation = validatePersonalCategoryChangeForUpdate(
    categoryChanged,
    updatesCategoryDefined,
    await deps.getCategoryCount(newCategory),
    newCategory
  );
  if (!categoryValidation.ok) {
    return { ok: false, userMessage: categoryValidation.message };
  }

  const newRange = await deps.getCategoryRange(newCategory);
  const { data: maxData, error: maxError } = await deps.queryMaxDisplayOrderInRange(
    userEmail,
    newCategory,
    newRange
  );
  displayOrder = displayOrderForPersonalCategoryChange(maxError, maxData, newRange);
  return { ok: true, displayOrder };
}
