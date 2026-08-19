import type {
  BadgeCachedItem,
  BadgeItemType,
  BadgePrayerStatus,
  BadgeReadPrayersData,
  BadgeReadPromptsData,
} from './badge-types';

export function mergeUniqueIds(existing: string[], ids: string[]): string[] {
  return Array.from(new Set([...existing, ...ids]));
}

export function collectBadgeUpdateIdsFromItems(items: BadgeCachedItem[]): string[] {
  const allUpdateIds: string[] = [];

  items.forEach((item) => {
    if (item.updates && Array.isArray(item.updates)) {
      item.updates.forEach((update) => {
        if (update.id && !allUpdateIds.includes(update.id)) {
          allUpdateIds.push(update.id);
        }
      });
    }
  });

  return allUpdateIds;
}

export function appendUpdateIdsToReadPrayersData(
  data: BadgeReadPrayersData,
  updateIds: string[]
): BadgeReadPrayersData {
  if (updateIds.length === 0) {
    return data;
  }
  return {
    ...data,
    updates: mergeUniqueIds(data.updates, updateIds),
  };
}

export function appendUpdateIdsToReadPromptsData(
  data: BadgeReadPromptsData,
  updateIds: string[]
): BadgeReadPromptsData {
  if (updateIds.length === 0) {
    return data;
  }
  return {
    ...data,
    updates: mergeUniqueIds(data.updates, updateIds),
  };
}

export function appendItemUpdateIdsToReadPrayersData(
  item: BadgeCachedItem,
  data: BadgeReadPrayersData
): BadgeReadPrayersData {
  if (!item.updates || !Array.isArray(item.updates)) {
    return data;
  }

  const next = { ...data, updates: [...data.updates] };
  item.updates.forEach((update) => {
    if (update.id && !next.updates.includes(update.id)) {
      next.updates.push(update.id);
    }
  });
  return next;
}

export function appendItemUpdateIdsToReadPromptsData(
  item: BadgeCachedItem,
  data: BadgeReadPromptsData
): BadgeReadPromptsData {
  if (!item.updates || !Array.isArray(item.updates)) {
    return data;
  }

  const next = { ...data, updates: [...data.updates] };
  item.updates.forEach((update) => {
    if (update.id && !next.updates.includes(update.id)) {
      next.updates.push(update.id);
    }
  });
  return next;
}

export function calculateBadgeCount(
  items: BadgeCachedItem[],
  type: BadgeItemType,
  readPrayers: BadgeReadPrayersData,
  readPrompts: BadgeReadPromptsData,
  status?: BadgePrayerStatus
): number {
  const readIds =
    type === 'prayers' ? readPrayers.prayers : readPrompts.prompts;
  const readUpdateIds =
    type === 'prayers' ? readPrayers.updates : readPrompts.updates;

  let count = 0;

  items.forEach((item) => {
    if (status && item.status !== status) {
      return;
    }

    if (!readIds.includes(item.id)) {
      count++;
    }

    if (item.updates && Array.isArray(item.updates)) {
      item.updates.forEach((update) => {
        if (!readUpdateIds.includes(update.id)) {
          count++;
        }
      });
    }
  });

  return count;
}

export function checkIndividualBadgeForItem(
  items: BadgeCachedItem[],
  type: BadgeItemType,
  id: string,
  readPrayers: BadgeReadPrayersData,
  readPrompts: BadgeReadPromptsData
): boolean {
  const item = items.find((entry) => entry.id === id);
  if (!item) {
    return false;
  }

  const readIds =
    type === 'prayers' ? readPrayers.prayers : readPrompts.prompts;
  return !readIds.includes(id);
}

export function getBadgeUnreadIds(
  items: BadgeCachedItem[],
  type: BadgeItemType,
  readPrayers: BadgeReadPrayersData,
  readPrompts: BadgeReadPromptsData
): string[] {
  const readIds =
    type === 'prayers' ? readPrayers.prayers : readPrompts.prompts;

  return items.filter((item) => !readIds.includes(item.id)).map((item) => item.id);
}

export function isBadgePrayerUnread(
  prayerId: string,
  readPrayers: BadgeReadPrayersData
): boolean {
  return !readPrayers.prayers.includes(prayerId);
}

export function isBadgePromptUnread(
  promptId: string,
  readPrompts: BadgeReadPromptsData
): boolean {
  return !readPrompts.prompts.includes(promptId);
}

export function isBadgeUpdateUnread(
  updateId: string,
  readPrayers: BadgeReadPrayersData
): boolean {
  return !readPrayers.updates.includes(updateId);
}
