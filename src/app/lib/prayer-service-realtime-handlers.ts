import {
  communityPrayerReminderDropFromPayload,
  isRealtimeSubscriptionDisconnectedStatus,
  personalPrayerReminderDropFromPayload,
  shouldReloadPersonalPrayersAfterRealtimePayload,
  type PostgresChangePayload,
  type PrayerCatalogRealtimeHandlers,
  type PrayerRealtimeReminderKind,
} from './prayer-service-realtime';

export type PrayerCatalogRealtimeHandlerDeps = {
  dropRemindersForPrayer?: (
    prayerId: string,
    kind: PrayerRealtimeReminderKind
  ) => void;
  reloadCommunityPrayers: () => Promise<void>;
  reloadPersonalPrayers: () => Promise<void>;
};

export function buildPrayerCatalogRealtimeHandlers(
  deps: PrayerCatalogRealtimeHandlerDeps
): PrayerCatalogRealtimeHandlers {
  return {
    onPrayersChange: (payload: PostgresChangePayload) => {
      console.log('[PrayerService] Prayer changed:', payload);
      const reminderDrop = communityPrayerReminderDropFromPayload(payload);
      if (reminderDrop) {
        deps.dropRemindersForPrayer?.(reminderDrop.prayerId, reminderDrop.kind);
      }
      deps.reloadCommunityPrayers().catch((err) => {
        console.error('[PrayerService] Error reloading after prayer change:', err);
      });
    },
    onPrayerUpdatesChange: (payload: PostgresChangePayload) => {
      console.log('[PrayerService] Prayer update changed:', payload);
      deps.reloadCommunityPrayers().catch((err) => {
        console.error('[PrayerService] Error reloading after update change:', err);
      });
    },
    onPersonalPrayersChange: (payload: PostgresChangePayload) => {
      const reminderDrop = personalPrayerReminderDropFromPayload(payload);
      if (reminderDrop) {
        deps.dropRemindersForPrayer?.(reminderDrop.prayerId, reminderDrop.kind);
      }
      if (!shouldReloadPersonalPrayersAfterRealtimePayload(payload)) {
        return;
      }
      deps.reloadPersonalPrayers().catch((err) => {
        console.error('[PrayerService] Error reloading after personal prayer change:', err);
      });
    },
    onSubscribeStatus: (status: string) => {
      console.log('[PrayerService] Realtime subscription status:', status);
      if (isRealtimeSubscriptionDisconnectedStatus(status)) {
        console.warn(
          '[PrayerService] Realtime subscription disconnected, will retry on next activity'
        );
      }
    },
  };
}
