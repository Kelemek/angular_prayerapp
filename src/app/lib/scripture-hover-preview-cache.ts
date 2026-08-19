import type { ScripturePassage } from '../services/scripture.service';
import { stripNonTypableScriptureMarks } from './memorization/strip-scripture-for-memorization';
import type { BibleTranslation } from '../types/memorization';

const passageCache = new Map<string, ScripturePassage>();

/** At most one body-ported preview should be open at a time. */
let exclusivePreviewToken = 0;
let dismissExclusivePreview: { token: number; dismiss: () => void } | null = null;

export function scriptureHoverPreviewCacheKey(
  reference: string,
  translation: BibleTranslation
): string {
  return `${translation}:${reference.trim()}`;
}

/** Strip KJV pilcrows (etc.) so hover preview matches Memorize practice display. */
export function sanitizeScriptureHoverPreviewPassage(
  passage: ScripturePassage
): ScripturePassage {
  return {
    ...passage,
    text: stripNonTypableScriptureMarks(passage.text ?? ''),
  };
}

export function getCachedScriptureHoverPreviewPassage(
  key: string
): ScripturePassage | undefined {
  return passageCache.get(key);
}

export function setCachedScriptureHoverPreviewPassage(
  key: string,
  passage: ScripturePassage
): void {
  passageCache.set(key, passage);
}

export function claimScriptureHoverPreviewExclusive(dismiss: () => void): number {
  const previous = dismissExclusivePreview;
  dismissExclusivePreview = null;
  previous?.dismiss();

  const token = ++exclusivePreviewToken;
  dismissExclusivePreview = { token, dismiss };
  return token;
}

export function releaseScriptureHoverPreviewExclusive(token: number): void {
  if (dismissExclusivePreview?.token === token) {
    dismissExclusivePreview = null;
  }
}

/** Test helper: clear shared passage cache / exclusive preview between specs. */
export function clearScriptureHoverPreviewCacheForTests(): void {
  passageCache.clear();
  dismissExclusivePreview = null;
}
