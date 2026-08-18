import type { BadgeService } from '../services/badge.service';

export function markUserSettingsAllItemsAsRead(badgeService: BadgeService): void {
  try {
    const prayersCache = localStorage.getItem('prayers_cache');
    const promptsCache = localStorage.getItem('prompts_cache');

    if (prayersCache) {
      const parsedCache = JSON.parse(prayersCache);
      const prayers = parsedCache?.data || parsedCache || [];
      if (Array.isArray(prayers)) {
        const prayerIds = prayers.map((p: { id: string }) => p.id);
        const updateIds = prayers.flatMap(
          (p: { updates?: Array<{ id: string }> }) =>
            p.updates?.map((u) => u.id) || [],
        );

        const readData = localStorage.getItem('read_prayers_data');
        const data = readData
          ? JSON.parse(readData)
          : { prayers: [], updates: [] };
        data.prayers = Array.from(new Set([...data.prayers, ...prayerIds]));
        data.updates = Array.from(new Set([...data.updates, ...updateIds]));
        localStorage.setItem('read_prayers_data', JSON.stringify(data));
      }
    }

    if (promptsCache) {
      const parsedCache = JSON.parse(promptsCache);
      const prompts = parsedCache?.data || parsedCache || [];
      if (Array.isArray(prompts)) {
        const promptIds = prompts.map((p: { id: string }) => p.id);
        const updateIds = prompts.flatMap(
          (p: { updates?: Array<{ id: string }> }) =>
            p.updates?.map((u) => u.id) || [],
        );

        const readData = localStorage.getItem('read_prompts_data');
        const data = readData
          ? JSON.parse(readData)
          : { prompts: [], updates: [] };
        data.prompts = Array.from(new Set([...data.prompts, ...promptIds]));
        data.updates = Array.from(new Set([...data.updates, ...updateIds]));
        localStorage.setItem('read_prompts_data', JSON.stringify(data));
      }
    }

    badgeService.refreshBadgeCounts();
  } catch (err) {
    console.error('Error marking all items as read:', err);
  }
}
