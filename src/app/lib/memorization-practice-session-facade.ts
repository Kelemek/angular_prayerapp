import {
  AfterViewInit,
  ChangeDetectorRef,
  ElementRef,
  EventEmitter,
  Injectable,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { ScriptureService } from '../services/scripture.service';
import { UserSessionService } from '../services/user-session.service';
// @removal-recite
import { MemorizationReciteSettingsService } from '../services/memorization-recite-settings.service';
import {
  MemorizationRecitePracticeComponent,
  type ReciteAttemptMetrics,
} from '../memorization-recite/memorization-recite-practice.component';
import {
  MEMORIZATION_RECITE_PRACTICE_MODE,
  RECITE_VERSE_LIMIT_MESSAGE,
  computeReciteModeAvailable,
  computeReciteModeVisible,
  isRecitePracticeMode,
} from '../memorization-recite/integration';
import type { PracticeSessionResult } from '../services/memorization.service';
import {
  isMemorizationListenTranslation,
  type MemorizationInProgress,
  type MemorizationInProgressSavePayload,
  type MemorizationPracticeMode,
  type MemorizedItem,
} from '../types/memorization';
import {
  pickRandomAllDoneMessage,
  pickRandomRoundAffirmation,
} from './memorization/memorizationEncouragementMessages';
import {
  memorizeStickyHeaderVisibleTop,
  memorizeWordModeVisibleBottom,
} from './memorization/memorizationScrollIntoPractice';
import {
  isMemorizeAndroidWebHost,
  isMemorizeIosWebHost,
} from './memorization/memorizationViewportPlatform';
import { getMemorizationListenUtteranceText } from './memorization/memorizationListenUtteranceText';
import { stripScriptureForMemorization } from './memorization/strip-scripture-for-memorization';
import {
  booksForScope,
  isBibleBooksMemorizationItem,
} from './memorization/bibleBooksMemorization';
import { isKeyboardPracticeMode } from './memorization/memorizationKeyboardPractice';
import {
  trackMemorizationPracticeCompleted,
  trackMemorizationPracticeSessionStart,
} from './memorization/memorizationPracticeAnalytics';
import {
  applyMemorizeListenPlaybackRateToMediaElement,
  MEMORIZE_LISTEN_REPEAT_GAP_MS,
  MemorizeListenSpeed,
  readMemorizeListenSpeedFromStorage,
  toMemorizeWebSpeechUtteranceRate,
  writeMemorizeListenSpeedToStorage,
} from './memorization/memorizeListenSpeedStorage';
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  buildInitialReorderSlotAssignment,
  buildBibleBooksReorderChunks,
  buildMemorizationChoiceLabels,
  buildMemorizationReorderChunks,
  buildMemorizationTokens,
  cueGlyphForTypableToken,
  firstLetterOfWord,
  formatMemorizationTokensPlain,
  generateMemorizationSessionSeed,
  getTypableTokenIndices,
  hiddenFractionForRound,
  pickHiddenCueTypableSlotIndices,
  pickReorderMovableIndices,
  reorderMovableCountForRound,
  reorderReferenceColonAfterSlotIndex,
  seedRandom,
  stringToSeed,
  type MemorizationToken,
} from './memorization/memorizationPracticeUtils';
import {
  ANDROID_SCROLL_CLAMP_MS,
  MAX_WRONG_BEFORE_REVEAL,
  MEMORIZATION_WORD_CHOICE_COUNT_DIGIT,
  MEMORIZATION_WORD_CHOICE_COUNT_WORD,
  MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX,
  MEMORIZE_EXTRA_GAP_ABOVE_WORD_CHOICES_PX,
  MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS,
  MEMORIZE_INTRO_START_ROUND_OPTIONS,
  MEMORIZE_LISTEN_CONTROLS_DIALOG_ID,
  MEMORIZE_LISTEN_CONTROLS_TITLE_ID,
  MEMORIZE_PRACTICE_BLUE_BTN_CLASS,
  MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS,
  MEMORIZE_PRACTICE_BLUE_BTN_HINT_CLASS,
  hiddenTypingTokenIndices,
} from './memorization-practice-session-ui';
import type { MemorizationPracticeSessionHeaderComponent } from '../components/memorization-practice-session/memorization-practice-session-header.component';
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
} from './memorization-practice-session-round-run';
import type { MemorizationPracticeSessionPracticingComponent } from '../components/memorization-practice-session/memorization-practice-session-practicing.component';

export type { PracticeSessionResult };

type Phase = 'intro' | 'practicing' | 'done';

@Injectable()
export class MemorizationPracticeSessionFacade {
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
    return !this.mustRepeatDueToErrors();
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      const prev = changes['item'].previousValue as MemorizedItem | undefined;
      const passageSourceChanged =
        !prev ||
        prev.id !== this.item.id ||
        prev.reference !== this.item.reference ||
        prev.translation !== this.item.translation;

      this.recomputeDerivedFromItem();
      this.handleItemIdChange();
      if (
        this.isOpen &&
        !this.isBibleBooks &&
        !changes['item'].firstChange &&
        passageSourceChanged
      ) {
        this.passageHydratedForOpen = false;
        void this.loadPassageText();
      }
    }
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.onOpen();
      } else {
        this.onCloseCleanup();
      }
    }
  }

  ngAfterViewInit(): void {
    this.syncRefs();
    this.attachPracticeListeners();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.onCloseCleanup();
    this.detachAllListeners();
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
    this.stopPassageAudio();
    // @removal-recite
    if (isRecitePracticeMode(this.practiceMode)) {
      await this.recitePractice?.prepareClose();
    }
    if (this.sessionSeed && this.phase === 'practicing') {
      this.syncMetricRefs();
      if (this.awaitingRoundAdvance) {
        this.persistPracticeSnapshot({ kind: 'betweenRounds', completedRoundIndex: this.roundIndex });
      } else {
        this.persistPracticeSnapshot({ kind: 'inRound', roundIndex: this.roundIndex });
      }
    }
    this.closed.emit();
  }

  handleStartOver(): void {
    this.listenPanelOpen = false;
    this.stopPassageAudio();
    // @removal-recite
    this.recitePractice?.cancel();
    this.clearInProgress.emit();
    this.sessionSeed = '';
    this.practiceCompleted = false;
    this.roundAdvanceHandled = null;
    this.openedLayoutOnceForVerseId = null;
    this.lastVerseIdForLayout = this.item.id;
    this.resetToIntro();
    this.cdr.markForCheck();
  }

  async openModePicker(): Promise<void> {
    await this.fetchReciteSettings();
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
      this.beginRecitePractice();
      return;
    }
    this.reciteModeBlockedMessage = null;
    this.syncStrictModeFromSession();
    this.stopPassageAudio();
    this.modePickerOpen = false;
    this.practiceCompleted = false;
    this.wrongAttemptsTotal = 0;
    this.wrongAttemptsInRound = 0;
    this.correctKeystrokesTotal = 0;
    this.syncMetricRefs();
    this.sessionSeed = generateMemorizationSessionSeed();
    trackMemorizationPracticeSessionStart(this.sessionSeed, this.item, mode);
    this.practiceModeRef = mode;
    const r = Math.min(MEMORIZATION_FULL_HIDE_ROUND, Math.max(1, Math.floor(this.startRoundChoice)));
    this.practiceMode = mode;
    this.startRound(r);
    if (this.practiceScrollRef?.nativeElement) {
      this.practiceScrollRef.nativeElement.scrollTop = 0;
    }
    this.scheduleKeyboardPracticeFocus();
    this.schedulePracticeEffects();
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
    this.clearHintInterval();
  }

  onReciteAttemptMetrics(metrics: ReciteAttemptMetrics): void {
    this.wrongAttemptsInRound += metrics.wrong;
    this.wrongAttemptsTotal += metrics.wrong;
    this.correctKeystrokesTotal += metrics.correct;
    this.roundCompletedWithErrors = metrics.hadErrors;
    this.hasTypedInRound = true;
    this.syncMetricRefs();
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
    this.onRoundComplete();
    if (this.practiceCompleted) return;
    if (this.showNextRoundOption) {
      this.nextRound();
    }
    this.cdr.markForCheck();
  }

  onReciteFinishPractice(): void {
    this.recitePractice?.applyAttemptMetrics();
    this.onRoundComplete();
    if (!this.practiceCompleted) {
      this.finishPracticeSession();
    }
    this.cdr.markForCheck();
  }

  private beginRecitePractice(): void {
    this.syncStrictModeFromSession();
    this.stopPassageAudio();
    this.modePickerOpen = false;
    this.practiceCompleted = false;
    this.wrongAttemptsTotal = 0;
    this.wrongAttemptsInRound = 0;
    this.correctKeystrokesTotal = 0;
    this.syncMetricRefs();
    this.sessionSeed = generateMemorizationSessionSeed();
    trackMemorizationPracticeSessionStart(
      this.sessionSeed,
      this.item,
      MEMORIZATION_RECITE_PRACTICE_MODE
    );
    this.practiceModeRef = MEMORIZATION_RECITE_PRACTICE_MODE;
    this.practiceMode = MEMORIZATION_RECITE_PRACTICE_MODE;
    const r = Math.min(MEMORIZATION_FULL_HIDE_ROUND, Math.max(1, Math.floor(this.startRoundChoice)));
    this.startRound(r);
    if (this.practiceScrollRef?.nativeElement) {
      this.practiceScrollRef.nativeElement.scrollTop = 0;
    }
    void this.recitePractice?.refreshSettings();
    this.persistInProgress.emit({
      sessionSeed: this.sessionSeed,
      wrongAttempts: this.wrongAttemptsRef,
      correctKeystrokes: this.correctKeystrokesRef,
      phase: { kind: 'inRound', roundIndex: r },
      practiceMode: MEMORIZATION_RECITE_PRACTICE_MODE,
    });
    this.cdr.markForCheck();
  }

  // @removal-recite
  loadReciteSettings(): void {
    this.reciteSettingsLoaded = false;
    this.cdr.markForCheck();
    void this.fetchReciteSettings();
  }

  private async fetchReciteSettings(): Promise<void> {
    const settings = await this.reciteSettingsService.getSettingsFromServer();
    this.ngZone.run(() => {
      this.reciteEnabled = settings.enabled;
      this.reciteSettingsLoaded = true;
      this.cdr.markForCheck();
    });
  }

  startRoundAndFocusInput(r: number): void {
    this.startRound(r);
    if (this.practiceScrollRef?.nativeElement) {
      this.practiceScrollRef.nativeElement.scrollTop = 0;
    }
    this.scheduleKeyboardPracticeFocus();
    this.schedulePracticeEffects();
    this.cdr.markForCheck();
  }

  repeatRound(): void {
    this.startRoundAndFocusInput(this.roundIndex);
    this.persistPracticeSnapshot({ kind: 'inRound', roundIndex: this.roundIndex });
  }

  nextRound(): void {
    if (!this.showNextRoundOption) return;
    const nextIndex = this.roundIndex + 1;
    this.startRoundAndFocusInput(nextIndex);
    this.persistPracticeSnapshot({ kind: 'inRound', roundIndex: this.roundIndex });
  }

  onHintPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.hintPeekCount = 1;
    this.hintHeld = true;
    this.startHintInterval();
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
    this.clearHintInterval();
    this.restorePracticeInputFocusAfterHint();
    this.cdr.markForCheck();
  }

  onHintPointerLeave(event: PointerEvent): void {
    if (event.buttons !== 0) return;
    this.hintPeekCount = 1;
    this.hintHeld = false;
    this.clearHintInterval();
    this.restorePracticeInputFocusAfterHint();
    this.cdr.markForCheck();
  }

  processWordGuess(label: string): void {
    if (this.hintActive || this.phase !== 'practicing' || this.currentTargetIndex === null) return;
    const token = this.tokens[this.currentTargetIndex];
    if (!token || token.kind === 'punct') return;
    this.hasTypedInRound = true;
    const correct = label === token.text;
    if (correct) {
      this.clearFlashError();
      const idx = this.currentTargetIndex;
      const next = new Set(this.revealed);
      next.add(idx);
      this.revealed = next;
      this.consecutiveWrong = 0;
      this.correctKeystrokesTotal += 1;
      this.syncMetricRefs();
    } else {
      this.recordWrongAttempt();
      this.consecutiveWrong += 1;
      this.tryAutoRevealAfterWrong();
      this.syncMetricRefs();
      this.flashErrorBriefly();
    }
    this.checkRoundCompletion();
    this.scheduleScrollToBlank();
    this.cdr.markForCheck();
  }

  onPracticeInputKeyDown(event: KeyboardEvent): void {
    if (this.hintActive || this.phase !== 'practicing' || this.currentTargetIndex === null) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;
    if (key.length !== 1) return;
    const token = this.tokens[this.currentTargetIndex];
    if (!token || token.kind === 'punct') return;
    const allow = token.kind === 'digit' ? /^[0-9]$/.test(key) : /^[a-zA-Z]$/.test(key);
    if (!allow) return;
    event.preventDefault();
    this.suppressInputFromKeydown = true;
    this.processKeystroke(key);
    setTimeout(() => {
      this.suppressInputFromKeydown = false;
    }, 0);
  }

  onPracticeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (this.suppressInputFromKeydown) {
      el.value = '';
      return;
    }
    if (this.hintActive) {
      el.value = '';
      return;
    }
    if (this.phase !== 'practicing' || this.currentTargetIndex === null) {
      el.value = '';
      return;
    }
    const v = el.value;
    if (v.length === 0) return;
    const last = v.slice(-1);
    el.value = '';
    const token = this.tokens[this.currentTargetIndex];
    if (!token || token.kind === 'punct') return;
    const ok = token.kind === 'digit' ? /^[0-9]$/.test(last) : /^[a-zA-Z]$/.test(last);
    if (!ok) return;
    this.processKeystroke(last);
  }

  onReorderInvalidDrop(): void {
    this.recordWrongAttempt();
    this.syncMetricRefs();
    this.flashErrorBriefly();
    this.cdr.markForCheck();
  }

  onReorderWrongSwap(): void {
    if (!this.strictModeEnabled) return;
    this.recordWrongAttempt();
    this.syncMetricRefs();
    this.flashErrorBriefly();
    this.cdr.markForCheck();
  }

  onReorderSlotsBecameCorrect(slots: number[]): void {
    if (slots.length === 0) return;
    this.correctKeystrokesTotal += slots.length;
    this.syncMetricRefs();
    this.checkRoundCompletion();
    this.cdr.markForCheck();
  }

  onReorderSlotChunkIdsChange(next: number[]): void {
    this.reorderSlotChunkIds = next;
    this.checkRoundCompletion();
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
    this.focusPracticeInput();
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

private onOpen(): void {
    runPracticeSessionOnOpen(this);
  }

  /**
   * When reopening an in-progress type/initials round, mount the hidden input and focus it
   * immediately so iOS/Android show the keyboard. Deferred focus after passage load is too late.
   */
private primeKeyboardFocusForResume(): void {
    runPracticeSessionPrimeKeyboardFocusForResume(this);
  }

private onCloseCleanup(): void {
    runPracticeSessionOnCloseCleanup(this);
  }

private recomputeDerivedFromItem(): void {
    runPracticeSessionRecomputeDerivedFromItem(this);
  }

private async loadPassageText(): Promise<void> {
    await runPracticeSessionLoadPassageText(this);
  }

private async loadAudioUrl(): Promise<void> {
    await runPracticeSessionLoadAudioUrl(this);
  }

private handleItemIdChange(): void {
    runPracticeSessionHandleItemIdChange(this);
  }

private resetToIntro(): void {
    runPracticeSessionResetToIntro(this);
  }

private hydrateInProgressOnce(): void {
    runPracticeSessionHydrateInProgressOnce(this);
  }

private startRound(r: number): void {
    runPracticeSessionStartRound(this, r);
  }

private revealFirstLetterCueForToken(tokenIndex: number): void {
    runPracticeSessionRevealFirstLetterCueForToken(this, tokenIndex);
  }

private processKeystroke(key: string): void {
    runPracticeSessionProcessKeystroke(this, key);
  }

  consecutiveWrong = 0;

private handleWrongKeystroke(): void {
    runPracticeSessionHandleWrongKeystroke(this);
  }

private recordWrongAttempt(): void {
    runPracticeSessionRecordWrongAttempt(this);
  }

private syncStrictModeFromSession(): void {
    runPracticeSessionSyncStrictModeFromSession(this);
  }

private refreshStrictModeFromSession(): void {
    runPracticeSessionRefreshStrictModeFromSession(this);
  }

private attachStrictModeSessionSubscription(): void {
    runPracticeSessionAttachStrictModeSessionSubscription(this);
  }

private detachStrictModeSessionSubscription(): void {
    runPracticeSessionDetachStrictModeSessionSubscription(this);
  }

private applyStrictModeFromSession(strict: boolean): void {
    runPracticeSessionApplyStrictModeFromSession(this, strict);
  }

  /** Block auto-reveal until session bootstrap resolves strict vs standard. */
private isAutoRevealBlocked(): boolean {
    return runPracticeSessionIsAutoRevealBlocked(this);
  }

  /**
   * Legacy in-progress saves omitted per-round error counts; infer from session totals
   * so strict mode still tracks round errors after resume.
   */
private resolveHydratedWrongAttemptsInRound(ip: MemorizationInProgress): number {
    return runPracticeSessionResolveHydratedWrongAttemptsInRound(this, ip);
  }

  /** Strict mode (or pending session) requires repeating after errors before advancing mid-run. */
private mustRepeatDueToErrors(): boolean {
    return runPracticeSessionMustRepeatDueToErrors(this);
  }

  /** Final round: defer until session loads, then repeat only in strict mode. */
private mustRepeatFinalRound(): boolean {
    return runPracticeSessionMustRepeatFinalRound(this);
  }

  /** Standard mode on final round: auto-finish with errors once session bootstrap resolves. */
private reconcileFinalRoundAfterSessionLoad(): void {
    runPracticeSessionReconcileFinalRoundAfterSessionLoad(this);
  }

private tryAutoRevealAfterWrong(revealFirstLetterCue = false): void {
    runPracticeSessionTryAutoRevealAfterWrong(this, revealFirstLetterCue = false);
  }

private checkRoundCompletion(): void {
    runPracticeSessionCheckRoundCompletion(this);
  }

private onRoundComplete(): void {
    runPracticeSessionOnRoundComplete(this);
  }

  pendingBetweenRoundsErrors = 0;
  /** Set when final round completes with errors before session bootstrap; cleared after reconcile. */
  deferFinalRoundUntilSessionInit = false;

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

private persistPracticeSnapshot(phasePayload: MemorizationInProgressSavePayload['phase']): void {
    runPracticeSessionPersistPracticeSnapshot(this, phasePayload);
  }

private syncMetricRefs(): void {
    runPracticeSessionSyncMetricRefs(this);
  }


private flashErrorBriefly(): void {
    runPracticeSessionFlashErrorBriefly(this);
  }

private clearFlashError(): void {
    runPracticeSessionClearFlashError(this);
  }

private syncFlashErrorView(): void {
    runPracticeSessionSyncFlashErrorView(this);
  }

private bumpListen(): void {
    runPracticeSessionBumpListenUi(this);
  }

private stopPassageAudio(): void {
    runPracticeSessionStopPassageAudio(this);
  }

private clearListenRepeatGapTimer(): void {
    runPracticeSessionClearListenRepeatGapTimer(this);
  }

private async playStreamingAudio(el: HTMLAudioElement, fromStart = false): Promise<void> {
    await runPracticeSessionPlayStreamingAudio(this, el, fromStart);
  }

private handleTtsListenClick(): void {
    runPracticeSessionHandleTtsListenClick(this);
  }

private beginTtsUtterance(): void {
    runPracticeSessionBeginTtsUtterance(this);
  }

private resolvePracticeInputEl(): HTMLInputElement | null {
    return runPracticeSessionResolvePracticeInputEl(this);
  }

private focusPracticeInput(): boolean {
    return runPracticeSessionFocusPracticeInput(this);
  }

  /** Focus hidden input after practice UI renders (OnPush + @if). Opens keyboard on mobile. */
private scheduleKeyboardPracticeFocus(): void {
    runPracticeSessionScheduleKeyboardPracticeFocus(this);
  }

private restorePracticeInputFocusAfterHint(): void {
    runPracticeSessionRestorePracticeInputFocusAfterHint(this);
  }

private startHintInterval(): void {
    runPracticeSessionStartHintInterval(this);
  }

private schedulePracticeEffects(): void {
    runPracticeSessionSchedulePracticeEffects(this);
  }

  private scheduleScrollToBlank(options?: { force?: boolean }): void {
    runPracticeSessionScheduleScrollToBlank(this, options);
  }

  scrollActiveFirstLetterCueIntoView(): void {
    runPracticeSessionScrollActiveFirstLetterCueIntoView(this);
  }

  scrollCurrentBlankIntoView(): void {
    runPracticeSessionScrollCurrentBlankIntoView(this);
  }

private attachViewportListeners(): void {
    runPracticeSessionAttachViewportListeners(this);
  }

private attachPracticeListeners(): void {
    runPracticeSessionAttachPracticeListeners(this);
  }

private attachAndroidScrollClamp(): void {
    runPracticeSessionAttachAndroidScrollClamp(this);
  }

private attachTypeModeCapture(): void {
    runPracticeSessionAttachTypeModeCapture(this);
  }

private ensureTypeModeCaptureAttached(): void {
    runPracticeSessionEnsureTypeModeCaptureAttached(this);
  }

private attachHintCapture(): void {
    runPracticeSessionAttachHintCapture(this);
  }

private ensureHintCaptureAttached(): void {
    runPracticeSessionEnsureHintCaptureAttached(this);
  }

private keepPracticeInputOnPointerCapture(e: PointerEvent | TouchEvent): void {
    runPracticeSessionKeepPracticeInputOnPointerCapture(this, e);
  }

private attachFirstLetterResizeObserver(): void {
    runPracticeSessionAttachFirstLetterResizeObserver(this);
  }

private detachAllListeners(): void {
    runPracticeSessionDetachAllListeners(this);
  }

private clearHintInterval(): void {
    runPracticeSessionClearHintInterval(this);
  }

  private syncRefs(): void {
    this.syncMetricRefs();
  }
}

function reorderChunksEmpty() {
  return [] as ReturnType<typeof buildMemorizationReorderChunks>;
}
