import { normalizePersonalCategoryHexColor } from '../../utils/personalCategoryColor';

export const DEFAULT_PRAYER_GROUP_COLOR = '#2563EB';

export function normalizePrayerGroupColor(
  color: string | null | undefined,
): string {
  return (
    normalizePersonalCategoryHexColor(color) ?? DEFAULT_PRAYER_GROUP_COLOR
  );
}
