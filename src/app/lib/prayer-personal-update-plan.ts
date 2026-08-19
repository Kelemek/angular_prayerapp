import {
  isClearingPersonalAnsweredCategory,
  PERSONAL_ANSWERED_CATEGORY,
} from './prayer-personal-mutations';
import type { PrayerRequest } from './prayer-types';
import {
  findPersonalPrayerById,
  isPersonalCategoryCountAtLimit,
  personalCategoryAtLimitMessage,
  resolvePersonalPrayerCategoryEdit,
} from './prayer-personal-update';

export type PersonalPrayerUpdateStartPlan =
  | { ok: false }
  | {
      ok: true;
      currentPrayer: PrayerRequest;
      newCategory: string | null;
      categoryChanged: boolean;
    };

export function startPersonalPrayerUpdatePlan(
  prayers: PrayerRequest[],
  id: string,
  updates: Partial<Pick<PrayerRequest, 'title' | 'prayer_for' | 'description' | 'category'>>,
  sanitize: (category: string | null | undefined) => string | null
): PersonalPrayerUpdateStartPlan {
  const currentPrayer = findPersonalPrayerById(prayers, id);
  if (!currentPrayer) {
    return { ok: false };
  }

  const { newCategory, categoryChanged } = resolvePersonalPrayerCategoryEdit(
    currentPrayer,
    updates,
    sanitize
  );

  return {
    ok: true,
    currentPrayer,
    newCategory,
    categoryChanged,
  };
}

export type PersonalCategoryChangeValidation =
  | { ok: true }
  | { ok: false; message: string };

export function validatePersonalCategoryChangeForUpdate(
  categoryChanged: boolean,
  categoryFieldUpdated: boolean,
  newCategoryCount: number,
  newCategory: string | null
): PersonalCategoryChangeValidation {
  if (!categoryChanged || !categoryFieldUpdated) {
    return { ok: true };
  }
  if (isPersonalCategoryCountAtLimit(newCategoryCount)) {
    return { ok: false, message: personalCategoryAtLimitMessage(newCategory) };
  }
  return { ok: true };
}

export function personalPrayerUpdateClearsAnsweredFlags(
  oldCategory: string | null | undefined,
  newCategory: string | null
): boolean {
  return isClearingPersonalAnsweredCategory(oldCategory, newCategory);
}

export function shouldDropPersonalPrayerRemindersAfterUpdate(
  newCategory: string | null
): boolean {
  return newCategory === PERSONAL_ANSWERED_CATEGORY;
}
