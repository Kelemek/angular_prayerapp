import {
  MEMORIZATION_RECITE_PRACTICE_MODE,
  isRecitePracticeMode,
} from '../memorization-recite/integration';
import {
  isMemorizationListenTranslation,
  type MemorizationInProgress,
} from '../types/memorization';
import {
  booksForScope,
  isBibleBooksMemorizationItem,
} from './memorization/bibleBooksMemorization';
import { isKeyboardPracticeMode } from './memorization/memorizationKeyboardPractice';
import { trackMemorizationPracticeSessionStart } from './memorization/memorizationPracticeAnalytics';
import { isMemorizeAndroidWebHost } from './memorization/memorizationViewportPlatform';
import { stripScriptureForMemorization } from './memorization/strip-scripture-for-memorization';
import {
  ANDROID_SCROLL_CLAMP_MS,
  hiddenTypingTokenIndices,
} from './memorization-practice-session-ui';
import {
  runPracticeSessionAttachStrictModeSessionSubscription,
  runPracticeSessionDetachStrictModeSessionSubscription,
  runPracticeSessionResolveHydratedWrongAttemptsInRound,
  runPracticeSessionStartRound,
  runPracticeSessionSyncMetricRefs,
  runPracticeSessionSyncStrictModeFromSession,
} from './memorization-practice-session-round-run';
import { runPracticeSessionStopPassageAudio } from './memorization-practice-session-listen-run';
import {
  runPracticeSessionAttachViewportListeners,
  runPracticeSessionClearHintInterval,
  runPracticeSessionDetachAllListeners,
  runPracticeSessionResolvePracticeInputEl,
  runPracticeSessionScheduleKeyboardPracticeFocus,
  runPracticeSessionSchedulePracticeEffects,
} from './memorization-practice-session-scroll-run';
import type { MemorizationPracticeSessionFacadeBase } from './memorization-practice-session-facade-base';
import { pickRandomRoundAffirmation } from './memorization/memorizationEncouragementMessages';
import {
  buildBibleBooksReorderChunks,
  buildInitialReorderSlotAssignment,
  buildMemorizationReorderChunks,
  buildMemorizationTokens,
  generateMemorizationSessionSeed,
  getTypableTokenIndices,
  MEMORIZATION_FULL_HIDE_ROUND,
  pickReorderMovableIndices,
  reorderReferenceColonAfterSlotIndex,
  seedRandom,
  stringToSeed,
} from './memorization/memorizationPracticeUtils';
import { readMemorizeListenSpeedFromStorage } from './memorization/memorizeListenSpeedStorage';

export function runPracticeSessionOnOpen(host: MemorizationPracticeSessionFacadeBase): void {

    host.memorizeAndroidHost = isMemorizeAndroidWebHost();
    host.listenPlaybackRate = readMemorizeListenSpeedFromStorage();
    host.listenPlaybackRateRef = host.listenPlaybackRate;
    host.document.body.style.overflow = 'hidden';
    host.document.documentElement.style.overflow = 'hidden';
    host.passageHydratedForOpen = false;
    // Allow hydrate + keyboard focus on every open (including resume of the same verse).
    host.openedLayoutOnceForVerseId = null;
    runPracticeSessionRecomputeDerivedFromItem(host);
    // Mobile keyboards only open if focus happens in the same user-gesture turn as the tap
    // that opened the session — do host before any await (passage fetch).
    runPracticeSessionPrimeKeyboardFocusForResume(host);
    if (host.isBibleBooks) {
      host.passageText = '';
      host.passageLoading = false;
      host.passageLoadError = null;
      runPracticeSessionHydrateInProgressOnce(host);
      host.passageHydratedForOpen = true;
    } else {
      void runPracticeSessionLoadPassageText(host);
    }
    runPracticeSessionLoadAudioUrl(host);
    host.reciteSettingsLoaded = false;
    void runPracticeSessionFetchReciteSettings(host);
    runPracticeSessionAttachViewportListeners(host);
    runPracticeSessionAttachStrictModeSessionSubscription(host);
    if (host.isBibleBooks) {
      runPracticeSessionSchedulePracticeEffects(host);
    }
    host.cdr.markForCheck();
  
}

export function runPracticeSessionPrimeKeyboardFocusForResume(host: MemorizationPracticeSessionFacadeBase): void {

    const ip = host.item.inProgressPractice;
    if (!ip || ip.phase.kind !== 'inRound') {
      host.resumeKeyboardPrimeActive = false;
      return;
    }
    const mode = ip.practiceMode ?? 'type';
    if (!isKeyboardPracticeMode(mode)) {
      host.resumeKeyboardPrimeActive = false;
      return;
    }

    host.resumeKeyboardPrimeActive = true;
    host.practiceMode = mode;
    host.practiceModeRef = mode;
    host.cdr.markForCheck();
    try {
      host.cdr.detectChanges();
    } catch {
      // jsdom / test environments may not support full CD
    }
    runPracticeSessionScheduleKeyboardPracticeFocus(host);
  
}

export function runPracticeSessionOnCloseCleanup(host: MemorizationPracticeSessionFacadeBase): void {

    if (host.flashErrorTimer) {
      clearTimeout(host.flashErrorTimer);
      host.flashErrorTimer = null;
    }
    host.flashError = false;
    host.passageText = '';
    host.passageLoading = false;
    host.passageLoadError = null;
    host.openedLayoutOnceForVerseId = null;
    host.passageHydratedForOpen = false;
    host.resumeKeyboardPrimeActive = false;
    runPracticeSessionStopPassageAudio(host);
    host.document.body.style.overflow = 'unset';
    host.document.documentElement.style.overflow = 'unset';
    runPracticeSessionDetachAllListeners(host);
    runPracticeSessionDetachStrictModeSessionSubscription(host);
    runPracticeSessionClearHintInterval(host);
    // @removal-recite
    host.recitePractice?.destroy();
  
}

export function runPracticeSessionRecomputeDerivedFromItem(host: MemorizationPracticeSessionFacadeBase): void {

    host.isBibleBooks = isBibleBooksMemorizationItem(host.item);
    const body = host.isBibleBooks ? host.item.text : host.passageText;
    host.tokens = host.isBibleBooks
      ? buildMemorizationTokens(body, '')
      : buildMemorizationTokens(body, host.item.reference);
    host.reorderChunks = host.isBibleBooks
      ? buildBibleBooksReorderChunks(booksForScope(host.item.bibleBooksScope!).map((b) => b.name))
      : buildMemorizationReorderChunks(body, host.item.reference);
    host.reorderColonAfterSlotIndex = reorderReferenceColonAfterSlotIndex(
      host.reorderChunks.length,
      host.item.reference
    );
    host.typableIndices = getTypableTokenIndices(host.tokens);
  
}

export async function runPracticeSessionLoadPassageText(host: MemorizationPracticeSessionFacadeBase): Promise<void> {

    const seq = ++host.passageLoadSeq;
    host.passageLoading = true;
    host.passageLoadError = null;
    host.passageText = '';
    runPracticeSessionRecomputeDerivedFromItem(host);
    host.cdr.markForCheck();

    try {
      const result = await host.scripture.getPassage(host.item.reference, host.item.translation);
      if (seq !== host.passageLoadSeq) return;
      const plain = stripScriptureForMemorization(result.text ?? '');
      if (!plain) {
        host.passageLoadError = 'No text returned for this passage.';
      } else {
        host.passageText = plain;
      }
    } catch (e) {
      if (seq !== host.passageLoadSeq) return;
      host.passageLoadError = e instanceof Error ? e.message : 'Failed to load passage.';
    } finally {
      if (seq === host.passageLoadSeq) {
        host.passageLoading = false;
        runPracticeSessionRecomputeDerivedFromItem(host);
        if (host.isOpen && !host.passageHydratedForOpen) {
          runPracticeSessionHydrateInProgressOnce(host);
          host.passageHydratedForOpen = true;
          runPracticeSessionSchedulePracticeEffects(host);
        }
        host.cdr.markForCheck();
      }
    }
  
}

export async function runPracticeSessionLoadAudioUrl(host: MemorizationPracticeSessionFacadeBase): Promise<void> {

    if (host.isBibleBooks) {
      host.passageAudioUrl = null;
      host.listenViaStreamingAudio = false;
      host.translationListenEnabled = !host.memorizeAndroidHost;
      host.cdr.markForCheck();
      return;
    }
    if (!isMemorizationListenTranslation(host.item.translation)) {
      host.passageAudioUrl = null;
      host.listenViaStreamingAudio = false;
      host.translationListenEnabled = false;
      host.cdr.markForCheck();
      return;
    }
    try {
      const result = await host.scripture.getAudioUrl(host.item.reference, host.item.translation);
      host.passageAudioUrl = result.audioUrl;
      host.listenViaStreamingAudio = !!result.audioUrl && !result.useSpeechSynthesis;
      host.translationListenEnabled = host.listenViaStreamingAudio || !host.memorizeAndroidHost;
    } catch {
      host.passageAudioUrl = null;
      host.listenViaStreamingAudio = false;
      host.translationListenEnabled = !host.memorizeAndroidHost;
    }
    host.cdr.markForCheck();
  
}

export function runPracticeSessionHandleItemIdChange(host: MemorizationPracticeSessionFacadeBase): void {

    if (host.lastAudioResetVerseId !== null && host.lastAudioResetVerseId !== host.item.id) {
      runPracticeSessionStopPassageAudio(host);
    }
    host.lastAudioResetVerseId = host.item.id;

    if (!host.item.inProgressPractice) {
      // Parent clears inProgress when stats save after the final round — keep the done screen.
      if (host.phase === 'done') return;

      host.practiceCompleted = false;
      host.roundAdvanceHandled = null;
      host.awaitingRoundAdvance = false;
      host.roundAffirmation = '';
      host.completionMessage = '';
      host.sessionSeed = '';
      if (host.isOpen) {
        runPracticeSessionResetToIntro(host);
      }
    }
  
}

export function runPracticeSessionResetToIntro(host: MemorizationPracticeSessionFacadeBase): void {

    host.phase = 'intro';
    host.startRoundChoice = 1;
    host.roundIndex = 0;
    host.hasTypedInRound = false;
    host.hiddenIndices = new Set();
    host.revealed = new Set();
    host.firstLetterCueRevealedSlots = new Set();
    host.reorderSlotChunkIds = [];
    host.reorderRoundMovableIndices = new Set();
    host.wrongAttemptsTotal = 0;
    host.wrongAttemptsInRound = 0;
    host.correctKeystrokesTotal = 0;
    host.consecutiveWrong = 0;
    host.practiceMode = null;
    host.practiceModeRef = null;
    host.modePickerOpen = false;
    // @removal-recite
    host.recitePractice?.resetAttemptState();
    runPracticeSessionSyncMetricRefs(host);
  
}

export function runPracticeSessionHydrateInProgressOnce(host: MemorizationPracticeSessionFacadeBase): void {

    if (host.lastVerseIdForLayout !== host.item.id) {
      host.lastVerseIdForLayout = host.item.id;
      host.openedLayoutOnceForVerseId = null;
    }
    if (host.openedLayoutOnceForVerseId === host.item.id) return;
    host.openedLayoutOnceForVerseId = host.item.id;

    const ip = host.item.inProgressPractice;
    if (!ip) return;

    host.sessionSeed = ip.sessionSeed;
    host.practiceCompleted = false;
    host.wrongAttemptsTotal = ip.wrongAttempts;
    const hydratedRoundErrors = runPracticeSessionResolveHydratedWrongAttemptsInRound(host, ip);
    if (ip.phase.kind === 'betweenRounds') {
      host.roundCompletedWithErrors = hydratedRoundErrors > 0;
      host.pendingBetweenRoundsErrors = hydratedRoundErrors;
      host.wrongAttemptsInRound = hydratedRoundErrors;
    } else {
      host.wrongAttemptsInRound = hydratedRoundErrors;
      host.roundCompletedWithErrors = false;
      host.pendingBetweenRoundsErrors = 0;
    }
    host.correctKeystrokesTotal = ip.correctKeystrokes;
    runPracticeSessionSyncMetricRefs(host);

    if (ip.phase.kind === 'betweenRounds') {
      const r = ip.phase.completedRoundIndex;
      host.roundAdvanceHandled = r;
      const modeRaw = ip.practiceMode ?? 'type';
      host.practiceMode = modeRaw;
      host.practiceModeRef = modeRaw;
      host.roundIndex = r;
      host.hasTypedInRound = false;
      host.hiddenIndices = new Set();
      host.revealed = new Set();
      host.firstLetterCueRevealedSlots = new Set();
      if (modeRaw === 'reorder') {
        const n = host.reorderChunks.length;
        host.reorderSlotChunkIds = n === 0 ? [] : Array.from({ length: n }, (_, i) => i);
        host.reorderRoundMovableIndices = new Set();
      } else {
        host.hiddenIndices = hiddenTypingTokenIndices(
          modeRaw,
          r,
          host.sessionSeed || host.item.id,
          host.typableIndices
        );
      }
      host.awaitingRoundAdvance = true;
      host.roundAffirmation = pickRandomRoundAffirmation();
      host.phase = 'practicing';
      if (isRecitePracticeMode(modeRaw)) {
        host.recitePractice?.resetAttemptState();
      }
    } else {
      host.roundAdvanceHandled = null;
      const r = ip.phase.roundIndex;
      const modeRaw = ip.practiceMode ?? 'type';
      host.practiceMode = modeRaw;
      host.practiceModeRef = modeRaw;
      host.roundIndex = r;
      host.hasTypedInRound = false;
      host.revealed = new Set();
      host.firstLetterCueRevealedSlots = new Set();
      host.awaitingRoundAdvance = false;
      host.roundAffirmation = '';
      if (modeRaw === 'reorder') {
        const n = host.reorderChunks.length;
        const movableArr = pickReorderMovableIndices(n, r, host.sessionSeed);
        const rng = seedRandom(stringToSeed(`${host.sessionSeed}-mem-reorder-assign-r${r}`));
        host.reorderSlotChunkIds = buildInitialReorderSlotAssignment(n, movableArr, rng);
        host.reorderRoundMovableIndices = new Set(movableArr);
        host.hiddenIndices = new Set();
        if (host.memorizeAndroidHost) {
          host.androidScrollClampUntil = Date.now() + ANDROID_SCROLL_CLAMP_MS;
        }
      } else {
        host.hiddenIndices = hiddenTypingTokenIndices(
          modeRaw,
          r,
          host.sessionSeed || host.item.id,
          host.typableIndices
        );
        if (host.memorizeAndroidHost) {
          host.androidScrollClampUntil = Date.now() + ANDROID_SCROLL_CLAMP_MS;
        }
      }
      host.phase = 'practicing';
      if (isRecitePracticeMode(modeRaw)) {
        host.recitePractice?.resetAttemptState();
      }
    }

    runPracticeSessionSyncStrictModeFromSession(host);
    host.resumeKeyboardPrimeActive = false;
    const hydratedMode = host.practiceModeRef ?? host.practiceMode ?? 'type';
    trackMemorizationPracticeSessionStart(host.sessionSeed, host.item, hydratedMode, {
      resumed: true,
    });

    // Prefer sync focus when the input is already in the DOM (resume after primeKeyboardFocusForResume).
    // Fall back to rAF only for layout settle (Android scroll clamp); keyboard may not reopen then.
    if (runPracticeSessionResolvePracticeInputEl(host)) {
      runPracticeSessionScheduleKeyboardPracticeFocus(host);
    } else {
      requestAnimationFrame(() => {
        if (isMemorizeAndroidWebHost() && host.practiceScrollRef?.nativeElement) {
          host.practiceScrollRef.nativeElement.scrollTop = 0;
        }
        runPracticeSessionScheduleKeyboardPracticeFocus(host);
      });
    }
  
}

export async function runPracticeSessionFetchReciteSettings(
  host: MemorizationPracticeSessionFacadeBase,
): Promise<void> {
  const settings = await host.reciteSettingsService.getSettingsFromServer();
  host.ngZone.run(() => {
    host.reciteEnabled = settings.enabled;
    host.reciteSettingsLoaded = true;
    host.cdr.markForCheck();
  });
}

export function runPracticeSessionBeginRecitePractice(host: MemorizationPracticeSessionFacadeBase): void {
  runPracticeSessionSyncStrictModeFromSession(host);
  runPracticeSessionStopPassageAudio(host);
  host.modePickerOpen = false;
  host.practiceCompleted = false;
  host.wrongAttemptsTotal = 0;
  host.wrongAttemptsInRound = 0;
  host.correctKeystrokesTotal = 0;
  runPracticeSessionSyncMetricRefs(host);
  host.sessionSeed = generateMemorizationSessionSeed();
  trackMemorizationPracticeSessionStart(
    host.sessionSeed,
    host.item,
    MEMORIZATION_RECITE_PRACTICE_MODE,
  );
  host.practiceModeRef = MEMORIZATION_RECITE_PRACTICE_MODE;
  host.practiceMode = MEMORIZATION_RECITE_PRACTICE_MODE;
  const r = Math.min(MEMORIZATION_FULL_HIDE_ROUND, Math.max(1, Math.floor(host.startRoundChoice)));
  runPracticeSessionStartRound(host, r);
  if (host.practiceScrollRef?.nativeElement) {
    host.practiceScrollRef.nativeElement.scrollTop = 0;
  }
  void host.recitePractice?.refreshSettings();
  host.persistInProgress.emit({
    sessionSeed: host.sessionSeed,
    wrongAttempts: host.wrongAttemptsRef,
    correctKeystrokes: host.correctKeystrokesRef,
    phase: { kind: 'inRound', roundIndex: r },
    practiceMode: MEMORIZATION_RECITE_PRACTICE_MODE,
  });
  host.cdr.markForCheck();
}