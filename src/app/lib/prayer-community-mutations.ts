import type { CategoryDisplayOrderRange } from './prayer-personal-category';
import type { PrayerRequest, PrayerStatus, PrayerUpdate } from './prayer-types';

export const PERSONAL_ANSWERED_CATEGORY = 'Answered';

export type CommunityPrayerSubmitInput = Pick<
  PrayerRequest,
  'title' | 'description' | 'status' | 'requester' | 'prayer_for' | 'email' | 'is_anonymous'
>;

export function buildCommunityPrayerInsertRow(
  prayer: CommunityPrayerSubmitInput
): Record<string, unknown> {
  return {
    title: prayer.title,
    description: prayer.description,
    status: prayer.status,
    requester: prayer.requester,
    prayer_for: prayer.prayer_for,
    approval_status: 'pending',
    email: prayer.email || null,
    is_anonymous: prayer.is_anonymous || false,
  };
}

export function normalizeSubscriberEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function buildEmailSubscriberInsertRow(
  name: string,
  email: string
): Record<string, unknown> {
  return {
    name,
    email: normalizeSubscriberEmail(email),
    is_active: true,
    is_admin: false,
  };
}

export function patchCommunityPrayerStatus(
  prayers: PrayerRequest[],
  id: string,
  status: PrayerStatus
): PrayerRequest[] {
  const date_answered = status === 'answered' ? new Date().toISOString() : null;
  return prayers.map((p) => (p.id === id ? { ...p, status, date_answered } : p));
}

export function removeCommunityPrayerById(prayers: PrayerRequest[], id: string): PrayerRequest[] {
  return prayers.filter((p) => p.id !== id);
}

export function shouldDropCommunityReminderForStatus(status: PrayerStatus): boolean {
  return status === 'archived' || status === 'answered';
}

export function buildCommunityPrayerStatusUpdatePayload(
  status: PrayerStatus
): Record<string, unknown> {
  return {
    status,
    date_answered: status === 'answered' ? new Date().toISOString() : null,
  };
}

export function buildCommunityPrayerAdminNotificationPayload(
  prayer: Pick<PrayerRequest, 'title' | 'description' | 'requester'>,
  requestId: string
): {
  type: 'prayer';
  title: string;
  description: string;
  requester: string;
  requestId: string;
} {
  return {
    type: 'prayer',
    title: prayer.title,
    description: prayer.description,
    requester: prayer.requester,
    requestId,
  };
}

export function buildCommunityUpdateAdminNotificationPayload(
  prayerTitle: string,
  author: string,
  content: string,
  requestId: string
): {
  type: 'update';
  title: string;
  author: string;
  content: string;
  requestId: string;
} {
  return {
    type: 'update',
    title: prayerTitle,
    author,
    content,
    requestId,
  };
}

export function communityPendingUpdateAdminNotification(
  prayerTitle: string | undefined,
  author: string,
  content: string,
  updateId: string
): ReturnType<typeof buildCommunityUpdateAdminNotificationPayload> | null {
  if (!prayerTitle) {
    return null;
  }
  return buildCommunityUpdateAdminNotificationPayload(
    prayerTitle,
    author,
    content,
    updateId
  );
}

export function dispatchCommunityPendingUpdateAdminNotification(
  prayerTitle: string | undefined,
  author: string,
  content: string,
  updateId: string,
  onNotify: (
    payload: ReturnType<typeof buildCommunityUpdateAdminNotificationPayload>
  ) => void | Promise<void>
): void {
  const payload = communityPendingUpdateAdminNotification(
    prayerTitle,
    author,
    content,
    updateId
  );
  if (!payload) {
    return;
  }
  Promise.resolve(onNotify(payload)).catch((err) =>
    console.error('Failed to send admin notification:', err)
  );
}

export async function afterCommunityPendingUpdateInserted(
  prayerId: string,
  author: string,
  content: string,
  updateId: string,
  fetchPrayerTitle: (prayerId: string) => Promise<string | undefined>,
  onNotify: (
    payload: ReturnType<typeof buildCommunityUpdateAdminNotificationPayload>
  ) => void | Promise<void>
): Promise<void> {
  const prayerTitle = await fetchPrayerTitle(prayerId);
  dispatchCommunityPendingUpdateAdminNotification(
    prayerTitle,
    author,
    content,
    updateId,
    onNotify
  );
}

export function removeCommunityPrayerFromBothLists(
  filteredPrayers: PrayerRequest[],
  allPrayers: PrayerRequest[],
  id: string
): { filtered: PrayerRequest[]; all: PrayerRequest[] } {
  return {
    filtered: removeCommunityPrayerById(filteredPrayers, id),
    all: removeCommunityPrayerById(allPrayers, id),
  };
}

export function applyCommunityPrayerDeleteSnapshot(
  filteredPrayers: PrayerRequest[],
  allPrayers: PrayerRequest[],
  id: string,
  actions: {
    setFilteredPrayers: (prayers: PrayerRequest[]) => void;
    setAllPrayers: (prayers: PrayerRequest[]) => void;
    setCache: (prayers: PrayerRequest[]) => void;
    reapplyFilters: () => void;
    refreshBadges: () => void;
    dropReminders: (prayerId: string) => void;
  }
): void {
  const { filtered, all } = removeCommunityPrayerFromBothLists(
    filteredPrayers,
    allPrayers,
    id
  );
  actions.setFilteredPrayers(filtered);
  actions.setAllPrayers(all);
  actions.setCache(all);
  actions.reapplyFilters();
  actions.refreshBadges();
  actions.dropReminders(id);
}

export async function ensureEmailSubscriberForPrayerSubmit(
  requester: string,
  email: string,
  findExistingSubscriber: (normalizedEmail: string) => Promise<{ id: string } | null>,
  insertSubscriber: (row: Record<string, unknown>) => Promise<void>
): Promise<void> {
  const normalized = normalizeSubscriberEmail(email);
  const existing = await findExistingSubscriber(normalized);
  if (!existing) {
    await insertSubscriber(buildEmailSubscriberInsertRow(requester, email));
  }
}

export type CommunityUpdateSubmitData = {
  prayer_id: string;
  content: string;
  author: string;
  author_email?: string;
  is_anonymous?: boolean;
  mark_as_answered?: boolean;
};

export function buildPendingCommunityUpdateInsertRow(
  updateData: CommunityUpdateSubmitData
): Record<string, unknown> {
  return {
    prayer_id: updateData.prayer_id,
    content: updateData.content,
    author: updateData.author,
    author_email: updateData.author_email,
    is_anonymous: updateData.is_anonymous,
    mark_as_answered: updateData.mark_as_answered,
    approval_status: 'pending',
  };
}

export function buildSimplePendingUpdateInsertRow(
  prayerId: string,
  content: string,
  author: string
): Record<string, unknown> {
  return {
    prayer_id: prayerId,
    content,
    author,
    approval_status: 'pending',
  };
}
