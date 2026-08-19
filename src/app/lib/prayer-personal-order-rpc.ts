import {
  groupPersonalPrayersByCategory,
  interpretPersonalCategoryRpcMutation,
  personalPrayerOrderRpcArgs,
} from './prayer-personal-category';
import type { PrayerRequest } from './prayer-types';

export type PersonalPrayerOrderRpcResult =
  | { ok: true }
  | { ok: false; shouldFallback: true }
  | { ok: false; shouldFallback: false; message: string };

export async function runPersonalPrayerOrderRpcPerCategory(
  prayers: PrayerRequest[],
  userEmail: string,
  rpcReorder: (
    args: ReturnType<typeof personalPrayerOrderRpcArgs>
  ) => Promise<{ data: unknown; error: unknown }>
): Promise<PersonalPrayerOrderRpcResult> {
  const prayersByCategory = groupPersonalPrayersByCategory(prayers);

  for (const [category, categoryPrayers] of prayersByCategory) {
    const orderedPrayerIds = categoryPrayers.map((p) => p.id);
    const { data, error } = await rpcReorder(
      personalPrayerOrderRpcArgs(userEmail, orderedPrayerIds, category ?? null)
    );

    if (error) {
      return { ok: false, shouldFallback: true };
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const rpcResult = interpretPersonalCategoryRpcMutation(data);
      if (!rpcResult.ok) {
        return {
          ok: false,
          shouldFallback: false,
          message: rpcResult.message ?? 'Personal prayer reorder failed',
        };
      }
      if (rpcResult.logMessage) {
        console.log('[PrayerService]', rpcResult.logMessage);
      }
    }
  }

  return { ok: true };
}
