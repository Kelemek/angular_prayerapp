import { mergeUniqueIds } from './badge-count';
import type { BadgeReadPrayersData, BadgeReadPromptsData } from './badge-types';

export interface BadgeReadStateSnapshot {
  prayersData: BadgeReadPrayersData;
  promptsData: BadgeReadPromptsData;
}

export function normalizeBadgeReadPrayersData(
  value: unknown
): BadgeReadPrayersData {
  if (!value || typeof value !== 'object') {
    return { prayers: [], updates: [] };
  }

  const record = value as Record<string, unknown>;
  return {
    prayers: Array.isArray(record['prayers'])
      ? record['prayers'].filter((id): id is string => typeof id === 'string')
      : [],
    updates: Array.isArray(record['updates'])
      ? record['updates'].filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export function normalizeBadgeReadPromptsData(
  value: unknown
): BadgeReadPromptsData {
  if (!value || typeof value !== 'object') {
    return { prompts: [], updates: [] };
  }

  const record = value as Record<string, unknown>;
  return {
    prompts: Array.isArray(record['prompts'])
      ? record['prompts'].filter((id): id is string => typeof id === 'string')
      : [],
    updates: Array.isArray(record['updates'])
      ? record['updates'].filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export function mergeBadgeReadPrayersData(
  local: BadgeReadPrayersData,
  remote: BadgeReadPrayersData
): BadgeReadPrayersData {
  return {
    prayers: mergeUniqueIds(local.prayers, remote.prayers),
    updates: mergeUniqueIds(local.updates, remote.updates),
  };
}

export function mergeBadgeReadPromptsData(
  local: BadgeReadPromptsData,
  remote: BadgeReadPromptsData
): BadgeReadPromptsData {
  return {
    prompts: mergeUniqueIds(local.prompts, remote.prompts),
    updates: mergeUniqueIds(local.updates, remote.updates),
  };
}

export function mergeBadgeReadStateSnapshots(
  local: BadgeReadStateSnapshot,
  remote: BadgeReadStateSnapshot
): BadgeReadStateSnapshot {
  return {
    prayersData: mergeBadgeReadPrayersData(local.prayersData, remote.prayersData),
    promptsData: mergeBadgeReadPromptsData(local.promptsData, remote.promptsData),
  };
}

function badgeReadPrayersDataHasExtras(
  merged: BadgeReadPrayersData,
  baseline: BadgeReadPrayersData
): boolean {
  const baselinePrayers = new Set(baseline.prayers);
  const baselineUpdates = new Set(baseline.updates);
  return (
    merged.prayers.some((id) => !baselinePrayers.has(id)) ||
    merged.updates.some((id) => !baselineUpdates.has(id))
  );
}

function badgeReadPromptsDataHasExtras(
  merged: BadgeReadPromptsData,
  baseline: BadgeReadPromptsData
): boolean {
  const baselinePrompts = new Set(baseline.prompts);
  const baselineUpdates = new Set(baseline.updates);
  return (
    merged.prompts.some((id) => !baselinePrompts.has(id)) ||
    merged.updates.some((id) => !baselineUpdates.has(id))
  );
}

export function badgeReadStateNeedsUpsert(
  merged: BadgeReadStateSnapshot,
  remote: BadgeReadStateSnapshot
): boolean {
  return (
    badgeReadPrayersDataHasExtras(merged.prayersData, remote.prayersData) ||
    badgeReadPromptsDataHasExtras(merged.promptsData, remote.promptsData)
  );
}

export function badgeReadStateCacheKey(email: string): string {
  return `badgeReadState:${email.toLowerCase().trim()}`;
}
