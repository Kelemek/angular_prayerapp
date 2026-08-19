import type { PersonalPrayerDisplayOrderUpdate } from './prayer-personal-category';

export function buildPersonalPrayerDisplayOrderDbPayload(
  displayOrder: number
): Record<string, unknown> {
  return { display_order: displayOrder };
}

export function firstSupabaseBatchError(
  results: Array<{ error: unknown | null }>
): unknown | null {
  const failed = results.find((r) => r.error);
  return failed?.error ?? null;
}

export async function runPersonalPrayerDisplayOrderBatchUpdates(
  updates: PersonalPrayerDisplayOrderUpdate[],
  runUpdate: (
    update: PersonalPrayerDisplayOrderUpdate
  ) => Promise<{ error: unknown | null }>
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const results = await Promise.all(updates.map((update) => runUpdate(update)));
  const batchError = firstSupabaseBatchError(results);
  if (batchError) {
    throw batchError;
  }
}
