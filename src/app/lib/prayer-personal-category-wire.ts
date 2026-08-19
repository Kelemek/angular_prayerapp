import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalCategoryDeps } from "./prayer-personal-add-plan";
import {
  type CategoryDisplayOrderRange,
  type PersonalPrayerDisplayOrderUpdate,
} from "./prayer-personal-category";
import type { PersonalCategoryOrchestrationDeps } from "./prayer-personal-category-orchestrate";
import {
  fetchAllPersonalCategoryDisplayOrderRows,
  fetchPersonalCategoryDisplayOrderRows,
  fetchPersonalCategoryIdRows,
  fetchPersonalCategoryPrayerCountWithDb,
  queryMaxDisplayOrderInPersonalCategoryRange,
  resolvePersonalCategoryRangeWithDb,
} from "./prayer-personal-category-query-db";
import {
  buildPersonalPrayerDisplayOrderDbPayload,
  runPersonalPrayerDisplayOrderBatchUpdates,
} from "./prayer-personal-display-order";
import { PRAYER_PERSONAL_UNCATEGORIZED_MAX } from "./prayer-personal-display";
import type { PrayerRequest } from "./prayer-types";

export type PersonalCategoryQueryWireDeps = {
  client: SupabaseClient;
  getUserEmail: () => Promise<string | null>;
};

export function createPersonalCategoryDeps(
  deps: PersonalCategoryQueryWireDeps,
  getCategoryCount: (category: string | null | undefined) => Promise<number>,
  getCategoryRange: (
    category: string | null | undefined
  ) => Promise<CategoryDisplayOrderRange>
): PersonalCategoryDeps {
  return {
    getCategoryCount: (category) => getCategoryCount(category),
    getCategoryRange: (category) => getCategoryRange(category),
    queryMaxDisplayOrderInRange: (email, category, range) =>
      queryMaxDisplayOrderInPersonalCategoryRange(
        deps.client,
        email,
        category,
        range
      ),
  };
}

export async function fetchPersonalCategoryRangeForUser(
  deps: PersonalCategoryQueryWireDeps,
  category: string | null | undefined
): Promise<CategoryDisplayOrderRange> {
  const userEmail = await deps.getUserEmail();
  return resolvePersonalCategoryRangeWithDb(
    category,
    userEmail,
    (email, categoryEq) =>
      fetchPersonalCategoryDisplayOrderRows(deps.client, email, categoryEq),
    (email, minDisplayOrder) =>
      fetchAllPersonalCategoryDisplayOrderRows(
        deps.client,
        email,
        minDisplayOrder
      ),
    PRAYER_PERSONAL_UNCATEGORIZED_MAX + 1
  );
}

export async function fetchPersonalCategoryPrayerCountForUser(
  deps: PersonalCategoryQueryWireDeps,
  category: string | null | undefined
): Promise<number> {
  const userEmail = await deps.getUserEmail();
  return fetchPersonalCategoryPrayerCountWithDb(
    userEmail,
    category,
    (email, categoryEq) =>
      fetchPersonalCategoryIdRows(deps.client, email, categoryEq)
  );
}

export async function applyPersonalPrayerDisplayOrderBatch(
  deps: PersonalCategoryQueryWireDeps,
  updates: PersonalPrayerDisplayOrderUpdate[],
  options?: { matchUserEmail?: boolean }
): Promise<void> {
  const userEmail = options?.matchUserEmail ? await deps.getUserEmail() : null;
  if (options?.matchUserEmail && !userEmail) {
    throw new Error("User email not available");
  }

  await runPersonalPrayerDisplayOrderBatchUpdates(updates, async (update) => {
    let query = deps.client
      .from("personal_prayers")
      .update(buildPersonalPrayerDisplayOrderDbPayload(update.displayOrder))
      .eq("id", update.prayerId);
    if (userEmail) {
      query = query.eq("user_email", userEmail);
    }
    const result = await query;
    return { error: result.error };
  });
}

export type PersonalCategoryOrchestrationWireInput = {
  queryDeps: PersonalCategoryQueryWireDeps;
  getUserEmail: () => Promise<string | null>;
  getPrayers: () => PrayerRequest[];
  setPrayers: (prayers: PrayerRequest[]) => void;
  getCategoryRange: (
    category: string | null | undefined
  ) => Promise<CategoryDisplayOrderRange>;
};

export function buildPersonalCategoryOrchestrationDeps(
  input: PersonalCategoryOrchestrationWireInput
): PersonalCategoryOrchestrationDeps {
  return {
    getUserEmail: () => input.getUserEmail(),
    local: {
      getPrayers: () => input.getPrayers(),
      setPrayers: (prayers) => input.setPrayers(prayers),
    },
    runCategoryRpc: async (rpcName, args) =>
      input.queryDeps.client.rpc(rpcName, args),
    runPrayerOrderRpc: async (args) =>
      input.queryDeps.client.rpc("reorder_personal_prayers", args),
    applyDisplayOrderUpdates: (updates, options) =>
      applyPersonalPrayerDisplayOrderBatch(
        input.queryDeps,
        updates,
        options
      ),
    getCategoryRange: (category) => input.getCategoryRange(category),
  };
}
