import type { PromptService } from '../services/prompt.service';
import type { PrayerEncouragementService } from '../services/prayer-encouragement.service';

export interface PromptCardPrayForRunDeps {
  promptService: PromptService;
  prayerEncouragementService: PrayerEncouragementService;
}

/**
 * Records a Pray For click on a prompt and increments the per-user count when allowed.
 */
export async function runPromptCardPrayFor(
  deps: PromptCardPrayForRunDeps,
  promptId: string
): Promise<number | null> {
  const usePersonalCooldown = true;
  if (!deps.prayerEncouragementService.canPrayFor(promptId, usePersonalCooldown)) {
    return null;
  }

  deps.prayerEncouragementService.recordPrayedFor(promptId, usePersonalCooldown);
  const newCount = await deps.promptService.incrementPromptPrayedFor(promptId);

  if (newCount === null) {
    deps.prayerEncouragementService.clearPrayedForCooldown(
      promptId,
      usePersonalCooldown
    );
  }

  return newCount;
}
