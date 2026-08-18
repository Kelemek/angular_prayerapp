import {
  AfterViewInit,
  Injectable,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
// @removal-recite
import {
  MEMORIZATION_RECITE_PRACTICE_MODE,
  RECITE_VERSE_LIMIT_MESSAGE,
  isRecitePracticeMode,
} from '../memorization-recite/integration';
import { type ReciteAttemptMetrics } from '../memorization-recite/memorization-recite-practice.component';
import type { PracticeSessionResult } from '../services/memorization.service';
import {
  type MemorizationInProgressSavePayload,
  type MemorizationPracticeMode,
  type MemorizedItem,
} from '../types/memorization';
import { pickRandomAllDoneMessage } from './memorization/memorizationEncouragementMessages';
import {
  trackMemorizationPracticeCompleted,
  trackMemorizationPracticeSessionStart,
} from './memorization/memorizationPracticeAnalytics';
import {
  MemorizeListenSpeed,
} from './memorization/memorizeListenSpeedStorage';
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  generateMemorizationSessionSeed,
} from './memorization/memorizationPracticeUtils';
import {
  runPracticeSessionBumpListenUi,
  runPracticeSessionStopPassageAudio,
  runPracticeSessionClearListenRepeatGapTimer,
  runPracticeSessionPlayStreamingAudio,
  runPracticeSessionHandleTtsListenClick,
  runPracticeSessionBeginTtsUtterance,
  runPracticeSessionPassageAudioPlay,
  runPracticeSessionPassageAudioPause,
  runPracticeSessionPassageAudioEnded,
  runPracticeSessionPassageAudioError,
  runPracticeSessionOpenListenPanel,
  runPracticeSessionCloseListenPanel,
  runPracticeSessionSelectListenSpeed,
  runPracticeSessionHandleListenPassageClick,
  runPracticeSessionHandleRepeatListenToggle,
} from './memorization-practice-session-listen-run';
import {
  runPracticeSessionResolvePracticeInputEl,
  runPracticeSessionFocusPracticeInput,
  runPracticeSessionScheduleKeyboardPracticeFocus,
  runPracticeSessionRestorePracticeInputFocusAfterHint,
  runPracticeSessionStartHintInterval,
  runPracticeSessionSchedulePracticeEffects,
  runPracticeSessionScheduleScrollToBlank,
  runPracticeSessionScrollCurrentBlankIntoView,
  runPracticeSessionScrollActiveFirstLetterCueIntoView,
  runPracticeSessionAttachViewportListeners,
  runPracticeSessionAttachPracticeListeners,
  runPracticeSessionAttachAndroidScrollClamp,
  runPracticeSessionAttachTypeModeCapture,
  runPracticeSessionEnsureTypeModeCaptureAttached,
  runPracticeSessionAttachHintCapture,
  runPracticeSessionEnsureHintCaptureAttached,
  runPracticeSessionKeepPracticeInputOnPointerCapture,
  runPracticeSessionAttachFirstLetterResizeObserver,
  runPracticeSessionDetachAllListeners,
  runPracticeSessionClearHintInterval,
} from './memorization-practice-session-scroll-run';
import {
  runPracticeSessionOnOpen,
  runPracticeSessionPrimeKeyboardFocusForResume,
  runPracticeSessionOnCloseCleanup,
  runPracticeSessionRecomputeDerivedFromItem,
  runPracticeSessionLoadPassageText,
  runPracticeSessionLoadAudioUrl,
  runPracticeSessionHandleItemIdChange,
  runPracticeSessionResetToIntro,
  runPracticeSessionHydrateInProgressOnce,
  runPracticeSessionBeginRecitePractice,
  runPracticeSessionFetchReciteSettings,
} from './memorization-practice-session-passage-run';
import {
  runPracticeSessionStartRound,
  runPracticeSessionRevealFirstLetterCueForToken,
  runPracticeSessionProcessKeystroke,
  runPracticeSessionHandleWrongKeystroke,
  runPracticeSessionRecordWrongAttempt,
  runPracticeSessionSyncStrictModeFromSession,
  runPracticeSessionRefreshStrictModeFromSession,
  runPracticeSessionAttachStrictModeSessionSubscription,
  runPracticeSessionDetachStrictModeSessionSubscription,
  runPracticeSessionApplyStrictModeFromSession,
  runPracticeSessionIsAutoRevealBlocked,
  runPracticeSessionResolveHydratedWrongAttemptsInRound,
  runPracticeSessionMustRepeatDueToErrors,
  runPracticeSessionMustRepeatFinalRound,
  runPracticeSessionReconcileFinalRoundAfterSessionLoad,
  runPracticeSessionTryAutoRevealAfterWrong,
  runPracticeSessionCheckRoundCompletion,
  runPracticeSessionOnRoundComplete,
  runPracticeSessionPersistPracticeSnapshot,
  runPracticeSessionSyncMetricRefs,
  runPracticeSessionFlashErrorBriefly,
  runPracticeSessionClearFlashError,
  runPracticeSessionSyncFlashErrorView,
  runPracticeSessionProcessWordGuess,
  runPracticeSessionOnPracticeInputKeyDown,
  runPracticeSessionOnPracticeInput,
} from './memorization-practice-session-round-run';
import { MemorizationPracticeSessionFacadeBase } from './memorization-practice-session-facade-base';

export type { PracticeSessionResult };

@Injectable()
export class MemorizationPracticeSessionFacade
  extends MemorizationPracticeSessionFacadeBase
  implements AfterViewInit, OnChanges, OnDestroy
{
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      const prev = changes['item'].previousValue as MemorizedItem | undefined;
      const passageSourceChanged =
        !prev ||
        prev.id !== this.item.id ||
        prev.reference !== this.item.reference ||
        prev.translation !== this.item.translation;

      runPracticeSessionRecomputeDerivedFromItem(this);
      runPracticeSessionHandleItemIdChange(this);
      if (
        this.isOpen &&
        !this.isBibleBooks &&
        !changes['item'].firstChange &&
        passageSourceChanged
      ) {
        this.passageHydratedForOpen = false;
        void runPracticeSessionLoadPassageText(this);
      }
    }
    if (changes['isOpen']) {
      if (this.isOpen) {
        runPracticeSessionOnOpen(this);
      } else {
        runPracticeSessionOnCloseCleanup(this);
      }
    }
  }

  ngAfterViewInit(): void {
    runPracticeSessionSyncMetricRefs(this);
    runPracticeSessionAttachPracticeListeners(this);
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    runPracticeSessionOnCloseCleanup(this);
    runPracticeSessionDetachAllListeners(this);
  }

  onWindowKeydown(event: KeyboardEvent): void {
    if (!this.isOpen || event.key !== 'Escape') return;
    if (this.modePickerOpen) {
      this.modePickerOpen = false;
      this.cdr.markForCheck();
      return;
    }
    if (this.listenPanelOpen) {
      this.listenPanelOpen = false;
      this.cdr.markForCheck();
      return;
    }
    this.handleClose();
  }

  onBackdropNothing(): void {
    // Fullscreen modal — close only via explicit buttons / Escape.
  }

  async handleClose(): Promise<void> {
    this.listenPanelOpen = false;
    runPracticeSessionStopPassageAudio(this);
    // @removal-recite
    if (isRecitePracticeMode(this.practiceMode)) {
      await this.recitePractice?.prepareClose();
    }
    if (this.sessionSeed && this.phase === 'practicing') {
      runPracticeSessionSyncMetricRefs(this);
      if (this.awaitingRoundAdvance) {
        runPracticeSessionPersistPracticeSnapshot(this, { kind: 'betweenRounds', completedRoundIndex: this.roundIndex });
      } else {
        runPracticeSessionPersistPracticeSnapshot(this, { kind: 'inRound', roundIndex: this.roundIndex });
      }
    }
    this.closed.emit();
  }

  handleStartOver(): void {
    this.listenPanelOpen = false;
    runPracticeSessionStopPassageAudio(this);
    // @removal-recite
    this.recitePractice?.cancel();
    this.clearInProgress.emit();
    this.sessionSeed = '';
    this.practiceCompleted = false;
    this.roundAdvanceHandled = null;
    this.openedLayoutOnceForVerseId = null;
    this.lastVerseIdForLayout = this.item.id;
    runPracticeSessionResetToIntro(this);
    this.cdr.markForCheck();
  }

  async openModePicker(): Promise<void> {
    await runPracticeSessionFetchReciteSettings(this);
    this.ngZone.run(() => {
      this.reciteModeBlockedMessage = null;
      this.modePickerOpen = true;
      this.cdr.markForCheck();
    });
  }

  closeModePicker(): void {
    this.modePickerOpen = false;
    this.reciteModeBlockedMessage = null;
    this.cdr.markForCheck();
  }

  beginPracticeWithMode(mode: MemorizationPracticeMode): void {
    // @removal-recite
    if (isRecitePracticeMode(mode)) {
      if (!this.reciteModeAvailable) {
        this.reciteModeBlockedMessage = RECITE_VERSE_LIMIT_MESSAGE;
        this.cdr.markForCheck();
        return;
      }
      this.reciteModeBlockedMessage = null;
      runPracticeSessionBeginRecitePractice(this);
      return;
    }
    this.reciteModeBlockedMessage = null;
    runPracticeSessionSyncStrictModeFromSession(this);
    runPracticeSessionStopPassageAudio(this);
    this.modePickerOpen = false;
    this.practiceCompleted = false;
    this.wrongAttemptsTotal = 0;
    this.wrongAttemptsInRound = 0;
    this.correctKeystrokesTotal = 0;
    runPracticeSessionSyncMetricRefs(this);
    this.sessionSeed = generateMemorizationSessionSeed();
    trackMemorizationPracticeSessionStart(this.sessionSeed, this.item, mode);
    this.practiceModeRef = mode;
    const r = Math.min(MEMORIZATION_FULL_HIDE_ROUND, Math.max(1, Math.floor(this.startRoundChoice)));
    this.practiceMode = mode;
    runPracticeSessionStartRound(this, r);
    if (this.practiceScrollRef?.nativeElement) {
      this.practiceScrollRef.nativeElement.scrollTop = 0;
    }
    runPracticeSessionScheduleKeyboardPracticeFocus(this);
    runPracticeSessionSchedulePracticeEffects(this);
    this.persistInProgress.emit({
      sessionSeed: this.sessionSeed,
      wrongAttempts: this.wrongAttemptsRef,
      correctKeystrokes: this.correctKeystrokesRef,
      phase: { kind: 'inRound', roundIndex: r },
      practiceMode: mode,
    });
    this.cdr.markForCheck();
  }

  // @removal-recite — delegates for tests
  async startReciteRecording(): Promise<void> {
    await this.recitePractice?.startRecording();
  }

  async stopReciteRecording(): Promise<void> {
    await this.recitePractice?.stopRecording();
  }

  onReciteClearHint(): void {
    this.hintHeld = false;
    this.hintPeekCount = 0;
    runPracticeSessionClearHintInterval(this);
  }

  onReciteAttemptMetrics(metrics: ReciteAttemptMetrics): void {
    this.wrongAttemptsInRound += metrics.wrong;
    this.wrongAttemptsTotal += metrics.wrong;
    this.correctKeystrokesTotal += metrics.correct;
    this.roundCompletedWithErrors = metrics.hadErrors;
    this.hasTypedInRound = true;
    runPracticeSessionSyncMetricRefs(this);
    this.cdr.markForCheck();
  }

  // @removal-recite
  openReciteFeedbackHelp(): void {
    this.reciteFeedbackHelpOpen = true;
    this.cdr.markForCheck();
  }

  closeReciteFeedbackHelp(): void {
    this.reciteFeedbackHelpOpen = false;
    this.cdr.markForCheck();
  }

  async openSettingsForReciteFeedback(): Promise<void> {
    this.closeReciteFeedbackHelp();
    await this.handleClose();
    this.openSettings.emit();
  }

  onReciteRepeatRound(): void {
    this.repeatRound();
  }

  onReciteNextRound(): void {
    this.recitePractice?.applyAttemptMetrics();
    runPracticeSessionOnRoundComplete(this);
    if (this.practiceCompleted) return;
    if (this.showNextRoundOption) {
      this.nextRound();
    }
    this.cdr.markForCheck();
  }

  onReciteFinishPractice(): void {
    this.recitePractice?.applyAttemptMetrics();
    runPracticeSessionOnRoundComplete(this);
    if (!this.practiceCompleted) {
      this.finishPracticeSession();
    }
    this.cdr.markForCheck();
  }

  // @removal-recite
  loadReciteSettings(): void {
    this.reciteSettingsLoaded = false;
    this.cdr.markForCheck();
    void runPracticeSessionFetchReciteSettings(this);
  }

  startRoundAndFocusInput(r: number): void {
    runPracticeSessionStartRound(this, r);
    if (this.practiceScrollRef?.nativeElement) {
      this.practiceScrollRef.nativeElement.scrollTop = 0;
    }
    runPracticeSessionScheduleKeyboardPracticeFocus(this);
    runPracticeSessionSchedulePracticeEffects(this);
    this.cdr.markForCheck();
  }

  repeatRound(): void {
    this.startRoundAndFocusInput(this.roundIndex);
    runPracticeSessionPersistPracticeSnapshot(this, { kind: 'inRound', roundIndex: this.roundIndex });
  }

  nextRound(): void {
    if (!this.showNextRoundOption) return;
    const nextIndex = this.roundIndex + 1;
    this.startRoundAndFocusInput(nextIndex);
    runPracticeSessionPersistPracticeSnapshot(this, { kind: 'inRound', roundIndex: this.roundIndex });
  }

  onHintPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.hintPeekCount = 1;
    this.hintHeld = true;
    runPracticeSessionStartHintInterval(this);
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    this.cdr.markForCheck();
  }

  onHintPointerUp(event: PointerEvent): void {
    try {
      const el = event.currentTarget as HTMLElement;
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    this.hintPeekCount = 1;
    this.hintHeld = false;
    runPracticeSessionClearHintInterval(this);
    runPracticeSessionRestorePracticeInputFocusAfterHint(this);
    this.cdr.markForCheck();
  }

  onHintPointerLeave(event: PointerEvent): void {
    if (event.buttons !== 0) return;
    this.hintPeekCount = 1;
    this.hintHeld = false;
    runPracticeSessionClearHintInterval(this);
    runPracticeSessionRestorePracticeInputFocusAfterHint(this);
    this.cdr.markForCheck();
  }

  processWordGuess(label: string): void {
    runPracticeSessionProcessWordGuess(this, label);
  }

  onPracticeInputKeyDown(event: KeyboardEvent): void {
    runPracticeSessionOnPracticeInputKeyDown(this, event);
  }

  onPracticeInput(event: Event): void {
    runPracticeSessionOnPracticeInput(this, event);
  }

  onReorderInvalidDrop(): void {
    runPracticeSessionRecordWrongAttempt(this);
    runPracticeSessionSyncMetricRefs(this);
    runPracticeSessionFlashErrorBriefly(this);
    this.cdr.markForCheck();
  }

  onReorderWrongSwap(): void {
    if (!this.strictModeEnabled) return;
    runPracticeSessionRecordWrongAttempt(this);
    runPracticeSessionSyncMetricRefs(this);
    runPracticeSessionFlashErrorBriefly(this);
    this.cdr.markForCheck();
  }

  onReorderSlotsBecameCorrect(slots: number[]): void {
    if (slots.length === 0) return;
    this.correctKeystrokesTotal += slots.length;
    runPracticeSessionSyncMetricRefs(this);
    runPracticeSessionCheckRoundCompletion(this);
    this.cdr.markForCheck();
  }

  onReorderSlotChunkIdsChange(next: number[]): void {
    this.reorderSlotChunkIds = next;
    runPracticeSessionCheckRoundCompletion(this);
    this.cdr.markForCheck();
  }

  onPassageAudioPlay(): void {
    runPracticeSessionPassageAudioPlay(this);
  }

  onPassageAudioPause(): void {
    runPracticeSessionPassageAudioPause(this);
  }

  onPassageAudioEnded(): void {
    runPracticeSessionPassageAudioEnded(this);
  }

  onPassageAudioError(): void {
    runPracticeSessionPassageAudioError(this);
  }

  openListenPanel(): void {
    runPracticeSessionOpenListenPanel(this);
  }

  closeListenPanel(): void {
    runPracticeSessionCloseListenPanel(this);
  }

  onSelectListenSpeed(rate: MemorizeListenSpeed): void {
    runPracticeSessionSelectListenSpeed(this, rate);
  }

  handleListenPassageClick(): void {
    runPracticeSessionHandleListenPassageClick(this);
  }

  handleRepeatListenToggle(): void {
    runPracticeSessionHandleRepeatListenToggle(this);
  }

  onVerseTouchStart(event: TouchEvent): void {
    this.verseTouchMoved = false;
    const t = event.touches[0];
    if (t) this.verseTouchStart = { x: t.clientX, y: t.clientY };
  }

  onVerseTouchMove(event: TouchEvent): void {
    const t = event.touches[0];
    if (!t) return;
    const dx = t.clientX - this.verseTouchStart.x;
    const dy = t.clientY - this.verseTouchStart.y;
    if (dx * dx + dy * dy > 144) this.verseTouchMoved = true;
  }

  onVerseTouchCancel(): void {
    this.verseTouchMoved = false;
  }

  onVerseTouchEnd(): void {
    if (this.awaitingRoundAdvance) return;
    const wasScroll = this.verseTouchMoved;
    this.verseTouchMoved = false;
    if (wasScroll) return;
    runPracticeSessionFocusPracticeInput(this);
  }

  isTokenHidden(i: number): boolean {
    return this.hiddenIndices.has(i);
  }

  isTokenRevealed(i: number): boolean {
    return this.revealed.has(i);
  }

  showViaHint(i: number): boolean {
    return this.hintActive && this.isTokenHidden(i) && !this.isTokenRevealed(i) && this.hintPeekIndices.has(i);
  }

  isCurrentBlank(i: number): boolean {
    return this.isTokenHidden(i) && !this.isTokenRevealed(i) && i === this.currentTargetIndex;
  }

  finishPracticeSession(): void {
    if (this.awaitingRoundAdvance && !this.showFinishPracticeOption) return;
    if (this.practiceCompleted) return;
    const mode = this.practiceModeRef ?? 'type';
    trackMemorizationPracticeCompleted(this.item, mode, {
      wrongAttempts: this.wrongAttemptsRef,
      correctKeystrokes: this.correctKeystrokesRef,
      completed: true,
    });
    this.practiceCompleted = true;
    this.completed.emit({
      wrongAttempts: this.wrongAttemptsRef,
      correctKeystrokes: this.correctKeystrokesRef,
      completed: true,
    });
    this.completionMessage = pickRandomAllDoneMessage();
    this.phase = 'done';
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      if (this.practiceScrollRef?.nativeElement) {
        this.practiceScrollRef.nativeElement.scrollTop = 0;
      }
    });
  }
}
