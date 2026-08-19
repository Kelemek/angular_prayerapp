import {
  personalCategoryReorderRpcArgs,
  personalCategorySwapRpcArgs,
  validatePersonalCategorySwapInputs,
  applyPersonalCategoryRenameLocally,
  type CategoryDisplayOrderRange,
  type PersonalPrayerDisplayOrderUpdate,
} from './prayer-personal-category';
import {
  applyPersonalCategoryReorderLocally,
  applyPersonalCategorySwapLocally,
} from './prayer-personal-display';
import {
  applyCategorySwapFallbackSteps,
  buildCategorySwapFallbackPlan,
  categoryReorderFallbackUpdates,
  collectPersonalPrayerOrderFallbackUpdates,
} from './prayer-personal-order-fallback';
import { runPersonalPrayerOrderRpcPerCategory } from './prayer-personal-order-rpc';
import {
  logPersonalCategoryRpcMessage,
  runPersonalCategoryMutationRpc,
} from './prayer-personal-category-rpc';
import type { PrayerRequest } from './prayer-types';

export type PersonalCategoryLocalActions = {
  getPrayers: () => PrayerRequest[];
  setPrayers: (prayers: PrayerRequest[]) => void;
};

export type PersonalCategoryOrchestrationDeps = {
  getUserEmail: () => Promise<string | null>;
  local: PersonalCategoryLocalActions;
  runCategoryRpc: (
    rpcName: 'reorder_personal_prayer_categories' | 'swap_personal_prayer_categories',
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: unknown }>;
  runPrayerOrderRpc: (
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: unknown }>;
  applyDisplayOrderUpdates: (
    updates: PersonalPrayerDisplayOrderUpdate[],
    options?: { matchUserEmail?: boolean }
  ) => Promise<void>;
  getCategoryRange: (category: string | null | undefined) => Promise<CategoryDisplayOrderRange>;
};

export function applyPersonalCategoryRenameSnapshot(
  actions: PersonalCategoryLocalActions,
  oldName: string,
  newName: string
): void {
  actions.setPrayers(
    applyPersonalCategoryRenameLocally(actions.getPrayers(), oldName, newName)
  );
}

function applyPersonalCategorySwapSnapshot(
  actions: PersonalCategoryLocalActions,
  categoryA: string,
  categoryB: string
): void {
  const sorted = applyPersonalCategorySwapLocally(
    actions.getPrayers(),
    categoryA,
    categoryB
  );
  if (sorted) {
    actions.setPrayers(sorted);
  }
}

function applyPersonalCategoryReorderSnapshot(
  actions: PersonalCategoryLocalActions,
  orderedCategories: (string | null)[]
): void {
  actions.setPrayers(
    applyPersonalCategoryReorderLocally(actions.getPrayers(), orderedCategories)
  );
}

async function reorderCategoriesFallback(
  orderedCategories: (string | null)[],
  deps: PersonalCategoryOrchestrationDeps
): Promise<boolean> {
  try {
    console.log('[PrayerService] Using fallback method for category reorder');

    const userEmail = await deps.getUserEmail();
    if (!userEmail) {
      return false;
    }

    const updates = categoryReorderFallbackUpdates(
      orderedCategories,
      deps.local.getPrayers()
    );
    await deps.applyDisplayOrderUpdates(updates);
    applyPersonalCategoryReorderSnapshot(deps.local, orderedCategories);
    return true;
  } catch (error) {
    console.error('[PrayerService] Fallback reorder failed:', error);
    return false;
  }
}

async function swapCategoryRangesFallback(
  categoryA: string,
  categoryB: string,
  deps: PersonalCategoryOrchestrationDeps
): Promise<boolean> {
  try {
    console.log('[PrayerService] Using fallback method for category swap');

    const userEmail = await deps.getUserEmail();
    if (!userEmail) {
      return false;
    }

    const steps = buildCategorySwapFallbackPlan(
      deps.local.getPrayers(),
      categoryA,
      categoryB
    );
    if (!steps) {
      return true;
    }

    await applyCategorySwapFallbackSteps(steps, (updates) =>
      deps.applyDisplayOrderUpdates(updates)
    );
    applyPersonalCategorySwapSnapshot(deps.local, categoryA, categoryB);
    return true;
  } catch (error) {
    console.error('[PrayerService] Fallback swap failed:', error);
    return false;
  }
}

async function updatePersonalPrayerOrderFallback(
  prayers: PrayerRequest[],
  deps: PersonalCategoryOrchestrationDeps
): Promise<boolean> {
  try {
    console.log('[PrayerService] Using fallback method for prayer order update');

    const userEmail = await deps.getUserEmail();
    if (!userEmail) {
      return false;
    }

    const updates = await collectPersonalPrayerOrderFallbackUpdates(
      prayers,
      (category) => deps.getCategoryRange(category)
    );
    await deps.applyDisplayOrderUpdates(updates, { matchUserEmail: true });
    return true;
  } catch (error) {
    console.error('[PrayerService] Fallback prayer order update failed:', error);
    return false;
  }
}

export async function orchestratePersonalCategoryReorder(
  orderedCategories: (string | null)[],
  deps: PersonalCategoryOrchestrationDeps
): Promise<boolean> {
  try {
    const userEmail = await deps.getUserEmail();
    if (!userEmail) {
      console.error('[PrayerService] User email not available for category reorder');
      return false;
    }

    const rpcArgs = personalCategoryReorderRpcArgs(userEmail, orderedCategories);
    if (rpcArgs.p_ordered_categories.length === 0) {
      console.warn('[PrayerService] No valid categories to reorder');
      return true;
    }

    const rpcResult = await runPersonalCategoryMutationRpc(
      () => deps.runCategoryRpc('reorder_personal_prayer_categories', rpcArgs),
      'Reorder categories failed'
    );

    if (!rpcResult.ok) {
      if (rpcResult.shouldFallback) {
        console.error('[PrayerService] RPC error reordering categories');
        return await reorderCategoriesFallback(orderedCategories, deps);
      }
      console.error('[PrayerService] Reorder failed:', rpcResult.message);
      return false;
    }

    logPersonalCategoryRpcMessage(rpcResult.logMessage);
    applyPersonalCategoryReorderSnapshot(deps.local, orderedCategories);
    return true;
  } catch (error) {
    console.error('[PrayerService] Error reordering categories:', error);
    return await reorderCategoriesFallback(orderedCategories, deps);
  }
}

export async function orchestratePersonalCategorySwap(
  categoryA: string | null | undefined,
  categoryB: string | null | undefined,
  deps: PersonalCategoryOrchestrationDeps
): Promise<boolean> {
  const userEmail = await deps.getUserEmail();
  const validation = validatePersonalCategorySwapInputs(userEmail, categoryA, categoryB);

  if (!validation.ok) {
    if (validation.reason === 'no_email') {
      console.error('[PrayerService] User email not available for category swap');
    } else {
      console.error('[PrayerService] Both categories required for swap');
    }
    return false;
  }

  try {
    const rpcArgs = personalCategorySwapRpcArgs(
      userEmail!,
      validation.categoryA,
      validation.categoryB
    );
    const rpcResult = await runPersonalCategoryMutationRpc(
      () => deps.runCategoryRpc('swap_personal_prayer_categories', rpcArgs),
      'Swap categories failed'
    );

    if (!rpcResult.ok) {
      if (rpcResult.shouldFallback) {
        console.error('[PrayerService] RPC error swapping categories');
        return await swapCategoryRangesFallback(
          validation.categoryA,
          validation.categoryB,
          deps
        );
      }
      console.error('[PrayerService] Swap failed:', rpcResult.message);
      return false;
    }

    logPersonalCategoryRpcMessage(rpcResult.logMessage);
    applyPersonalCategorySwapSnapshot(
      deps.local,
      validation.categoryA,
      validation.categoryB
    );
    return true;
  } catch (error) {
    console.error('[PrayerService] Exception swapping categories:', error);
    return await swapCategoryRangesFallback(
      validation.categoryA,
      validation.categoryB,
      deps
    );
  }
}

export async function orchestratePersonalPrayerOrderUpdate(
  prayers: PrayerRequest[],
  deps: PersonalCategoryOrchestrationDeps
): Promise<boolean> {
  try {
    const userEmail = await deps.getUserEmail();
    if (!userEmail) {
      console.error('[PrayerService] User email not available for order update');
      return false;
    }

    const rpcResult = await runPersonalPrayerOrderRpcPerCategory(
      prayers,
      userEmail,
      (args) => deps.runPrayerOrderRpc(args)
    );

    if (!rpcResult.ok) {
      if (rpcResult.shouldFallback) {
        return await updatePersonalPrayerOrderFallback(prayers, deps);
      }
      console.error('[PrayerService] Reorder prayers failed:', rpcResult.message);
      return false;
    }

    console.log('[PrayerService] Personal prayer order updated successfully');
    return true;
  } catch (error) {
    console.error('[PrayerService] Error updating personal prayer order:', error);
    return await updatePersonalPrayerOrderFallback(prayers, deps);
  }
}
