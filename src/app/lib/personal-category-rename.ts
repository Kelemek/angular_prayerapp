import type { PersonalCategoryColorService } from '../services/personal-category-color.service';
import type { PrayerService } from '../services/prayer.service';
import type { ToastService } from '../services/toast.service';

export type RenamePersonalCategoryWithColorsResult =
  | { status: 'success' }
  | { status: 'failed' }
  | { status: 'partial'; appliedCategory: string }
  | { status: 'cancelled' };

export type RenamePersonalCategoryWithColorsOptions = {
  /** Called after prayers rename succeeds (before color rename). */
  onPrayersRenamed?: (appliedCategory: string) => void;
  /** When true after prayers rename, rolls back prayers and returns cancelled. */
  isCancelled?: () => boolean;
};

/**
 * Renames a personal category on prayers and saved colors. Rolls back prayer
 * renames when the color update fails so callers do not report full success.
 */
export async function renamePersonalCategoryWithColors(
  prayerService: PrayerService,
  personalCategoryColorService: PersonalCategoryColorService,
  toastService: ToastService,
  oldCategory: string,
  newCategory: string,
  options?: RenamePersonalCategoryWithColorsOptions
): Promise<RenamePersonalCategoryWithColorsResult> {
  const colorNames = Object.keys(
    personalCategoryColorService.getColorsSnapshot()
  );
  const renamed = await prayerService.renamePersonalCategory(
    oldCategory,
    newCategory,
    { reservedCategoryNames: colorNames }
  );
  if (!renamed) {
    return { status: 'failed' };
  }

  options?.onPrayersRenamed?.(newCategory);

  if (options?.isCancelled?.()) {
    const rolledBack = await prayerService.renamePersonalCategory(
      newCategory,
      oldCategory
    );
    if (rolledBack) {
      return { status: 'cancelled' };
    }
    toastService.error(
      'Could not undo the category rename. Please refresh and try again.'
    );
    return { status: 'partial', appliedCategory: newCategory };
  }

  const colorsRenamed = await personalCategoryColorService.renameCategory(
    oldCategory,
    newCategory
  );
  if (colorsRenamed) {
    return { status: 'success' };
  }

  const rolledBack = await prayerService.renamePersonalCategory(
    newCategory,
    oldCategory
  );
  if (rolledBack) {
    toastService.error('Failed to rename category. Changes were reverted.');
    return { status: 'failed' };
  }

  toastService.error(
    'Prayers were renamed but the category color could not be updated. Please refresh and try again.'
  );
  return { status: 'partial', appliedCategory: newCategory };
}
