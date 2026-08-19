import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { isPersonalPrayerDisplayOrderOnlyChange } from './prayer-personal-display';

export const PRAYER_REALTIME_CHANNEL_NAME = 'prayers-channel';

export type PostgresChangePayload = {
  eventType: string;
  old: Record<string, unknown>;
  new: Record<string, unknown>;
};

export type PrayerRealtimeReminderKind = 'community' | 'personal';

export function rowFromRealtimePayload(
  payload: PostgresChangePayload
): Record<string, unknown> | undefined {
  return payload.eventType === 'DELETE' ? payload.old : payload.new;
}

export function communityPrayerReminderDropFromPayload(
  payload: PostgresChangePayload
): { prayerId: string; kind: PrayerRealtimeReminderKind } | null {
  const row = rowFromRealtimePayload(payload) as { id?: string } | undefined;
  const prayerId = row?.id;
  if (!prayerId) {
    return null;
  }
  const status = (payload.new as { status?: string } | undefined)?.status;
  if (
    payload.eventType === 'DELETE' ||
    status === 'archived' ||
    status === 'answered'
  ) {
    return { prayerId, kind: 'community' };
  }
  return null;
}

export function personalPrayerReminderDropFromPayload(
  payload: PostgresChangePayload
): { prayerId: string; kind: PrayerRealtimeReminderKind } | null {
  const row = rowFromRealtimePayload(payload) as { id?: string } | undefined;
  const prayerId = row?.id;
  if (!prayerId) {
    return null;
  }
  const category = (payload.new as { category?: string } | undefined)?.category;
  if (payload.eventType === 'DELETE' || category === 'Answered') {
    return { prayerId, kind: 'personal' };
  }
  return null;
}

export function shouldReloadPersonalPrayersAfterRealtimePayload(
  payload: PostgresChangePayload
): boolean {
  if (payload.eventType !== 'UPDATE') {
    return true;
  }
  return !isPersonalPrayerDisplayOrderOnlyChange(payload.old, payload.new);
}

export function isRealtimeSubscriptionDisconnectedStatus(status: string): boolean {
  return status === 'CLOSED' || status === 'CHANNEL_ERROR';
}

export type PrayerCatalogRealtimeHandlers = {
  onPrayersChange: (payload: PostgresChangePayload) => void;
  onPrayerUpdatesChange: (payload: PostgresChangePayload) => void;
  onPersonalPrayersChange: (payload: PostgresChangePayload) => void;
  onSubscribeStatus?: (status: string) => void;
};

export function subscribePrayerCatalogRealtime(
  client: SupabaseClient,
  handlers: PrayerCatalogRealtimeHandlers
): RealtimeChannel {
  return client
    .channel(PRAYER_REALTIME_CHANNEL_NAME)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayers',
      },
      (payload) => {
        handlers.onPrayersChange(payload as PostgresChangePayload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayer_updates',
      },
      (payload) => {
        handlers.onPrayerUpdatesChange(payload as PostgresChangePayload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'personal_prayers',
      },
      (payload) => {
        handlers.onPersonalPrayersChange(payload as PostgresChangePayload);
      }
    )
    .subscribe((status) => {
      handlers.onSubscribeStatus?.(status);
    });
}
