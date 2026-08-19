import type { CategoryDisplayOrderRange } from './prayer-personal-category';
import type { PrayerRequest, PrayerStatus, PrayerUpdate } from './prayer-types';

export const PERSONAL_ANSWERED_CATEGORY = 'Answered';

export function personalPrayerStatusFromCategory(
  category: string | null | undefined
): PrayerStatus {
  return category === PERSONAL_ANSWERED_CATEGORY ? 'answered' : 'current';
}

export function isClearingPersonalAnsweredCategory(
  currentCategory: string | null | undefined,
  newCategory: string | null | undefined
): boolean {
  return (
    currentCategory === PERSONAL_ANSWERED_CATEGORY &&
    newCategory !== PERSONAL_ANSWERED_CATEGORY
  );
}

export function displayOrderAfterCategoryChange(
  maxDisplayOrderInRange: number | null | undefined,
  range: CategoryDisplayOrderRange
): number {
  const max =
    maxDisplayOrderInRange !== null && maxDisplayOrderInRange !== undefined
      ? maxDisplayOrderInRange
      : range.min - 1;
  return Math.min(max + 1, range.max);
}

export function buildPersonalPrayerDbUpdatePayload(
  updates: Partial<Pick<PrayerRequest, 'title' | 'prayer_for' | 'description' | 'category'>>,
  newCategory: string | null | undefined,
  categoryChanged: boolean,
  newDisplayOrder: number | undefined
): Record<string, unknown> {
  return {
    ...updates,
    category: newCategory,
    ...(categoryChanged &&
      newDisplayOrder !== undefined && { display_order: newDisplayOrder }),
    updated_at: new Date().toISOString(),
  };
}

export function applyPersonalPrayerFieldUpdate(
  prayers: PrayerRequest[],
  id: string,
  args: {
    updates: Partial<Pick<PrayerRequest, 'title' | 'prayer_for' | 'description' | 'category'>>;
    newCategory: string | null | undefined;
    newDisplayOrder: number | undefined;
    clearingAnswered: boolean;
    updatedAt: string;
  }
): PrayerRequest[] {
  return prayers.map((p) =>
    p.id === id
      ? {
          ...p,
          title: args.updates.title ?? p.title,
          prayer_for: args.updates.prayer_for ?? p.prayer_for,
          description: args.updates.description ?? p.description,
          category: args.newCategory,
          status: personalPrayerStatusFromCategory(args.newCategory),
          display_order: args.newDisplayOrder ?? p.display_order,
          updated_at: args.updatedAt,
          ...(args.clearingAnswered
            ? {
                updates: (p.updates || []).map((u) => ({
                  ...u,
                  mark_as_answered: false,
                })),
              }
            : {}),
        }
      : p
  );
}

export function removePersonalPrayerById(prayers: PrayerRequest[], id: string): PrayerRequest[] {
  return prayers.filter((p) => p.id !== id);
}

export function buildPersonalPrayerUpdateInsertRow(
  personalPrayerId: string,
  content: string,
  author: string,
  authorEmail: string,
  markAsAnswered: boolean
): Record<string, unknown> {
  return {
    personal_prayer_id: personalPrayerId,
    content,
    author,
    author_email: authorEmail,
    mark_as_answered: markAsAnswered,
  };
}

export function mapDbPersonalPrayerUpdateRow(
  personalPrayerId: string,
  row: {
    id: string;
    content: string;
    author: string;
    author_email?: string;
    mark_as_answered?: boolean;
    created_at: string;
  }
): PrayerUpdate {
  return {
    id: row.id,
    prayer_id: personalPrayerId,
    content: row.content,
    author: row.author,
    author_email: row.author_email,
    is_anonymous: false,
    mark_as_answered: row.mark_as_answered,
    created_at: row.created_at,
    approval_status: 'approved',
  };
}

export function appendPersonalPrayerUpdate(
  prayers: PrayerRequest[],
  personalPrayerId: string,
  newUpdate: PrayerUpdate
): PrayerRequest[] {
  return prayers.map((prayer) =>
    prayer.id === personalPrayerId
      ? { ...prayer, updates: [newUpdate, ...(prayer.updates || [])] }
      : prayer
  );
}

export function removePersonalPrayerUpdateById(
  prayers: PrayerRequest[],
  updateId: string
): PrayerRequest[] {
  return prayers.map((prayer) => ({
    ...prayer,
    updates: (prayer.updates || []).filter((u) => u.id !== updateId),
  }));
}

export function patchPersonalPrayerUpdateLocally(
  prayers: PrayerRequest[],
  prayerId: string,
  updateId: string,
  updates: Partial<Pick<PrayerUpdate, 'content' | 'mark_as_answered'>>
): PrayerRequest[] {
  return prayers.map((p) =>
    p.id === prayerId
      ? {
          ...p,
          updates: (p.updates || []).map((u) =>
            u.id === updateId
              ? {
                  ...u,
                  content: updates.content ?? u.content,
                  mark_as_answered:
                    updates.mark_as_answered !== undefined
                      ? updates.mark_as_answered
                      : u.mark_as_answered,
                }
              : u
          ),
        }
      : p
  );
}

export function personalPrayerUpdatePatchWithTimestamp(
  updates: Partial<Pick<PrayerUpdate, 'content' | 'mark_as_answered'>>
): Record<string, unknown> {
  return { ...updates, updated_at: new Date().toISOString() };
}

export function markPersonalPrayerUpdateAnsweredPatch(): Record<string, unknown> {
  return { mark_as_answered: true, updated_at: new Date().toISOString() };
}

export function buildPersonalPrayerInsertRow(
  prayer: Pick<PrayerRequest, 'title' | 'description' | 'prayer_for'>,
  category: string | null,
  userEmail: string,
  displayOrder: number
): Record<string, unknown> {
  return {
    title: prayer.title,
    description: prayer.description,
    prayer_for: prayer.prayer_for,
    category,
    user_email: userEmail,
    display_order: displayOrder,
  };
}

export function maxDisplayOrderFromCategoryQuery(
  maxError: unknown,
  maxData: { display_order?: number | null } | null,
  rangeMin: number
): number {
  if (
    !maxError &&
    maxData?.display_order !== null &&
    maxData?.display_order !== undefined
  ) {
    return maxData.display_order;
  }
  return rangeMin - 1;
}

export function personalPrayerRequestFromInsertedRow(
  data: {
    id: string;
    title: string;
    description: string;
    prayer_for: string;
    category: string | null;
    created_at: string;
    updated_at: string;
    display_order?: number | null;
  },
  userEmail: string,
  fallbackDisplayOrder: number
): PrayerRequest {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: 'current',
    prayer_for: data.prayer_for,
    category: data.category,
    requester: userEmail,
    email: userEmail,
    is_anonymous: false,
    date_requested: data.created_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    approval_status: 'approved',
    type: 'prayer',
    updates: [],
    display_order: data.display_order || fallbackDisplayOrder,
    prayed_for_count: 0,
  };
}

export function prependPersonalPrayerToList(
  prayers: PrayerRequest[],
  newPrayer: PrayerRequest
): PrayerRequest[] {
  return [newPrayer, ...prayers];
}

export function personalPrayerListAfterInsert(
  prayers: PrayerRequest[],
  insertedRow: unknown,
  userEmail: string,
  displayOrder: number,
  mapInsertedRow: (row: unknown, email: string, order: number) => PrayerRequest,
  withUserEmail: (prayer: PrayerRequest) => PrayerRequest
): PrayerRequest[] {
  const newPrayer = withUserEmail(
    mapInsertedRow(insertedRow, userEmail, displayOrder)
  );
  return prependPersonalPrayerToList(prayers, newPrayer);
}
