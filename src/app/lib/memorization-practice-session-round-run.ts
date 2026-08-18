const PRACTICE_SESSION_ERROR_FLASH_MS = 220;

import { combineLatest } from 'rxjs';
import { isRecitePracticeMode } from '../memorization-recite/integration';
import type {
  MemorizationInProgress,
  MemorizationInProgressSavePayload,
} from '../types/memorization';
import { pickRandomRoundAffirmation } from './memorization/memorizationEncouragementMessages';
import {
  ANDROID_SCROLL_CLAMP_MS,
  MAX_WRONG_BEFORE_REVEAL,
  hiddenTypingTokenIndices,
} from './memorization-practice-session-ui';
import { runPracticeSessionStopPassageAudio } from './memorization-practice-session-listen-run';
import { runPracticeSessionScheduleScrollToBlank } from './memorization-practice-session-scroll-run';
import type { MemorizationPracticeSessionFacadeBase } from './memorization-practice-session-facade-base';
import {
  buildInitialReorderSlotAssignment,
  firstLetterOfWord,
  pickReorderMovableIndices,
  seedRandom,
  stringToSeed,
} from './memorization/memorizationPracticeUtils';

export function runPracticeSessionStartRound(host: MemorizationPracticeSessionFacadeBase, r: number): void {

    host.roundAdvanceHandled = null;
    host.consecutiveWrong = 0;
    host.wrongAttemptsInRound = 0;
    host.roundCompletedWithErrors = false;
    host.pendingBetweenRoundsErrors = 0;
    host.deferFinalRoundUntilSessionInit = false;
    const seed = host.sessionSeed || host.item.id;
    if (host.practiceModeRef === 'reorder') {
      const n = host.reorderChunks.length;
      const movableArr = pickReorderMovableIndices(n, r, seed);
      const rng = seedRandom(stringToSeed(`${seed}-mem-reorder-assign-r${r}`));
      const assignment = buildInitialReorderSlotAssignment(n, movableArr, rng);
      if (host.memorizeAndroidHost) {
        host.androidScrollClampUntil = Date.now() + ANDROID_SCROLL_CLAMP_MS;
      }
      host.roundIndex = r;
      host.hasTypedInRound = false;
      host.reorderSlotChunkIds = assignment;
      host.reorderRoundMovableIndices = new Set(movableArr);
      host.hiddenIndices = new Set();
      host.revealed = new Set();
      host.firstLetterCueRevealedSlots = new Set();
      host.awaitingRoundAdvance = false;
      host.roundAffirmation = '';
      host.phase = 'practicing';
      return;
    }
    const hidden = hiddenTypingTokenIndices(host.practiceModeRef, r, seed, host.typableIndices);
    if (host.memorizeAndroidHost) {
      host.androidScrollClampUntil = Date.now() + ANDROID_SCROLL_CLAMP_MS;
    }
    host.roundIndex = r;
    host.hasTypedInRound = false;
    host.hiddenIndices = hidden;
    host.revealed = new Set();
    host.firstLetterCueRevealedSlots = new Set();
    host.awaitingRoundAdvance = false;
    host.roundAffirmation = '';
    host.phase = 'practicing';
    if (isRecitePracticeMode(host.practiceModeRef)) {
      host.recitePractice?.resetAttemptState();
    }
  
}

export function runPracticeSessionRevealFirstLetterCueForToken(host: MemorizationPracticeSessionFacadeBase, tokenIndex: number): void {

    if (host.practiceModeRef !== 'firstLetters') return;
    const slot = host.typableIndices.indexOf(tokenIndex);
    if (slot < 0) return;
    if (!host.firstLetterCueHiddenSlots.has(slot)) return;
    if (host.firstLetterCueRevealedSlots.has(slot)) return;
    const next = new Set(host.firstLetterCueRevealedSlots);
    next.add(slot);
    host.firstLetterCueRevealedSlots = next;
  
}

export function runPracticeSessionProcessKeystroke(host: MemorizationPracticeSessionFacadeBase, key: string): void {

    if (host.hintActive || host.phase !== 'practicing' || host.currentTargetIndex === null) return;
    if (key.length !== 1) return;
    const token = host.tokens[host.currentTargetIndex];
    if (!token || token.kind === 'punct') return;

    host.hasTypedInRound = true;

    if (token.kind === 'digit') {
      if (!/^[0-9]$/.test(key)) return;
      if (key === token.text) {
        runPracticeSessionClearFlashError(host);
        const idx = host.currentTargetIndex;
        runPracticeSessionRevealFirstLetterCueForToken(host, idx);
        const next = new Set(host.revealed);
        next.add(idx);
        host.revealed = next;
        host.consecutiveWrong = 0;
        host.correctKeystrokesTotal += 1;
        runPracticeSessionSyncMetricRefs(host);
      } else {
        runPracticeSessionHandleWrongKeystroke(host);
      }
    } else {
      if (!/^[a-zA-Z]$/.test(key)) return;
      const expected = firstLetterOfWord(token.text);
      if (!expected) return;
      if (key.toLowerCase() === expected) {
        runPracticeSessionClearFlashError(host);
        const idx = host.currentTargetIndex;
        runPracticeSessionRevealFirstLetterCueForToken(host, idx);
        const next = new Set(host.revealed);
        next.add(idx);
        host.revealed = next;
        host.consecutiveWrong = 0;
        host.correctKeystrokesTotal += 1;
        runPracticeSessionSyncMetricRefs(host);
      } else {
        runPracticeSessionHandleWrongKeystroke(host);
      }
    }
    runPracticeSessionCheckRoundCompletion(host);
    runPracticeSessionScheduleScrollToBlank(host);
    host.cdr.markForCheck();
  
}

export function runPracticeSessionHandleWrongKeystroke(host: MemorizationPracticeSessionFacadeBase): void {

    runPracticeSessionRecordWrongAttempt(host);
    host.consecutiveWrong += 1;
    runPracticeSessionTryAutoRevealAfterWrong(host, true);
    runPracticeSessionSyncMetricRefs(host);
    runPracticeSessionFlashErrorBriefly(host);
  
}

export function runPracticeSessionRecordWrongAttempt(host: MemorizationPracticeSessionFacadeBase): void {

    host.wrongAttemptsTotal += 1;
    host.wrongAttemptsInRound += 1;
  
}

export function runPracticeSessionSyncStrictModeFromSession(host: MemorizationPracticeSessionFacadeBase): void {

    runPracticeSessionRefreshStrictModeFromSession(host);
  
}

export function runPracticeSessionRefreshStrictModeFromSession(host: MemorizationPracticeSessionFacadeBase): void {

    if (!host.userSessionService.isSessionInitialized()) return;
    const strict = host.userSessionService.getCurrentSession()?.memorizationStrictMode ?? false;
    runPracticeSessionApplyStrictModeFromSession(host, strict);
    runPracticeSessionReconcileFinalRoundAfterSessionLoad(host);
    // Session init can change showNextRoundOption even when strict mode stays false.
    host.cdr.markForCheck();
  
}

export function runPracticeSessionAttachStrictModeSessionSubscription(host: MemorizationPracticeSessionFacadeBase): void {

    runPracticeSessionDetachStrictModeSessionSubscription(host);
    host.strictModeSessionSub = combineLatest([
      host.userSessionService.userSession$,
      host.userSessionService.sessionInitialized$,
    ]).subscribe(() => {
      runPracticeSessionRefreshStrictModeFromSession(host);
    });
  
}

export function runPracticeSessionDetachStrictModeSessionSubscription(host: MemorizationPracticeSessionFacadeBase): void {

    host.strictModeSessionSub?.unsubscribe();
    host.strictModeSessionSub = null;
  
}

export function runPracticeSessionApplyStrictModeFromSession(host: MemorizationPracticeSessionFacadeBase, strict: boolean): void {

    if (host.strictModeEnabled === strict) return;
    host.strictModeEnabled = strict;
    if (strict && host.awaitingRoundAdvance && host.wrongAttemptsInRound > 0) {
      host.roundCompletedWithErrors = true;
    }
    host.cdr.markForCheck();
  
}

export function runPracticeSessionIsAutoRevealBlocked(host: MemorizationPracticeSessionFacadeBase): boolean {

    return host.strictModeEnabled || !host.userSessionService.isSessionInitialized();
  
}

export function runPracticeSessionResolveHydratedWrongAttemptsInRound(host: MemorizationPracticeSessionFacadeBase, ip: MemorizationInProgress): number {

    if (ip.wrongAttemptsInRound !== undefined) {
      return ip.wrongAttemptsInRound;
    }
    if (ip.wrongAttempts > 0) {
      return ip.wrongAttempts;
    }
    return 0;
  
}

export function runPracticeSessionMustRepeatDueToErrors(host: MemorizationPracticeSessionFacadeBase): boolean {

    if (host.wrongAttemptsInRound <= 0) return false;
    if (!host.userSessionService.isSessionInitialized()) return true;
    return host.strictModeEnabled;
  
}

export function runPracticeSessionMustRepeatFinalRound(host: MemorizationPracticeSessionFacadeBase): boolean {

    if (!host.isFinalRound || host.wrongAttemptsInRound <= 0) return false;
    if (!host.userSessionService.isSessionInitialized()) return true;
    return host.strictModeEnabled;
  
}

export function runPracticeSessionReconcileFinalRoundAfterSessionLoad(host: MemorizationPracticeSessionFacadeBase): void {

    if (!host.deferFinalRoundUntilSessionInit) return;
    host.deferFinalRoundUntilSessionInit = false;
    if (
      !host.awaitingRoundAdvance ||
      !host.isFinalRound ||
      host.wrongAttemptsInRound <= 0 ||
      host.strictModeEnabled
    ) {
      return;
    }
    host.finishPracticeSession();
  
}

export function runPracticeSessionTryAutoRevealAfterWrong(host: MemorizationPracticeSessionFacadeBase, revealFirstLetterCue = false): void {

    if (runPracticeSessionIsAutoRevealBlocked(host) || host.currentTargetIndex === null) return;
    if (host.consecutiveWrong < MAX_WRONG_BEFORE_REVEAL) return;
    const idx = host.currentTargetIndex;
    if (revealFirstLetterCue) {
      runPracticeSessionRevealFirstLetterCueForToken(host, idx);
    }
    const next = new Set(host.revealed);
    next.add(idx);
    host.revealed = next;
    host.correctKeystrokesTotal += 1;
    host.consecutiveWrong = 0;
  
}

export function runPracticeSessionCheckRoundCompletion(host: MemorizationPracticeSessionFacadeBase): void {

    if (host.phase !== 'practicing' || host.awaitingRoundAdvance) return;

    if (host.practiceMode === 'reorder') {
      const n = host.reorderChunks.length;
      if (n === 0 || host.reorderSlotChunkIds.length !== n) return;
      if (!host.reorderSlotChunkIds.every((id, i) => id === i)) return;
      runPracticeSessionOnRoundComplete(host);
      return;
    }

    if (host.hiddenIndices.size === 0) return;
    const allDone = [...host.hiddenIndices].every((i) => host.revealed.has(i));
    if (!allDone) return;
    runPracticeSessionOnRoundComplete(host);
  
}

export function runPracticeSessionOnRoundComplete(host: MemorizationPracticeSessionFacadeBase): void {

    runPracticeSessionSyncMetricRefs(host);
    const mustRepeatFinalRound = runPracticeSessionMustRepeatFinalRound(host);

    if (host.isFinalRound && !mustRepeatFinalRound) {
      host.finishPracticeSession();
      return;
    }

    if (host.roundAdvanceHandled === host.roundIndex) return;
    host.roundAdvanceHandled = host.roundIndex;
    host.pendingBetweenRoundsErrors = host.wrongAttemptsInRound;
    host.roundCompletedWithErrors = host.wrongAttemptsInRound > 0;
    if (
      host.isFinalRound &&
      host.wrongAttemptsInRound > 0 &&
      !host.userSessionService.isSessionInitialized()
    ) {
      host.deferFinalRoundUntilSessionInit = true;
    }
    runPracticeSessionPersistPracticeSnapshot(host, { kind: 'betweenRounds', completedRoundIndex: host.roundIndex });
    host.roundAffirmation = pickRandomRoundAffirmation();
    host.awaitingRoundAdvance = true;
    host.awaitingRoundAdvanceRef = true;
    runPracticeSessionStopPassageAudio(host);
  
}

export function runPracticeSessionPersistPracticeSnapshot(host: MemorizationPracticeSessionFacadeBase, phasePayload: MemorizationInProgressSavePayload['phase']): void {

    if (!host.sessionSeed) return;
    runPracticeSessionSyncMetricRefs(host);
    const mode = host.practiceModeRef ?? 'type';
    host.persistInProgress.emit({
      sessionSeed: host.sessionSeed,
      wrongAttempts: host.wrongAttemptsRef,
      correctKeystrokes: host.correctKeystrokesRef,
      phase: phasePayload,
      practiceMode: mode,
      wrongAttemptsInRound:
        phasePayload.kind === 'betweenRounds'
          ? host.pendingBetweenRoundsErrors
          : host.wrongAttemptsInRound,
    });
  
}

export function runPracticeSessionSyncMetricRefs(host: MemorizationPracticeSessionFacadeBase): void {

    host.wrongAttemptsRef = host.wrongAttemptsTotal;
    host.correctKeystrokesRef = host.correctKeystrokesTotal;
    host.awaitingRoundAdvanceRef = host.awaitingRoundAdvance;
    host.practiceModeRef = host.practiceMode;
  
}

export function runPracticeSessionFlashErrorBriefly(host: MemorizationPracticeSessionFacadeBase): void {

    host.flashError = true;
    if (host.flashErrorTimer) clearTimeout(host.flashErrorTimer);
    runPracticeSessionSyncFlashErrorView(host);
    // Run clear inside NgZone so OnPush type-mode UI drops the red ring after the flash.
    host.flashErrorTimer = setTimeout(() => {
      host.ngZone.run(() => {
        host.flashError = false;
        host.flashErrorTimer = null;
        runPracticeSessionSyncFlashErrorView(host);
      });
    }, PRACTICE_SESSION_ERROR_FLASH_MS);
  
}

export function runPracticeSessionClearFlashError(host: MemorizationPracticeSessionFacadeBase): void {

    if (host.flashErrorTimer) {
      clearTimeout(host.flashErrorTimer);
      host.flashErrorTimer = null;
    }
    if (!host.flashError) return;
    host.flashError = false;
    runPracticeSessionSyncFlashErrorView(host);
  
}

export function runPracticeSessionSyncFlashErrorView(host: MemorizationPracticeSessionFacadeBase): void {

    host.cdr.markForCheck();
    try {
      host.cdr.detectChanges();
    } catch {
      // jsdom / test environments may not support full CD
    }
  
}

export function runPracticeSessionProcessWordGuess(
  host: MemorizationPracticeSessionFacadeBase,
  label: string,
): void {
  if (host.hintActive || host.phase !== 'practicing' || host.currentTargetIndex === null) return;
  const token = host.tokens[host.currentTargetIndex];
  if (!token || token.kind === 'punct') return;
  host.hasTypedInRound = true;
  const correct = label === token.text;
  if (correct) {
    runPracticeSessionClearFlashError(host);
    const idx = host.currentTargetIndex;
    const next = new Set(host.revealed);
    next.add(idx);
    host.revealed = next;
    host.consecutiveWrong = 0;
    host.correctKeystrokesTotal += 1;
    runPracticeSessionSyncMetricRefs(host);
  } else {
    runPracticeSessionRecordWrongAttempt(host);
    host.consecutiveWrong += 1;
    runPracticeSessionTryAutoRevealAfterWrong(host);
    runPracticeSessionSyncMetricRefs(host);
    runPracticeSessionFlashErrorBriefly(host);
  }
  runPracticeSessionCheckRoundCompletion(host);
  runPracticeSessionScheduleScrollToBlank(host);
  host.cdr.markForCheck();
}

export function runPracticeSessionOnPracticeInputKeyDown(
  host: MemorizationPracticeSessionFacadeBase,
  event: KeyboardEvent,
): void {
  if (host.hintActive || host.phase !== 'practicing' || host.currentTargetIndex === null) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key;
  if (key.length !== 1) return;
  const token = host.tokens[host.currentTargetIndex];
  if (!token || token.kind === 'punct') return;
  const allow = token.kind === 'digit' ? /^[0-9]$/.test(key) : /^[a-zA-Z]$/.test(key);
  if (!allow) return;
  event.preventDefault();
  host.suppressInputFromKeydown = true;
  runPracticeSessionProcessKeystroke(host, key);
  setTimeout(() => {
    host.suppressInputFromKeydown = false;
  }, 0);
}

export function runPracticeSessionOnPracticeInput(
  host: MemorizationPracticeSessionFacadeBase,
  event: Event,
): void {
  const el = event.target as HTMLInputElement;
  if (host.suppressInputFromKeydown) {
    el.value = '';
    return;
  }
  if (host.hintActive) {
    el.value = '';
    return;
  }
  if (host.phase !== 'practicing' || host.currentTargetIndex === null) {
    el.value = '';
    return;
  }
  const v = el.value;
  if (v.length === 0) return;
  const last = v.slice(-1);
  el.value = '';
  const token = host.tokens[host.currentTargetIndex];
  if (!token || token.kind === 'punct') return;
  const ok = token.kind === 'digit' ? /^[0-9]$/.test(last) : /^[a-zA-Z]$/.test(last);
  if (!ok) return;
  runPracticeSessionProcessKeystroke(host, last);
}