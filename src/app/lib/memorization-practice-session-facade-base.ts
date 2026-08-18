import { ChangeDetectorRef, ElementRef, EventEmitter, NgZone, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { ScriptureService } from '../services/scripture.service';
import { UserSessionService } from '../services/user-session.service';
// @removal-recite
import { MemorizationReciteSettingsService } from '../services/memorization-recite-settings.service';
import { MemorizationRecitePracticeComponent } from '../memorization-recite/memorization-recite-practice.component';
import {
  computeReciteModeAvailable,
  computeReciteModeVisible,
  isRecitePracticeMode,
} from '../memorization-recite/integration';
import type { PracticeSessionResult } from '../services/memorization.service';
import {
  type MemorizationInProgressSavePayload,
  type MemorizationPracticeMode,
  type MemorizedItem,
} from '../types/memorization';
import { isKeyboardPracticeMode } from './memorization/memorizationKeyboardPractice';
import { MemorizeListenSpeed } from './memorization/memorizeListenSpeedStorage';
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  buildMemorizationChoiceLabels,
  buildMemorizationReorderChunks,
  cueGlyphForTypableToken,
  formatMemorizationTokensPlain,
  hiddenFractionForRound,
  pickHiddenCueTypableSlotIndices,
  reorderMovableCountForRound,
  seedRandom,
  stringToSeed,
  type MemorizationToken,
} from './memorization/memorizationPracticeUtils';
import {
  MEMORIZATION_WORD_CHOICE_COUNT_DIGIT,
  MEMORIZATION_WORD_CHOICE_COUNT_WORD,
  MEMORIZE_INTRO_START_ROUND_OPTIONS,
  MEMORIZE_LISTEN_CONTROLS_DIALOG_ID,
  MEMORIZE_LISTEN_CONTROLS_TITLE_ID,
  MEMORIZE_PRACTICE_BLUE_BTN_CLASS,
  MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS,
  MEMORIZE_PRACTICE_BLUE_BTN_HINT_CLASS,
} from './memorization-practice-session-ui';
import type { MemorizationPracticeSessionHeaderComponent } from '../components/memorization-practice-session/memorization-practice-session-header.component';
import type { MemorizationPracticeSessionPracticingComponent } from '../components/memorization-practice-session/memorization-practice-session-practicing.component';
import {
  runPracticeSessionScrollActiveFirstLetterCueIntoView,
  runPracticeSessionScrollCurrentBlankIntoView,
} from './memorization-practice-session-scroll-run';

function reorderChunksEmpty() {
  return [] as ReturnType<typeof buildMemorizationReorderChunks>;
}

type Phase = 'intro' | 'practicing' | 'done';

export abstract class MemorizationPracticeSessionFacadeBase {
  readonly document = inject(DOCUMENT);
  readonly cdr = inject(ChangeDetectorRef);
  readonly ngZone = inject(NgZone);
  readonly scripture = inject(ScriptureService);
  readonly userSessionService = inject(UserSessionService);
  // @removal-recite
  readonly reciteSettingsService = inject(MemorizationReciteSettingsService);

  item!: MemorizedItem;
  isOpen = false;
  closed = new EventEmitter<void>();
  completed = new EventEmitter<PracticeSessionResult>();
  persistInProgress = new EventEmitter<MemorizationInProgressSavePayload>();
  clearInProgress = new EventEmitter<void>();
  openSettings = new EventEmitter<void>();

  headerPanelRef?: MemorizationPracticeSessionHeaderComponent;
  practicingPanelRef?: MemorizationPracticeSessionPracticingComponent;
  practiceScrollRef?: ElementRef<HTMLDivElement>;
  practiceInputRef?: ElementRef<HTMLInputElement>;
  passageAudioRef?: ElementRef<HTMLAudioElement>;

  get recitePractice(): MemorizationRecitePracticeComponent | undefined {
    return this.practicingPanelRef?.recitePracticeRef;
  }

  get firstLetterCuesViewportRef(): ElementRef<HTMLDivElement> | undefined {
    return this.practicingPanelRef?.firstLetterCuesViewportRef;
  }

  get practiceWordsWordRef(): ElementRef<HTMLDivElement> | undefined {
    return this.practicingPanelRef?.practiceWordsWordRef;
  }

  get practiceWordsTypeRef(): ElementRef<HTMLLabelElement> | undefined {
    return this.practicingPanelRef?.practiceWordsTypeRef;
  }

  get hintButtonRef(): ElementRef<HTMLButtonElement> | undefined {
    return this.headerPanelRef?.hintButtonRef;
  }

  readonly MEMORIZATION_FULL_HIDE_ROUND = MEMORIZATION_FULL_HIDE_ROUND;
  readonly MEMORIZE_LISTEN_CONTROLS_DIALOG_ID = MEMORIZE_LISTEN_CONTROLS_DIALOG_ID;
  readonly MEMORIZE_LISTEN_CONTROLS_TITLE_ID = MEMORIZE_LISTEN_CONTROLS_TITLE_ID;
  readonly startRoundOptions = MEMORIZE_INTRO_START_ROUND_OPTIONS;
  readonly formatMemorizationTokensPlain = formatMemorizationTokensPlain;
  readonly hiddenFractionForRound = hiddenFractionForRound;
  readonly reorderMovableCountForRound = reorderMovableCountForRound;
  readonly cueGlyphForTypableToken = cueGlyphForTypableToken;
  readonly isKeyboardPracticeMode = isKeyboardPracticeMode;
  readonly Math = Math;
  readonly practiceBlueBtnFillClass = MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS;
  readonly practiceBlueBtnClass = MEMORIZE_PRACTICE_BLUE_BTN_CLASS;
  readonly practiceBlueBtnHintClass = MEMORIZE_PRACTICE_BLUE_BTN_HINT_CLASS;

  phase: Phase = 'intro';
  practiceMode: MemorizationPracticeMode | null = null;
  modePickerOpen = false;
  startRoundChoice = 1;
  roundIndex = 0;
  hasTypedInRound = false;
  hiddenIndices = new Set<number>();
  revealed = new Set<number>();
  firstLetterCueRevealedSlots = new Set<number>();
  reorderSlotChunkIds: number[] = [];
  reorderRoundMovableIndices = new Set<number>();
  wrongAttemptsTotal = 0;
  wrongAttemptsInRound = 0;
  correctKeystrokesTotal = 0;
  strictModeEnabled = false;
  /** Set when a round ends; gates Next round in strict mode until repeat clears it. */
  roundCompletedWithErrors = false;
  consecutiveWrong = 0;
  pendingBetweenRoundsErrors = 0;
  /** Set when final round completes with errors before session bootstrap; cleared after reconcile. */
  deferFinalRoundUntilSessionInit = false;
  flashError = false;
  hintHeld = false;
  hintPeekCount = 1;
  awaitingRoundAdvance = false;
  roundAffirmation = '';
  completionMessage = '';
  keyboardInsetPx = 0;
  /** Mount hidden practice input early on resume so mobile keyboards can open in the open gesture. */
  resumeKeyboardPrimeActive = false;
  listenPanelOpen = false;
  listenPlaybackRate: MemorizeListenSpeed = 1;
  repeatListenOn = false;
  passageAudioPlaying = false;
  listenUiTick = 0;

  tokens: MemorizationToken[] = [];
  reorderChunks = reorderChunksEmpty();
  reorderColonAfterSlotIndex: number | null = null;
  typableIndices: number[] = [];
  isBibleBooks = false;
  memorizeAndroidHost = false;
  listenViaStreamingAudio = false;
  translationListenEnabled = false;
  passageAudioUrl: string | null = null;
  passageLoading = false;
  passageLoadError: string | null = null;

  // @removal-recite
  reciteSettingsLoaded = false;
  reciteEnabled = false;
  reciteModeBlockedMessage: string | null = null;
  reciteFeedbackHelpOpen = false;

  passageText = '';
  passageHydratedForOpen = false;
  passageLoadSeq = 0;
  sessionSeed = '';
  practiceCompleted = false;
  roundAdvanceHandled: number | null = null;
  wrongAttemptsRef = 0;
  correctKeystrokesRef = 0;
  awaitingRoundAdvanceRef = false;
  practiceModeRef: MemorizationPracticeMode | null = null;
  androidScrollClampUntil = 0;
  suppressInputFromKeydown = false;
  openedLayoutOnceForVerseId: string | null = null;
  lastVerseIdForLayout = '';
  lastAudioResetVerseId: string | null = null;
  memorizeListenTtsRateAtStart: MemorizeListenSpeed | null = null;
  memorizeListenTtsUserPaused = false;
  memorizeListenTtsPostResume = false;
  memorizeWebSpeechUtteranceIsOurs = false;
  listenPlaybackRateRef: MemorizeListenSpeed = 1;
  repeatListenOnRef = false;
  listenRepeatGapTimer: ReturnType<typeof setTimeout> | null = null;
  scrollBlankTimer: ReturnType<typeof setTimeout> | null = null;
  hintIntervalId: ReturnType<typeof setInterval> | null = null;
  flashErrorTimer: ReturnType<typeof setTimeout> | null = null;
  strictModeSessionSub: Subscription | null = null;
  viewportListenersAttached = false;
  androidScrollListener: (() => void) | null = null;
  verseTouchMoved = false;
  verseTouchStart = { x: 0, y: 0 };
  practiceInputDomId = `memorize-practice-input-${Math.random().toString(36).slice(2, 9)}`;
  modePickerTitleId = `memorize-mode-picker-${Math.random().toString(36).slice(2, 9)}`;
  resizeObserver: ResizeObserver | null = null;
  hintCaptureListenersAttached = false;
  typeCaptureListenersAttached = false;

  get hintActive(): boolean {
    return this.hintHeld && this.phase === 'practicing';
  }

  get hiddenSorted(): number[] {
    return [...this.hiddenIndices].sort((a, b) => a - b);
  }

  get unrevealedHiddenSorted(): number[] {
    return this.hiddenSorted.filter((i) => !this.revealed.has(i));
  }

  get hintPeekIndices(): Set<number> {
    if (!this.hintActive) return new Set();
    return new Set(this.unrevealedHiddenSorted.slice(0, this.hintPeekCount));
  }

  get currentTargetIndex(): number | null {
    if (this.practiceModeRef === 'firstLetters') {
      for (const idx of this.typableIndices) {
        if (!this.revealed.has(idx)) return idx;
      }
      return null;
    }
    for (const idx of this.hiddenSorted) {
      if (!this.revealed.has(idx)) return idx;
    }
    return null;
  }

  get currentTargetToken(): MemorizationToken | null {
    return this.currentTargetIndex !== null
      ? (this.tokens[this.currentTargetIndex] ?? null)
      : null;
  }

  get firstLetterCueHiddenSlots(): Set<number> {
    if (this.practiceMode !== 'firstLetters' || this.phase !== 'practicing') return new Set();
    const seed = this.sessionSeed || this.item.id;
    return pickHiddenCueTypableSlotIndices(this.typableIndices.length, this.roundIndex, seed);
  }

  get listenInteractionAllowed(): boolean {
    return (
      this.translationListenEnabled &&
      (this.phase === 'intro' || (this.phase === 'practicing' && !this.awaitingRoundAdvance))
    );
  }

  get showListenOpeners(): boolean {
    return this.listenInteractionAllowed;
  }

  get showStartOver(): boolean {
    return this.phase === 'practicing' || (this.phase === 'intro' && !!this.item.inProgressPractice);
  }

  // @removal-recite
  get recitePhase() {
    return this.recitePractice?.phase ?? 'ready';
  }

  get reciteAlignment() {
    return this.recitePractice?.alignment ?? null;
  }

  get reciteStarting(): boolean {
    return this.recitePractice?.starting ?? false;
  }

  get reciteSettingsLoadedForRecord(): boolean {
    return this.reciteSettingsLoaded || (this.recitePractice?.settingsLoaded ?? false);
  }

  get showReciteNextRoundOption(): boolean {
    return this.recitePractice?.showNextRoundOption ?? false;
  }

  get showReciteFinishOption(): boolean {
    return this.recitePractice?.showFinishOption ?? false;
  }

  get reciteModeVisible(): boolean {
    return computeReciteModeVisible({
      settingsLoaded: this.reciteSettingsLoaded,
      enabled: this.reciteEnabled,
      isBibleBooks: this.isBibleBooks,
    });
  }

  get reciteModeAvailable(): boolean {
    return computeReciteModeAvailable({
      settingsLoaded: this.reciteSettingsLoaded,
      enabled: this.reciteEnabled,
      isBibleBooks: this.isBibleBooks,
      reference: this.item.reference,
    });
  }

  get displayPracticeErrors(): number {
    if (isRecitePracticeMode(this.practiceMode) && this.recitePractice) {
      return this.recitePractice.displayPracticeErrors;
    }
    return this.wrongAttemptsInRound;
  }

  /** Strict mode: advance only after a perfect round (no wrong attempts). */
  get isFinalRound(): boolean {
    return this.roundIndex >= MEMORIZATION_FULL_HIDE_ROUND;
  }

  get showNextRoundOption(): boolean {
    if (this.isFinalRound) return false;
    if (!this.roundCompletedWithErrors) return true;
    if (this.wrongAttemptsInRound <= 0) return true;
    if (!this.userSessionService.isSessionInitialized()) return false;
    return !this.strictModeEnabled;
  }

  /** Final round in standard mode: finish with errors after resume or strict-mode toggle. */
  get showFinishPracticeOption(): boolean {
    return (
      this.awaitingRoundAdvance &&
      this.isFinalRound &&
      this.userSessionService.isSessionInitialized() &&
      !this.strictModeEnabled
    );
  }

  get roundAdvanceHeaderCopy(): string {
    if (!this.awaitingRoundAdvance) return '';
    if (this.isFinalRound) {
      if (this.showFinishPracticeOption) {
        return `Round ${this.roundIndex} complete — repeat this round or finish practice.`;
      }
      if (!this.userSessionService.isSessionInitialized()) {
        return `Round ${this.roundIndex} complete — repeat this round or finish practice once settings load.`;
      }
      return `Round ${this.roundIndex} complete — repeat this round until you finish with no errors.`;
    }
    return `Round ${this.roundIndex} complete — repeat or continue to round ${this.roundIndex + 1}.`;
  }

  get listenButtonLabel(): string {
    void this.listenUiTick;
    if (this.listenViaStreamingAudio) {
      const el = this.passageAudioRef?.nativeElement;
      if (el?.getAttribute('src')) {
        return !el.paused && !el.ended ? 'Pause' : 'Listen';
      }
      return this.passageAudioPlaying ? 'Pause' : 'Listen';
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return 'Listen';
    const syn = window.speechSynthesis;
    if (this.memorizeListenTtsUserPaused) return 'Listen';
    if (this.memorizeListenTtsPostResume && syn.speaking) return 'Pause';
    if (syn.speaking && !syn.paused) return 'Pause';
    return 'Listen';
  }

  get listenAriaPressed(): boolean {
    void this.listenUiTick;
    if (this.listenViaStreamingAudio) {
      const el = this.passageAudioRef?.nativeElement;
      if (el?.getAttribute('src')) return !el.paused && !el.ended;
      return this.passageAudioPlaying;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    const syn = window.speechSynthesis;
    if (this.memorizeListenTtsUserPaused) return false;
    if (this.memorizeListenTtsPostResume && syn.speaking) return true;
    return syn.speaking && !syn.paused;
  }

  get readAloudDialogPrimaryLabel(): string {
    return this.listenButtonLabel === 'Listen' ? 'Play' : this.listenButtonLabel;
  }

  get readAloudDialogPrimaryAriaLabel(): string {
    if (this.listenButtonLabel === 'Pause') return 'Pause read-aloud of the passage';
    if (this.listenViaStreamingAudio) return 'Play the passage read aloud (ESV audio)';
    return 'Play: read the memorized text aloud using the device (same translation is not available as streaming audio)';
  }

  get wordChoiceLabels(): string[] {
    if (this.practiceMode !== 'word') return [];
    if (this.phase !== 'practicing' || this.awaitingRoundAdvance) return [];
    if (this.currentTargetIndex === null || !this.sessionSeed) return [];
    const rng = seedRandom(
      stringToSeed(`${this.sessionSeed}-mem-word-r${this.roundIndex}-t${this.currentTargetIndex}`)
    );
    const targetTok = this.tokens[this.currentTargetIndex];
    const choiceCount =
      targetTok?.kind === 'digit'
        ? MEMORIZATION_WORD_CHOICE_COUNT_DIGIT
        : MEMORIZATION_WORD_CHOICE_COUNT_WORD;
    return buildMemorizationChoiceLabels(
      this.tokens,
      this.typableIndices,
      this.currentTargetIndex,
      choiceCount,
      rng
    );
  }

  get practiceScrollElement(): HTMLDivElement | null {
    return this.practiceScrollRef?.nativeElement ?? null;
  }

  get practiceInputId(): string {
    return this.practiceInputDomId;
  }

  get modePickerTitle(): string {
    return this.modePickerTitleId;
  }

  /** Public so scroll-run can invoke without same-module spy gaps; tests spy these on the component. */
  scrollActiveFirstLetterCueIntoView(): void {
    runPracticeSessionScrollActiveFirstLetterCueIntoView(this);
  }

  scrollCurrentBlankIntoView(): void {
    runPracticeSessionScrollCurrentBlankIntoView(this);
  }

  abstract finishPracticeSession(): void;
}
