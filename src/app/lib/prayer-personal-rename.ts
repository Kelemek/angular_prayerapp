import {
  buildPersonalCategoryRenameDbPayload,
  personalPrayerIdsWithTrimmedCategory,
} from './prayer-personal-category';

export function matchingPersonalPrayerIdsForCategoryRename(
  rows: Array<{ id: string; category: string | null }>,
  oldName: string
): string[] {
  return personalPrayerIdsWithTrimmedCategory(rows, oldName);
}

export function hasPersonalCategoryRenameTargets(matchingIds: string[]): boolean {
  return matchingIds.length > 0;
}

export function personalCategoryRenameDbPayload(newName: string): Record<string, unknown> {
  return buildPersonalCategoryRenameDbPayload(newName);
}
