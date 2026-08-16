import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { ScriptureService } from '../../services/scripture.service';
import { UserSessionService } from '../../services/user-session.service';
// @removal-recite
import { MemorizationReciteSettingsService } from '../../services/memorization-recite-settings.service';
import {
  MemorizationRecitePracticeComponent,
  type ReciteAttemptMetrics,
} from '../../memorization-recite/memorization-recite-practice.component';
import {
  MEMORIZATION_RECITE_PRACTICE_MODE,
  RECITE_VERSE_LIMIT_MESSAGE,
  computeReciteModeAvailable,
  computeReciteModeVisible,
  isRecitePracticeMode,
} from '../../memorization-recite/integration';
import type { PracticeSessionResult } from '../../services/memorization.service';
import {
  isMemorizationListenTranslation,
  type MemorizationInProgress,
  type MemorizationInProgressSavePayload,
  type MemorizationPracticeMode,
  type MemorizedItem,
} from '../../types/memorization';
import {
  pickRandomAllDoneMessage,
  pickRandomRoundAffirmation,
} from '../../lib/memorization/memorizationEncouragementMessages';
import {
  memorizeStickyHeaderVisibleTop,
  memorizeWordModeVisibleBottom,
} from '../../lib/memorization/memorizationScrollIntoPractice';
import {
  isMemorizeAndroidWebHost,
  isMemorizeIosWebHost,
} from '../../lib/memorization/memorizationViewportPlatform';
import { getMemorizationListenUtteranceText } from '../../lib/memorization/memorizationListenUtteranceText';
import { stripScriptureForMemorization } from '../../lib/memorization/strip-scripture-for-memorization';
import {
  booksForScope,
  isBibleBooksMemorizationItem,
} from '../../lib/memorization/bibleBooksMemorization';
import { isKeyboardPracticeMode } from '../../lib/memorization/memorizationKeyboardPractice';
import {
  trackMemorizationPracticeCompleted,
  trackMemorizationPracticeSessionStart,
} from '../../lib/memorization/memorizationPracticeAnalytics';
import {
  applyMemorizeListenPlaybackRateToMediaElement,
  MEMORIZE_LISTEN_REPEAT_GAP_MS,
  MemorizeListenSpeed,
  readMemorizeListenSpeedFromStorage,
  toMemorizeWebSpeechUtteranceRate,
  writeMemorizeListenSpeedToStorage,
} from '../../lib/memorization/memorizeListenSpeedStorage';
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
  pickHiddenWordIndices,
  pickReorderMovableIndices,
  reorderMovableCountForRound,
  reorderReferenceColonAfterSlotIndex,
  seedRandom,
  stringToSeed,
  type MemorizationToken,
} from '../../lib/memorization/memorizationPracticeUtils';
import { MemorizationReorderPanelComponent } from '../memorization-reorder-panel/memorization-reorder-panel.component';
import { MemorizationWordChoicesFooterComponent } from '../memorization-word-choices-footer/memorization-word-choices-footer.component';
import { MemorizeListenControlsDialogComponent } from '../memorize-listen-controls-dialog/memorize-listen-controls-dialog.component';
import { BibleBooksMemorizationListComponent } from '../bible-books-memorization-list/bible-books-memorization-list.component';
import { ScriptureAttributionComponent } from '../scripture-attribution/scripture-attribution.component';

export type { PracticeSessionResult };

type Phase = 'intro' | 'practicing' | 'done';

const MAX_WRONG_BEFORE_REVEAL = 3;
const MEMORIZATION_WORD_CHOICE_COUNT_WORD = 8;
const MEMORIZATION_WORD_CHOICE_COUNT_DIGIT = 6;
const MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX = 48;
const MEMORIZE_EXTRA_GAP_ABOVE_WORD_CHOICES_PX = 16;
const MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS = 1000;
const ANDROID_SCROLL_CLAMP_MS = 600;
const MEMORIZE_LISTEN_CONTROLS_DIALOG_ID = 'memorize-listen-controls-dialog';
const MEMORIZE_LISTEN_CONTROLS_TITLE_ID = 'memorize-listen-controls-title';

const MEMORIZE_INTRO_START_ROUND_OPTIONS = Array.from(
  { length: MEMORIZATION_FULL_HIDE_ROUND },
  (_, i) => ({ value: i + 1, label: `Round ${i + 1}` })
);

function hiddenTypingTokenIndices(
  mode: MemorizationPracticeMode | null | undefined,
  roundIndex: number,
  seed: string,
  typableIndices: number[]
): Set<number> {
  if (mode === 'firstLetters') return new Set(typableIndices);
  const localHidden = pickHiddenWordIndices(typableIndices.length, roundIndex, seed);
  return new Set([...localHidden].map((li) => typableIndices[li]!));
}

/** Border matches header Request (`btn-chip-blue`). */
const MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS =
  'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-600 dark:border-blue-500';

const MEMORIZE_PRACTICE_BLUE_BTN_CLASS =
  `${MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS} rounded-lg font-medium transition-colors cursor-pointer`;

const MEMORIZE_PRACTICE_BLUE_BTN_HINT_CLASS =
  `${MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS} active:bg-blue-200 dark:active:bg-blue-900/70 text-sm rounded-lg transition-colors select-none touch-manipulation cursor-pointer font-medium`;

@Component({
  selector: 'app-memorization-practice-session',
  standalone: true,
  imports: [
    CommonModule,
    MemorizationReorderPanelComponent,
    MemorizationWordChoicesFooterComponent,
    MemorizeListenControlsDialogComponent,
    BibleBooksMemorizationListComponent,
    MemorizationRecitePracticeComponent,
    ScriptureAttributionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session.component.html',
  styles: [
    `
      /*
        Capture input for type/initials. WebKit will not open the software keyboard for
        opacity:0, visibility:hidden, display:none, or pointer-events:none fields — use a
        1px near-invisible strip instead. font-size 16px avoids iOS focus zoom.
      */
      .memorize-practice-input-hidden {
        position: fixed;
        left: 0;
        bottom: 0;
        width: 100%;
        height: 1px;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: transparent;
        caret-color: transparent;
        outline: none;
        box-shadow: none;
        opacity: 0.01;
        font-size: 16px;
        overflow: hidden;
        -webkit-appearance: none;
        appearance: none;
        -webkit-tap-highlight-color: transparent;
      }
      .memorize-practice-input-hidden:focus {
        outline: none;
        box-shadow: none;
      }
      /* Hide Safari contact/credential autofill controls on the off-screen practice input. */
      .memorize-practice-input-hidden::-webkit-contacts-auto-fill-button,
      .memorize-practice-input-hidden::-webkit-credentials-auto-fill-button {
        visibility: hidden;
        display: none !important;
        pointer-events: none;
        position: absolute;
        right: 0;
        opacity: 0;
      }
    `,
  ],
})
export class MemorizationPracticeSessionComponent
  implements OnChanges, OnDestroy, AfterViewInit
{
  private readonly document = inject(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly scripture = inject(ScriptureService);
  private readonly userSessionService = inject(UserSessionService);
  // @removal-recite
  private readonly reciteSettingsService = inject(MemorizationReciteSettingsService);

  @Input({ required: true }) item!: MemorizedItem;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<PracticeSessionResult>();
  @Output() persistInProgress = new EventEmitter<MemorizationInProgressSavePayload>();
  @Output() clearInProgress = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  @ViewChild(MemorizationRecitePracticeComponent) recitePractice?: MemorizationRecitePracticeComponent;
  @ViewChild('practiceScroll') practiceScrollRef?: ElementRef<HTMLDivElement>;
  @ViewChild('firstLetterCuesViewport') firstLetterCuesViewportRef?: ElementRef<HTMLDivElement>;
  @ViewChild('practiceWordsWord') practiceWordsWordRef?: ElementRef<HTMLDivElement>;
  @ViewChild('practiceWordsType') practiceWordsTypeRef?: ElementRef<HTMLLabelElement>;
  @ViewChild('practiceInput') practiceInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('passageAudio') passageAudioRef?: ElementRef<HTMLAudioElement>;
  @ViewChild('hintButton') hintButtonRef?: ElementRef<HTMLButtonElement>;

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

  private passageText = '';
  private passageHydratedForOpen = false;
  private passageLoadSeq = 0;
  private sessionSeed = '';
  private practiceCompleted = false;
  private roundAdvanceHandled: number | null = null;
  private wrongAttemptsRef = 0;
  private correctKeystrokesRef = 0;
  private awaitingRoundAdvanceRef = false;
  private practiceModeRef: MemorizationPracticeMode | null = null;
  private androidScrollClampUntil = 0;
  private suppressInputFromKeydown = false;
  private openedLayoutOnceForVerseId: string | null = null;
  private lastVerseIdForLayout = '';
  private lastAudioResetVerseId: string | null = null;
  private memorizeListenTtsRateAtStart: MemorizeListenSpeed | null = null;
  private memorizeListenTtsUserPaused = false;
  private memorizeListenTtsPostResume = false;
  private memorizeWebSpeechUtteranceIsOurs = false;
  private listenPlaybackRateRef: MemorizeListenSpeed = 1;
  private repeatListenOnRef = false;
  private listenRepeatGapTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollBlankTimer: ReturnType<typeof setTimeout> | null = null;
  private hintIntervalId: ReturnType<typeof setInterval> | null = null;
  private flashErrorTimer: ReturnType<typeof setTimeout> | null = null;
  private strictModeSessionSub: Subscription | null = null;
  private viewportListenersAttached = false;
  private androidScrollListener: (() => void) | null = null;
  private verseTouchMoved = false;
  private verseTouchStart = { x: 0, y: 0 };
  private practiceInputDomId = `memorize-practice-input-${Math.random().toString(36).slice(2, 9)}`;
  private modePickerTitleId = `memorize-mode-picker-${Math.random().toString(36).slice(2, 9)}`;
  private resizeObserver: ResizeObserver | null = null;
  private hintCaptureListenersAttached = false;
  private typeCaptureListenersAttached = false;

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

  @HostListener('window:keydown', ['$event'])
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
  private loadReciteSettings(): void {
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
    const el = this.passageAudioRef?.nativeElement;
    if (el) applyMemorizeListenPlaybackRateToMediaElement(el, this.listenPlaybackRateRef);
    this.passageAudioPlaying = true;
    this.cdr.markForCheck();
  }

  onPassageAudioPause(): void {
    this.passageAudioPlaying = false;
    this.cdr.markForCheck();
  }

  onPassageAudioEnded(): void {
    this.passageAudioPlaying = false;
    this.bumpListen();
    if (!this.repeatListenOnRef) return;
    this.clearListenRepeatGapTimer();
    this.listenRepeatGapTimer = setTimeout(() => {
      this.listenRepeatGapTimer = null;
      if (!this.repeatListenOnRef) return;
      const el = this.passageAudioRef?.nativeElement;
      if (!el) return;
      el.currentTime = 0;
      applyMemorizeListenPlaybackRateToMediaElement(el, this.listenPlaybackRateRef);
      void el.play().catch(() => {
        this.passageAudioPlaying = false;
        this.bumpListen();
        this.cdr.markForCheck();
      });
    }, MEMORIZE_LISTEN_REPEAT_GAP_MS);
  }

  onPassageAudioError(): void {
    this.passageAudioPlaying = false;
    this.cdr.markForCheck();
  }

  openListenPanel(): void {
    this.listenPanelOpen = true;
    this.bumpListen();
    this.cdr.markForCheck();
  }

  closeListenPanel(): void {
    this.listenPanelOpen = false;
    this.cdr.markForCheck();
  }

  onSelectListenSpeed(rate: MemorizeListenSpeed): void {
    this.listenPlaybackRate = rate;
    this.listenPlaybackRateRef = rate;
    writeMemorizeListenSpeedToStorage(rate);
    const el = this.passageAudioRef?.nativeElement;
    if (el) applyMemorizeListenPlaybackRateToMediaElement(el, rate);
    this.bumpListen();
    this.cdr.markForCheck();
  }

  handleListenPassageClick(): void {
    if (!this.listenInteractionAllowed) return;
    if (this.listenViaStreamingAudio) {
      const el = this.passageAudioRef?.nativeElement;
      if (!el) return;
      if (!el.paused) {
        this.clearListenRepeatGapTimer();
        el.pause();
        this.passageAudioPlaying = false;
        this.bumpListen();
        return;
      }
      void this.playStreamingAudio(el);
      return;
    }
    this.handleTtsListenClick();
  }

  handleRepeatListenToggle(): void {
    if (!this.listenInteractionAllowed) return;
    const next = !this.repeatListenOnRef;
    this.repeatListenOnRef = next;
    this.repeatListenOn = next;
    if (next) {
      if (this.listenViaStreamingAudio) {
        const el = this.passageAudioRef?.nativeElement;
        if (el?.paused) void this.playStreamingAudio(el, true);
        this.cdr.markForCheck();
        return;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && !window.speechSynthesis.speaking) {
        this.beginTtsUtterance();
      } else if (
        typeof window !== 'undefined' &&
        window.speechSynthesis?.speaking &&
        !this.memorizeWebSpeechUtteranceIsOurs
      ) {
        window.speechSynthesis.cancel();
        this.beginTtsUtterance();
      }
    } else {
      this.clearListenRepeatGapTimer();
    }
    this.bumpListen();
    this.cdr.markForCheck();
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
    this.memorizeAndroidHost = isMemorizeAndroidWebHost();
    this.listenPlaybackRate = readMemorizeListenSpeedFromStorage();
    this.listenPlaybackRateRef = this.listenPlaybackRate;
    this.document.body.style.overflow = 'hidden';
    this.document.documentElement.style.overflow = 'hidden';
    this.passageHydratedForOpen = false;
    // Allow hydrate + keyboard focus on every open (including resume of the same verse).
    this.openedLayoutOnceForVerseId = null;
    this.recomputeDerivedFromItem();
    // Mobile keyboards only open if focus happens in the same user-gesture turn as the tap
    // that opened the session — do this before any await (passage fetch).
    this.primeKeyboardFocusForResume();
    if (this.isBibleBooks) {
      this.passageText = '';
      this.passageLoading = false;
      this.passageLoadError = null;
      this.hydrateInProgressOnce();
      this.passageHydratedForOpen = true;
    } else {
      void this.loadPassageText();
    }
    this.loadAudioUrl();
    this.reciteSettingsLoaded = false;
    this.loadReciteSettings();
    this.attachViewportListeners();
    this.attachStrictModeSessionSubscription();
    if (this.isBibleBooks) {
      this.schedulePracticeEffects();
    }
    this.cdr.markForCheck();
  }

  /**
   * When reopening an in-progress type/initials round, mount the hidden input and focus it
   * immediately so iOS/Android show the keyboard. Deferred focus after passage load is too late.
   */
  private primeKeyboardFocusForResume(): void {
    const ip = this.item.inProgressPractice;
    if (!ip || ip.phase.kind !== 'inRound') {
      this.resumeKeyboardPrimeActive = false;
      return;
    }
    const mode = ip.practiceMode ?? 'type';
    if (!isKeyboardPracticeMode(mode)) {
      this.resumeKeyboardPrimeActive = false;
      return;
    }

    this.resumeKeyboardPrimeActive = true;
    this.practiceMode = mode;
    this.practiceModeRef = mode;
    this.cdr.markForCheck();
    try {
      this.cdr.detectChanges();
    } catch {
      // jsdom / test environments may not support full CD
    }
    this.scheduleKeyboardPracticeFocus();
  }

  private onCloseCleanup(): void {
    if (this.flashErrorTimer) {
      clearTimeout(this.flashErrorTimer);
      this.flashErrorTimer = null;
    }
    this.flashError = false;
    this.passageText = '';
    this.passageLoading = false;
    this.passageLoadError = null;
    this.openedLayoutOnceForVerseId = null;
    this.passageHydratedForOpen = false;
    this.resumeKeyboardPrimeActive = false;
    this.stopPassageAudio();
    this.document.body.style.overflow = 'unset';
    this.document.documentElement.style.overflow = 'unset';
    this.detachAllListeners();
    this.detachStrictModeSessionSubscription();
    this.clearHintInterval();
    // @removal-recite
    this.recitePractice?.destroy();
  }

  private recomputeDerivedFromItem(): void {
    this.isBibleBooks = isBibleBooksMemorizationItem(this.item);
    const body = this.isBibleBooks ? this.item.text : this.passageText;
    this.tokens = this.isBibleBooks
      ? buildMemorizationTokens(body, '')
      : buildMemorizationTokens(body, this.item.reference);
    this.reorderChunks = this.isBibleBooks
      ? buildBibleBooksReorderChunks(booksForScope(this.item.bibleBooksScope!).map((b) => b.name))
      : buildMemorizationReorderChunks(body, this.item.reference);
    this.reorderColonAfterSlotIndex = reorderReferenceColonAfterSlotIndex(
      this.reorderChunks.length,
      this.item.reference
    );
    this.typableIndices = getTypableTokenIndices(this.tokens);
  }

  private async loadPassageText(): Promise<void> {
    const seq = ++this.passageLoadSeq;
    this.passageLoading = true;
    this.passageLoadError = null;
    this.passageText = '';
    this.recomputeDerivedFromItem();
    this.cdr.markForCheck();

    try {
      const result = await this.scripture.getPassage(this.item.reference, this.item.translation);
      if (seq !== this.passageLoadSeq) return;
      const plain = stripScriptureForMemorization(result.text ?? '');
      if (!plain) {
        this.passageLoadError = 'No text returned for this passage.';
      } else {
        this.passageText = plain;
      }
    } catch (e) {
      if (seq !== this.passageLoadSeq) return;
      this.passageLoadError = e instanceof Error ? e.message : 'Failed to load passage.';
    } finally {
      if (seq === this.passageLoadSeq) {
        this.passageLoading = false;
        this.recomputeDerivedFromItem();
        if (this.isOpen && !this.passageHydratedForOpen) {
          this.hydrateInProgressOnce();
          this.passageHydratedForOpen = true;
          this.schedulePracticeEffects();
        }
        this.cdr.markForCheck();
      }
    }
  }

  private async loadAudioUrl(): Promise<void> {
    if (this.isBibleBooks) {
      this.passageAudioUrl = null;
      this.listenViaStreamingAudio = false;
      this.translationListenEnabled = !this.memorizeAndroidHost;
      this.cdr.markForCheck();
      return;
    }
    if (!isMemorizationListenTranslation(this.item.translation)) {
      this.passageAudioUrl = null;
      this.listenViaStreamingAudio = false;
      this.translationListenEnabled = false;
      this.cdr.markForCheck();
      return;
    }
    try {
      const result = await this.scripture.getAudioUrl(this.item.reference, this.item.translation);
      this.passageAudioUrl = result.audioUrl;
      this.listenViaStreamingAudio = !!result.audioUrl && !result.useSpeechSynthesis;
      this.translationListenEnabled = this.listenViaStreamingAudio || !this.memorizeAndroidHost;
    } catch {
      this.passageAudioUrl = null;
      this.listenViaStreamingAudio = false;
      this.translationListenEnabled = !this.memorizeAndroidHost;
    }
    this.cdr.markForCheck();
  }

  private handleItemIdChange(): void {
    if (this.lastAudioResetVerseId !== null && this.lastAudioResetVerseId !== this.item.id) {
      this.stopPassageAudio();
    }
    this.lastAudioResetVerseId = this.item.id;

    if (!this.item.inProgressPractice) {
      // Parent clears inProgress when stats save after the final round — keep the done screen.
      if (this.phase === 'done') return;

      this.practiceCompleted = false;
      this.roundAdvanceHandled = null;
      this.awaitingRoundAdvance = false;
      this.roundAffirmation = '';
      this.completionMessage = '';
      this.sessionSeed = '';
      if (this.isOpen) {
        this.resetToIntro();
      }
    }
  }

  private resetToIntro(): void {
    this.phase = 'intro';
    this.startRoundChoice = 1;
    this.roundIndex = 0;
    this.hasTypedInRound = false;
    this.hiddenIndices = new Set();
    this.revealed = new Set();
    this.firstLetterCueRevealedSlots = new Set();
    this.reorderSlotChunkIds = [];
    this.reorderRoundMovableIndices = new Set();
    this.wrongAttemptsTotal = 0;
    this.wrongAttemptsInRound = 0;
    this.correctKeystrokesTotal = 0;
    this.consecutiveWrong = 0;
    this.practiceMode = null;
    this.practiceModeRef = null;
    this.modePickerOpen = false;
    // @removal-recite
    this.recitePractice?.resetAttemptState();
    this.syncMetricRefs();
  }

  private hydrateInProgressOnce(): void {
    if (this.lastVerseIdForLayout !== this.item.id) {
      this.lastVerseIdForLayout = this.item.id;
      this.openedLayoutOnceForVerseId = null;
    }
    if (this.openedLayoutOnceForVerseId === this.item.id) return;
    this.openedLayoutOnceForVerseId = this.item.id;

    const ip = this.item.inProgressPractice;
    if (!ip) return;

    this.sessionSeed = ip.sessionSeed;
    this.practiceCompleted = false;
    this.wrongAttemptsTotal = ip.wrongAttempts;
    const hydratedRoundErrors = this.resolveHydratedWrongAttemptsInRound(ip);
    if (ip.phase.kind === 'betweenRounds') {
      this.roundCompletedWithErrors = hydratedRoundErrors > 0;
      this.pendingBetweenRoundsErrors = hydratedRoundErrors;
      this.wrongAttemptsInRound = hydratedRoundErrors;
    } else {
      this.wrongAttemptsInRound = hydratedRoundErrors;
      this.roundCompletedWithErrors = false;
      this.pendingBetweenRoundsErrors = 0;
    }
    this.correctKeystrokesTotal = ip.correctKeystrokes;
    this.syncMetricRefs();

    if (ip.phase.kind === 'betweenRounds') {
      const r = ip.phase.completedRoundIndex;
      this.roundAdvanceHandled = r;
      const modeRaw = ip.practiceMode ?? 'type';
      this.practiceMode = modeRaw;
      this.practiceModeRef = modeRaw;
      this.roundIndex = r;
      this.hasTypedInRound = false;
      this.hiddenIndices = new Set();
      this.revealed = new Set();
      this.firstLetterCueRevealedSlots = new Set();
      if (modeRaw === 'reorder') {
        const n = this.reorderChunks.length;
        this.reorderSlotChunkIds = n === 0 ? [] : Array.from({ length: n }, (_, i) => i);
        this.reorderRoundMovableIndices = new Set();
      } else {
        this.hiddenIndices = hiddenTypingTokenIndices(
          modeRaw,
          r,
          this.sessionSeed || this.item.id,
          this.typableIndices
        );
      }
      this.awaitingRoundAdvance = true;
      this.roundAffirmation = pickRandomRoundAffirmation();
      this.phase = 'practicing';
      if (isRecitePracticeMode(modeRaw)) {
        this.recitePractice?.resetAttemptState();
      }
    } else {
      this.roundAdvanceHandled = null;
      const r = ip.phase.roundIndex;
      const modeRaw = ip.practiceMode ?? 'type';
      this.practiceMode = modeRaw;
      this.practiceModeRef = modeRaw;
      this.roundIndex = r;
      this.hasTypedInRound = false;
      this.revealed = new Set();
      this.firstLetterCueRevealedSlots = new Set();
      this.awaitingRoundAdvance = false;
      this.roundAffirmation = '';
      if (modeRaw === 'reorder') {
        const n = this.reorderChunks.length;
        const movableArr = pickReorderMovableIndices(n, r, this.sessionSeed);
        const rng = seedRandom(stringToSeed(`${this.sessionSeed}-mem-reorder-assign-r${r}`));
        this.reorderSlotChunkIds = buildInitialReorderSlotAssignment(n, movableArr, rng);
        this.reorderRoundMovableIndices = new Set(movableArr);
        this.hiddenIndices = new Set();
        if (this.memorizeAndroidHost) {
          this.androidScrollClampUntil = Date.now() + ANDROID_SCROLL_CLAMP_MS;
        }
      } else {
        this.hiddenIndices = hiddenTypingTokenIndices(
          modeRaw,
          r,
          this.sessionSeed || this.item.id,
          this.typableIndices
        );
        if (this.memorizeAndroidHost) {
          this.androidScrollClampUntil = Date.now() + ANDROID_SCROLL_CLAMP_MS;
        }
      }
      this.phase = 'practicing';
      if (isRecitePracticeMode(modeRaw)) {
        this.recitePractice?.resetAttemptState();
      }
    }

    this.syncStrictModeFromSession();
    this.resumeKeyboardPrimeActive = false;
    const hydratedMode = this.practiceModeRef ?? this.practiceMode ?? 'type';
    trackMemorizationPracticeSessionStart(this.sessionSeed, this.item, hydratedMode, {
      resumed: true,
    });

    // Prefer sync focus when the input is already in the DOM (resume after primeKeyboardFocusForResume).
    // Fall back to rAF only for layout settle (Android scroll clamp); keyboard may not reopen then.
    if (this.resolvePracticeInputEl()) {
      this.scheduleKeyboardPracticeFocus();
    } else {
      requestAnimationFrame(() => {
        if (isMemorizeAndroidWebHost() && this.practiceScrollRef?.nativeElement) {
          this.practiceScrollRef.nativeElement.scrollTop = 0;
        }
        this.scheduleKeyboardPracticeFocus();
      });
    }
  }

  private startRound(r: number): void {
    this.roundAdvanceHandled = null;
    this.consecutiveWrong = 0;
    this.wrongAttemptsInRound = 0;
    this.roundCompletedWithErrors = false;
    this.pendingBetweenRoundsErrors = 0;
    this.deferFinalRoundUntilSessionInit = false;
    const seed = this.sessionSeed || this.item.id;
    if (this.practiceModeRef === 'reorder') {
      const n = this.reorderChunks.length;
      const movableArr = pickReorderMovableIndices(n, r, seed);
      const rng = seedRandom(stringToSeed(`${seed}-mem-reorder-assign-r${r}`));
      const assignment = buildInitialReorderSlotAssignment(n, movableArr, rng);
      if (this.memorizeAndroidHost) {
        this.androidScrollClampUntil = Date.now() + ANDROID_SCROLL_CLAMP_MS;
      }
      this.roundIndex = r;
      this.hasTypedInRound = false;
      this.reorderSlotChunkIds = assignment;
      this.reorderRoundMovableIndices = new Set(movableArr);
      this.hiddenIndices = new Set();
      this.revealed = new Set();
      this.firstLetterCueRevealedSlots = new Set();
      this.awaitingRoundAdvance = false;
      this.roundAffirmation = '';
      this.phase = 'practicing';
      return;
    }
    const hidden = hiddenTypingTokenIndices(this.practiceModeRef, r, seed, this.typableIndices);
    if (this.memorizeAndroidHost) {
      this.androidScrollClampUntil = Date.now() + ANDROID_SCROLL_CLAMP_MS;
    }
    this.roundIndex = r;
    this.hasTypedInRound = false;
    this.hiddenIndices = hidden;
    this.revealed = new Set();
    this.firstLetterCueRevealedSlots = new Set();
    this.awaitingRoundAdvance = false;
    this.roundAffirmation = '';
    this.phase = 'practicing';
    if (isRecitePracticeMode(this.practiceModeRef)) {
      this.recitePractice?.resetAttemptState();
    }
  }

  private revealFirstLetterCueForToken(tokenIndex: number): void {
    if (this.practiceModeRef !== 'firstLetters') return;
    const slot = this.typableIndices.indexOf(tokenIndex);
    if (slot < 0) return;
    if (!this.firstLetterCueHiddenSlots.has(slot)) return;
    if (this.firstLetterCueRevealedSlots.has(slot)) return;
    const next = new Set(this.firstLetterCueRevealedSlots);
    next.add(slot);
    this.firstLetterCueRevealedSlots = next;
  }

  private processKeystroke(key: string): void {
    if (this.hintActive || this.phase !== 'practicing' || this.currentTargetIndex === null) return;
    if (key.length !== 1) return;
    const token = this.tokens[this.currentTargetIndex];
    if (!token || token.kind === 'punct') return;

    this.hasTypedInRound = true;

    if (token.kind === 'digit') {
      if (!/^[0-9]$/.test(key)) return;
      if (key === token.text) {
        this.clearFlashError();
        const idx = this.currentTargetIndex;
        this.revealFirstLetterCueForToken(idx);
        const next = new Set(this.revealed);
        next.add(idx);
        this.revealed = next;
        this.consecutiveWrong = 0;
        this.correctKeystrokesTotal += 1;
        this.syncMetricRefs();
      } else {
        this.handleWrongKeystroke();
      }
    } else {
      if (!/^[a-zA-Z]$/.test(key)) return;
      const expected = firstLetterOfWord(token.text);
      if (!expected) return;
      if (key.toLowerCase() === expected) {
        this.clearFlashError();
        const idx = this.currentTargetIndex;
        this.revealFirstLetterCueForToken(idx);
        const next = new Set(this.revealed);
        next.add(idx);
        this.revealed = next;
        this.consecutiveWrong = 0;
        this.correctKeystrokesTotal += 1;
        this.syncMetricRefs();
      } else {
        this.handleWrongKeystroke();
      }
    }
    this.checkRoundCompletion();
    this.scheduleScrollToBlank();
    this.cdr.markForCheck();
  }

  private consecutiveWrong = 0;

  private handleWrongKeystroke(): void {
    this.recordWrongAttempt();
    this.consecutiveWrong += 1;
    this.tryAutoRevealAfterWrong(true);
    this.syncMetricRefs();
    this.flashErrorBriefly();
  }

  private recordWrongAttempt(): void {
    this.wrongAttemptsTotal += 1;
    this.wrongAttemptsInRound += 1;
  }

  private syncStrictModeFromSession(): void {
    this.refreshStrictModeFromSession();
  }

  private refreshStrictModeFromSession(): void {
    if (!this.userSessionService.isSessionInitialized()) return;
    const strict = this.userSessionService.getCurrentSession()?.memorizationStrictMode ?? false;
    this.applyStrictModeFromSession(strict);
    this.reconcileFinalRoundAfterSessionLoad();
    // Session init can change showNextRoundOption even when strict mode stays false.
    this.cdr.markForCheck();
  }

  private attachStrictModeSessionSubscription(): void {
    this.detachStrictModeSessionSubscription();
    this.strictModeSessionSub = combineLatest([
      this.userSessionService.userSession$,
      this.userSessionService.sessionInitialized$,
    ]).subscribe(() => {
      this.refreshStrictModeFromSession();
    });
  }

  private detachStrictModeSessionSubscription(): void {
    this.strictModeSessionSub?.unsubscribe();
    this.strictModeSessionSub = null;
  }

  private applyStrictModeFromSession(strict: boolean): void {
    if (this.strictModeEnabled === strict) return;
    this.strictModeEnabled = strict;
    if (strict && this.awaitingRoundAdvance && this.wrongAttemptsInRound > 0) {
      this.roundCompletedWithErrors = true;
    }
    this.cdr.markForCheck();
  }

  /** Block auto-reveal until session bootstrap resolves strict vs standard. */
  private isAutoRevealBlocked(): boolean {
    return this.strictModeEnabled || !this.userSessionService.isSessionInitialized();
  }

  /**
   * Legacy in-progress saves omitted per-round error counts; infer from session totals
   * so strict mode still tracks round errors after resume.
   */
  private resolveHydratedWrongAttemptsInRound(ip: MemorizationInProgress): number {
    if (ip.wrongAttemptsInRound !== undefined) {
      return ip.wrongAttemptsInRound;
    }
    if (ip.wrongAttempts > 0) {
      return ip.wrongAttempts;
    }
    return 0;
  }

  /** Strict mode (or pending session) requires repeating after errors before advancing mid-run. */
  private mustRepeatDueToErrors(): boolean {
    if (this.wrongAttemptsInRound <= 0) return false;
    if (!this.userSessionService.isSessionInitialized()) return true;
    return this.strictModeEnabled;
  }

  /** Final round: defer until session loads, then repeat only in strict mode. */
  private mustRepeatFinalRound(): boolean {
    if (!this.isFinalRound || this.wrongAttemptsInRound <= 0) return false;
    if (!this.userSessionService.isSessionInitialized()) return true;
    return this.strictModeEnabled;
  }

  /** Standard mode on final round: auto-finish with errors once session bootstrap resolves. */
  private reconcileFinalRoundAfterSessionLoad(): void {
    if (!this.deferFinalRoundUntilSessionInit) return;
    this.deferFinalRoundUntilSessionInit = false;
    if (
      !this.awaitingRoundAdvance ||
      !this.isFinalRound ||
      this.wrongAttemptsInRound <= 0 ||
      this.strictModeEnabled
    ) {
      return;
    }
    this.finishPracticeSession();
  }

  private tryAutoRevealAfterWrong(revealFirstLetterCue = false): void {
    if (this.isAutoRevealBlocked() || this.currentTargetIndex === null) return;
    if (this.consecutiveWrong < MAX_WRONG_BEFORE_REVEAL) return;
    const idx = this.currentTargetIndex;
    if (revealFirstLetterCue) {
      this.revealFirstLetterCueForToken(idx);
    }
    const next = new Set(this.revealed);
    next.add(idx);
    this.revealed = next;
    this.correctKeystrokesTotal += 1;
    this.consecutiveWrong = 0;
  }

  private checkRoundCompletion(): void {
    if (this.phase !== 'practicing' || this.awaitingRoundAdvance) return;

    if (this.practiceMode === 'reorder') {
      const n = this.reorderChunks.length;
      if (n === 0 || this.reorderSlotChunkIds.length !== n) return;
      if (!this.reorderSlotChunkIds.every((id, i) => id === i)) return;
      this.onRoundComplete();
      return;
    }

    if (this.hiddenIndices.size === 0) return;
    const allDone = [...this.hiddenIndices].every((i) => this.revealed.has(i));
    if (!allDone) return;
    this.onRoundComplete();
  }

  private onRoundComplete(): void {
    this.syncMetricRefs();
    const mustRepeatFinalRound = this.mustRepeatFinalRound();

    if (this.isFinalRound && !mustRepeatFinalRound) {
      this.finishPracticeSession();
      return;
    }

    if (this.roundAdvanceHandled === this.roundIndex) return;
    this.roundAdvanceHandled = this.roundIndex;
    this.pendingBetweenRoundsErrors = this.wrongAttemptsInRound;
    this.roundCompletedWithErrors = this.wrongAttemptsInRound > 0;
    if (
      this.isFinalRound &&
      this.wrongAttemptsInRound > 0 &&
      !this.userSessionService.isSessionInitialized()
    ) {
      this.deferFinalRoundUntilSessionInit = true;
    }
    this.persistPracticeSnapshot({ kind: 'betweenRounds', completedRoundIndex: this.roundIndex });
    this.roundAffirmation = pickRandomRoundAffirmation();
    this.awaitingRoundAdvance = true;
    this.awaitingRoundAdvanceRef = true;
    this.stopPassageAudio();
  }

  private pendingBetweenRoundsErrors = 0;
  /** Set when final round completes with errors before session bootstrap; cleared after reconcile. */
  private deferFinalRoundUntilSessionInit = false;

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
    if (!this.sessionSeed) return;
    this.syncMetricRefs();
    const mode = this.practiceModeRef ?? 'type';
    this.persistInProgress.emit({
      sessionSeed: this.sessionSeed,
      wrongAttempts: this.wrongAttemptsRef,
      correctKeystrokes: this.correctKeystrokesRef,
      phase: phasePayload,
      practiceMode: mode,
      wrongAttemptsInRound:
        phasePayload.kind === 'betweenRounds'
          ? this.pendingBetweenRoundsErrors
          : this.wrongAttemptsInRound,
    });
  }

  private syncMetricRefs(): void {
    this.wrongAttemptsRef = this.wrongAttemptsTotal;
    this.correctKeystrokesRef = this.correctKeystrokesTotal;
    this.awaitingRoundAdvanceRef = this.awaitingRoundAdvance;
    this.practiceModeRef = this.practiceMode;
  }

  private static readonly ERROR_FLASH_MS = 220;

  private flashErrorBriefly(): void {
    this.flashError = true;
    if (this.flashErrorTimer) clearTimeout(this.flashErrorTimer);
    this.syncFlashErrorView();
    // Run clear inside NgZone so OnPush type-mode UI drops the red ring after the flash.
    this.flashErrorTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.flashError = false;
        this.flashErrorTimer = null;
        this.syncFlashErrorView();
      });
    }, MemorizationPracticeSessionComponent.ERROR_FLASH_MS);
  }

  private clearFlashError(): void {
    if (this.flashErrorTimer) {
      clearTimeout(this.flashErrorTimer);
      this.flashErrorTimer = null;
    }
    if (!this.flashError) return;
    this.flashError = false;
    this.syncFlashErrorView();
  }

  private syncFlashErrorView(): void {
    this.cdr.markForCheck();
    try {
      this.cdr.detectChanges();
    } catch {
      // jsdom / test environments may not support full CD
    }
  }

  private bumpListen(): void {
    this.listenUiTick += 1;
  }

  private stopPassageAudio(): void {
    this.clearListenRepeatGapTimer();
    this.repeatListenOnRef = false;
    this.repeatListenOn = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.memorizeListenTtsRateAtStart = null;
    this.memorizeListenTtsUserPaused = false;
    this.memorizeListenTtsPostResume = false;
    const el = this.passageAudioRef?.nativeElement;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    this.passageAudioPlaying = false;
    this.bumpListen();
  }

  private clearListenRepeatGapTimer(): void {
    if (this.listenRepeatGapTimer != null) {
      clearTimeout(this.listenRepeatGapTimer);
      this.listenRepeatGapTimer = null;
    }
  }

  private async playStreamingAudio(el: HTMLAudioElement, fromStart = false): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
      }
      this.memorizeWebSpeechUtteranceIsOurs = false;
      if (!el.getAttribute('src') && this.passageAudioUrl) {
        el.src = this.passageAudioUrl;
      }
      if (fromStart) el.currentTime = 0;
      applyMemorizeListenPlaybackRateToMediaElement(el, this.listenPlaybackRateRef);
      await el.play();
      this.passageAudioPlaying = true;
      this.bumpListen();
    } catch {
      this.passageAudioPlaying = false;
      this.bumpListen();
      this.cdr.markForCheck();
    }
  }

  private handleTtsListenClick(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const syn = window.speechSynthesis;
    if (syn.speaking) {
      if (!this.memorizeWebSpeechUtteranceIsOurs) {
        this.memorizeListenTtsUserPaused = false;
        this.memorizeListenTtsPostResume = false;
        syn.cancel();
        this.beginTtsUtterance();
        this.bumpListen();
        return;
      }
      if (syn.paused) {
        this.memorizeListenTtsUserPaused = false;
        const atStart = this.memorizeListenTtsRateAtStart;
        if (atStart != null && this.listenPlaybackRateRef !== atStart) {
          syn.cancel();
          this.memorizeListenTtsRateAtStart = null;
          this.memorizeListenTtsPostResume = false;
          this.beginTtsUtterance();
        } else {
          this.memorizeListenTtsPostResume = true;
          syn.resume();
          setTimeout(() => this.bumpListen(), 24);
          setTimeout(() => this.bumpListen(), 72);
        }
      } else {
        this.memorizeListenTtsUserPaused = true;
        this.memorizeListenTtsPostResume = false;
        syn.pause();
      }
      this.bumpListen();
      return;
    }
    this.beginTtsUtterance();
  }

  private beginTtsUtterance(): void {
    if (this.memorizeAndroidHost) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const text = getMemorizationListenUtteranceText(
      this.item,
      this.isBibleBooks ? undefined : this.passageText
    );
    if (!text.trim()) return;

    this.memorizeListenTtsUserPaused = false;
    this.memorizeListenTtsPostResume = false;
    const syn = window.speechSynthesis;
    this.memorizeWebSpeechUtteranceIsOurs = false;
    syn.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    const rate = this.listenPlaybackRateRef;
    u.rate = toMemorizeWebSpeechUtteranceRate(rate, isMemorizeIosWebHost());
    this.memorizeListenTtsRateAtStart = rate;
    u.onstart = () => {
      this.memorizeWebSpeechUtteranceIsOurs = true;
      this.memorizeListenTtsPostResume = false;
      this.bumpListen();
      this.cdr.markForCheck();
    };
    u.onend = () => {
      this.memorizeWebSpeechUtteranceIsOurs = false;
      this.memorizeListenTtsUserPaused = false;
      this.memorizeListenTtsPostResume = false;
      this.memorizeListenTtsRateAtStart = null;
      this.bumpListen();
      this.cdr.markForCheck();
      if (!this.repeatListenOnRef) return;
      this.clearListenRepeatGapTimer();
      this.listenRepeatGapTimer = setTimeout(() => {
        this.listenRepeatGapTimer = null;
        if (!this.repeatListenOnRef) return;
        this.beginTtsUtterance();
      }, MEMORIZE_LISTEN_REPEAT_GAP_MS);
    };
    u.onerror = () => {
      this.memorizeWebSpeechUtteranceIsOurs = false;
      this.memorizeListenTtsUserPaused = false;
      this.memorizeListenTtsPostResume = false;
      this.memorizeListenTtsRateAtStart = null;
      this.bumpListen();
      this.cdr.markForCheck();
    };
    syn.speak(u);
    this.bumpListen();
    this.cdr.markForCheck();
  }

  private resolvePracticeInputEl(): HTMLInputElement | null {
    const fromRef = this.practiceInputRef?.nativeElement ?? null;
    if (fromRef?.isConnected) return fromRef;
    // ViewChild can lag one tick after @if creates the input; query by id so iOS
    // can still focus inside the same user-gesture turn (required to open the keyboard).
    return this.document.getElementById(this.practiceInputId) as HTMLInputElement | null;
  }

  private focusPracticeInput(): boolean {
    const input = this.resolvePracticeInputEl();
    if (!input || input.disabled) return false;
    // Some WebKit builds ignore focus on a fully clipped field until it can receive
    // a soft click; click() after focus helps open the software keyboard.
    try {
      input.focus({ preventScroll: true });
    } catch {
      try {
        input.focus();
      } catch {
        return false;
      }
    }
    try {
      input.click();
    } catch {
      // ignore
    }
    return this.document.activeElement === input;
  }

  /** Focus hidden input after practice UI renders (OnPush + @if). Opens keyboard on mobile. */
  private scheduleKeyboardPracticeFocus(): void {
    if (!isKeyboardPracticeMode(this.practiceModeRef)) return;

    const focusWhenReady = (): boolean => {
      if (!this.isOpen || this.awaitingRoundAdvance) return false;
      const canFocus =
        (this.phase === 'practicing' && isKeyboardPracticeMode(this.practiceMode)) ||
        this.resumeKeyboardPrimeActive;
      if (!canFocus) return false;
      this.ensureTypeModeCaptureAttached();
      this.ensureHintCaptureAttached();
      const focused = this.focusPracticeInput();
      if (this.practiceMode === 'firstLetters' && this.phase === 'practicing') {
        this.scrollActiveFirstLetterCueIntoView();
      }
      // Keep the focused verse blank on screen once practicing UI is ready.
      if (this.phase === 'practicing') {
        this.scrollCurrentBlankIntoView();
      }
      // Scroll must not steal focus from the practice input (keyboard would dismiss).
      if (focused && this.document.activeElement !== this.resolvePracticeInputEl()) {
        this.focusPracticeInput();
      }
      return focused;
    };

    this.cdr.markForCheck();
    try {
      this.cdr.detectChanges();
    } catch {
      // jsdom / test environments may not support full CD
    }
    if (focusWhenReady()) return;
    // Fallback if the input was not in the DOM yet (still try ASAP for mobile keyboards).
    requestAnimationFrame(() => {
      if (focusWhenReady()) return;
      requestAnimationFrame(() => {
        focusWhenReady();
      });
    });
  }

  private restorePracticeInputFocusAfterHint(): void {
    requestAnimationFrame(() => {
      if (this.awaitingRoundAdvanceRef || this.phase !== 'practicing') return;
      if (!isKeyboardPracticeMode(this.practiceModeRef)) return;
      this.focusPracticeInput();
    });
  }

  private startHintInterval(): void {
    this.clearHintInterval();
    if (!this.hintActive || this.practiceMode === 'reorder') return;
    this.hintIntervalId = setInterval(() => {
      this.hintPeekCount = Math.min(this.hintPeekCount + 1, this.unrevealedHiddenSorted.length);
      this.cdr.markForCheck();
    }, MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS);
  }

  private schedulePracticeEffects(): void {
    if (this.awaitingRoundAdvance || this.phase !== 'intro') {
      this.stopPassageAudio();
    }

    if (!this.listenInteractionAllowed) {
      this.listenPanelOpen = false;
    }

    if (
      this.phase === 'practicing' &&
      !this.awaitingRoundAdvance &&
      this.currentTargetIndex !== null &&
      !this.hintActive &&
      isKeyboardPracticeMode(this.practiceMode)
    ) {
      this.scheduleKeyboardPracticeFocus();
    }

    if (
      this.phase === 'practicing' &&
      !this.awaitingRoundAdvance &&
      this.currentTargetIndex !== null &&
      this.practiceMode === 'word'
    ) {
      // Defer until the word-choice footer has laid out (row wrap can change height).
      this.scheduleScrollToBlank({ force: true });
    }

    if (
      this.phase === 'practicing' &&
      !this.awaitingRoundAdvance &&
      this.currentTargetIndex !== null &&
      this.practiceMode !== 'word' &&
      this.hasTypedInRound
    ) {
      this.scrollCurrentBlankIntoView();
    }

    if (this.phase === 'done' && this.practiceScrollRef?.nativeElement) {
      this.practiceScrollRef.nativeElement.scrollTop = 0;
    }

    if (this.practiceMode === 'firstLetters' && this.phase === 'practicing' && !this.awaitingRoundAdvance) {
      this.scrollActiveFirstLetterCueIntoView();
    }
  }

  private scheduleScrollToBlank(options?: { force?: boolean }): void {
    if (!options?.force && !this.hasTypedInRound) return;
    if (this.scrollBlankTimer) clearTimeout(this.scrollBlankTimer);
    const delayMs = isMemorizeAndroidWebHost() ? 120 : 80;
    this.scrollBlankTimer = setTimeout(() => {
      this.scrollBlankTimer = null;
      if (this.practiceMode === 'firstLetters') {
        this.scrollActiveFirstLetterCueIntoView();
      }
      this.scrollCurrentBlankIntoView();
    }, delayMs);
  }

  private scrollCurrentBlankIntoView(): void {
    requestAnimationFrame(() => {
      const root =
        this.practiceWordsWordRef?.nativeElement ?? this.practiceWordsTypeRef?.nativeElement;
      const scrollEl = this.practiceScrollRef?.nativeElement;
      if (!root || !scrollEl) return;
      const el = root.querySelector<HTMLElement>('[data-memorize-current-blank="true"]');
      if (!el) return;
      if (isMemorizeAndroidWebHost() && Date.now() < this.androidScrollClampUntil) {
        scrollEl.scrollTop = 0;
        return;
      }

      // One instant adjustment (no nearest + smooth combo — that reads as a bounce).
      const applyVisibleNudge = () => {
        const vv = window.visualViewport;
        const edgeMargin = 12;
        const isWordMode = this.practiceModeRef === 'word';
        const isFirstLetters = this.practiceModeRef === 'firstLetters';
        const scrollRect = scrollEl.getBoundingClientRect();
        let viewTop = scrollRect.top + edgeMargin;
        let viewBottom = scrollRect.bottom - edgeMargin;

        if (isWordMode) {
          const wordChoices = this.document.querySelector<HTMLElement>(
            '[data-testid="memorize-word-choices"]'
          );
          const wordChoicesTop = wordChoices?.getBoundingClientRect().top ?? null;
          viewBottom = memorizeWordModeVisibleBottom(
            scrollRect.bottom,
            wordChoicesTop,
            edgeMargin,
            MEMORIZE_EXTRA_GAP_ABOVE_WORD_CHOICES_PX
          );
        } else {
          const stickyHeader = isFirstLetters
            ? this.document.querySelector<HTMLElement>(
                '[data-testid="memorize-practice-round-header"]'
              )
            : null;
          const stickyBottom = stickyHeader?.getBoundingClientRect().bottom ?? null;
          if (vv) {
            viewTop = memorizeStickyHeaderVisibleTop(vv.offsetTop, stickyBottom, edgeMargin);
            viewBottom =
              vv.offsetTop + vv.height - edgeMargin - MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX;
          } else {
            viewTop = memorizeStickyHeaderVisibleTop(scrollRect.top, stickyBottom, edgeMargin);
          }
        }

        const rect = el.getBoundingClientRect();
        let delta = 0;
        if (rect.bottom > viewBottom) delta += rect.bottom - viewBottom;
        if (rect.top < viewTop) delta -= viewTop - rect.top;
        if (Math.abs(delta) < 0.5) return;
        const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        scrollEl.scrollTop = Math.max(0, Math.min(scrollEl.scrollTop + delta, maxScroll));
      };

      applyVisibleNudge();
      // Re-measure once after layout/keyboard inset settles (still instant, no animation).
      requestAnimationFrame(applyVisibleNudge);
    });
  }

  private scrollActiveFirstLetterCueIntoView(): void {
    const root = this.firstLetterCuesViewportRef?.nativeElement;
    if (!root) return;
    const slot =
      this.currentTargetIndex !== null
        ? this.typableIndices.indexOf(this.currentTargetIndex)
        : -1;
    const target =
      slot >= 0 ? root.querySelector<HTMLElement>(`[data-memorize-cue-slot="${slot}"]`) : null;
    if (!target) {
      root.scrollTop = 0;
      return;
    }
    // Scroll only the cue strip — scrollIntoView can also move #practiceScroll and bounce.
    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetCenter = targetRect.top + targetRect.height / 2;
    const rootCenter = rootRect.top + rootRect.height / 2;
    const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
    root.scrollTop = Math.max(0, Math.min(root.scrollTop + (targetCenter - rootCenter), maxScroll));
  }

  private attachViewportListeners(): void {
    if (this.viewportListenersAttached || typeof window === 'undefined') return;
    this.viewportListenersAttached = true;
    const vv = window.visualViewport;
    if (!vv) return;
    const coalesceAndroid = isMemorizeAndroidWebHost();
    let insetRaf = 0;
    const applyInset = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      this.keyboardInsetPx = inset;
      this.cdr.markForCheck();
    };
    const updateInset = () => {
      if (!coalesceAndroid) {
        applyInset();
        return;
      }
      if (insetRaf) return;
      insetRaf = window.requestAnimationFrame(() => {
        insetRaf = 0;
        applyInset();
      });
    };
    applyInset();
    vv.addEventListener('resize', updateInset);
    vv.addEventListener('scroll', updateInset);
  }

  private attachPracticeListeners(): void {
    this.attachAndroidScrollClamp();
    this.attachTypeModeCapture();
    this.attachHintCapture();
    this.attachFirstLetterResizeObserver();
  }

  private attachAndroidScrollClamp(): void {
    if (!this.memorizeAndroidHost || this.androidScrollListener) return;
    const scrollEl = this.practiceScrollRef?.nativeElement;
    if (!scrollEl) return;
    this.androidScrollListener = () => {
      if (Date.now() < this.androidScrollClampUntil) {
        scrollEl.scrollTop = 0;
      }
    };
    scrollEl.addEventListener('scroll', this.androidScrollListener, { passive: false });
  }

  private attachTypeModeCapture(): void {
    this.ensureTypeModeCaptureAttached();
  }

  private ensureTypeModeCaptureAttached(): void {
    if (this.typeCaptureListenersAttached) return;
    const el = this.practiceWordsTypeRef?.nativeElement;
    if (!el || !isKeyboardPracticeMode(this.practiceMode)) return;
    const onTouchStartCaptureVerse = (e: TouchEvent) => {
      if (this.awaitingRoundAdvanceRef) return;
      const input = this.practiceInputRef?.nativeElement;
      if (!input) return;
      if (document.activeElement === input) e.preventDefault();
    };
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      this.keepPracticeInputOnPointerCapture(e);
    };
    el.addEventListener('touchstart', onTouchStartCaptureVerse, { capture: true, passive: false });
    el.addEventListener('pointerdown', onPointerDownCapture, { capture: true });
    this.typeCaptureListenersAttached = true;
  }

  private attachHintCapture(): void {
    this.ensureHintCaptureAttached();
  }

  private ensureHintCaptureAttached(): void {
    if (this.hintCaptureListenersAttached) return;
    const el = this.hintButtonRef?.nativeElement;
    if (!el) return;
    const handler = (e: PointerEvent | TouchEvent) => this.keepPracticeInputOnPointerCapture(e);
    el.addEventListener('touchstart', handler as EventListener, { capture: true, passive: false });
    el.addEventListener('pointerdown', handler as EventListener, { capture: true });
    this.hintCaptureListenersAttached = true;
  }

  private keepPracticeInputOnPointerCapture(e: PointerEvent | TouchEvent): void {
    if (this.awaitingRoundAdvanceRef) return;
    if (!isKeyboardPracticeMode(this.practiceModeRef)) return;
    const t = e.target;
    if (t instanceof Element && t.closest('[data-testid="memorize-hint-button"]')) return;
    const input = this.practiceInputRef?.nativeElement;
    if (!input) return;
    if (document.activeElement === input) {
      e.preventDefault();
      return;
    }
    input.focus({ preventScroll: true });
  }

  private attachFirstLetterResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    if (this.practiceMode !== 'firstLetters' || this.phase !== 'practicing' || this.awaitingRoundAdvance) {
      return;
    }
    const root = this.firstLetterCuesViewportRef?.nativeElement;
    if (!root) return;
    this.resizeObserver?.disconnect();
    let raf = 0;
    this.resizeObserver = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!root.isConnected) return;
        this.scrollActiveFirstLetterCueIntoView();
        this.scrollCurrentBlankIntoView();
      });
    });
    this.resizeObserver.observe(root);
  }

  private detachAllListeners(): void {
    this.clearHintInterval();
    if (this.scrollBlankTimer) {
      clearTimeout(this.scrollBlankTimer);
      this.scrollBlankTimer = null;
    }
    const scrollEl = this.practiceScrollRef?.nativeElement;
    if (scrollEl && this.androidScrollListener) {
      scrollEl.removeEventListener('scroll', this.androidScrollListener);
      this.androidScrollListener = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.typeCaptureListenersAttached = false;
    this.hintCaptureListenersAttached = false;
  }

  private clearHintInterval(): void {
    if (this.hintIntervalId) {
      clearInterval(this.hintIntervalId);
      this.hintIntervalId = null;
    }
  }

  private syncRefs(): void {
    this.syncMetricRefs();
  }
}

function reorderChunksEmpty() {
  return [] as ReturnType<typeof buildMemorizationReorderChunks>;
}
