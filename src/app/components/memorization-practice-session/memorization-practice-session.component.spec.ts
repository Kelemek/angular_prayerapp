import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { BehaviorSubject } from 'rxjs';
import { ElementRef, SimpleChange, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';
import { ScriptureService } from '../../services/scripture.service';
import { UserSessionService } from '../../services/user-session.service';
import { MemorizationReciteService } from '../../services/memorization-recite.service';
import { MemorizationReciteSettingsService } from '../../services/memorization-recite-settings.service';
import type { MemorizedItem } from '../../types/memorization';
import { MEMORIZATION_FULL_HIDE_ROUND } from '../../lib/memorization/memorizationPracticeUtils';
import { MEMORIZE_LISTEN_REPEAT_GAP_MS } from '../../lib/memorization/memorizeListenSpeedStorage';

vi.mock('../../lib/memorization/isWhisperReciteSupported', () => ({
  isWhisperReciteSupported: vi.fn(() => true),
}));

const trackMemorizationPracticeSessionStartMock = vi.fn();
const trackMemorizationPracticeCompletedMock = vi.fn();

vi.mock('../../lib/memorization/memorizationPracticeAnalytics', () => ({
  trackMemorizationPracticeSessionStart: (...args: unknown[]) =>
    trackMemorizationPracticeSessionStartMock(...args),
  trackMemorizationPracticeCompleted: (...args: unknown[]) =>
    trackMemorizationPracticeCompletedMock(...args),
}));

const verseItem: MemorizedItem = {
  id: 'v1',
  reference: 'John 3:16',
  text: '',
  translation: 'esv',
  dateAdded: Date.now(),
  lastPracticedAt: null,
  practiceSessions: [],
};

const mockScriptureService = {
  getPassage: vi.fn().mockResolvedValue({
    reference: 'John 3:16',
    text: 'For God so loved the world',
    translation: 'esv',
  }),
  getAudioUrl: vi.fn().mockResolvedValue({
    audioUrl: 'https://audio.test/x.mp3',
    useSpeechSynthesis: false,
  }),
};

const mockReciteService = {
  startRecording: vi.fn().mockResolvedValue(undefined),
  stopRecordingCapture: vi.fn().mockResolvedValue({
    blob: new Blob(['audio'], { type: 'audio/webm' }),
    audioSeconds: 2,
  }),
  transcribeCapturedRecording: vi.fn().mockResolvedValue('For God so loved the world'),
  stopAndTranscribe: vi.fn().mockResolvedValue('For God so loved the world'),
  cancelRecording: vi.fn().mockResolvedValue(undefined),
};

const mockReciteSettingsService = {
  getSettings: vi.fn().mockResolvedValue({ enabled: false }),
  getSettingsFromServer: vi.fn().mockResolvedValue({ enabled: false }),
};

function createMockUserSessionService(
  memorizationStrictMode = false,
  options: { deferSessionLoad?: boolean } = {},
) {
  const session = {
    email: 'test@example.com',
    fullName: 'Test User',
    memorizationStrictMode,
  };
  const deferSessionLoad = options.deferSessionLoad ?? false;
  const subject = new BehaviorSubject(deferSessionLoad ? null : session);
  const initializedSubject = new BehaviorSubject(!deferSessionLoad);
  return {
    getCurrentSession: vi.fn(() => subject.value),
    userSession$: subject.asObservable(),
    sessionInitialized$: initializedSubject.asObservable(),
    isSessionInitialized: vi.fn(() => initializedSubject.value),
    setMemorizationStrictMode(strict: boolean): void {
      subject.next({ ...session, memorizationStrictMode: strict });
      initializedSubject.next(true);
    },
    finishSessionLoad(strict: boolean = memorizationStrictMode): void {
      subject.next({ ...session, memorizationStrictMode: strict });
      initializedSubject.next(true);
    },
  };
}

function makeKeyEvent(key: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent;
}

function makePointerEvent(
  type: 'down' | 'up' | 'leave',
  target?: HTMLElement
): PointerEvent {
  const el = target ?? document.createElement('button');
  el.setPointerCapture = vi.fn();
  el.hasPointerCapture = vi.fn().mockReturnValue(true);
  el.releasePointerCapture = vi.fn();
  return {
    pointerId: 1,
    buttons: type === 'leave' ? 0 : 1,
    preventDefault: vi.fn(),
    currentTarget: el,
  } as unknown as PointerEvent;
}

async function renderSession(
  options: {
    item?: MemorizedItem;
    isOpen?: boolean;
    memorizationStrictMode?: boolean;
    deferSessionLoad?: boolean;
    reciteEnabled?: boolean;
    reciteTranscript?: string;
  } = {}
) {
  const closed = vi.fn();
  const completed = vi.fn();
  const persistInProgress = vi.fn();
  const clearInProgress = vi.fn();
  const strictMode = options.memorizationStrictMode ?? false;
  const sessionService = createMockUserSessionService(strictMode, {
    deferSessionLoad: options.deferSessionLoad,
  });

  const reciteSettings = { enabled: options.reciteEnabled ?? false };
  mockReciteSettingsService.getSettings.mockResolvedValue(reciteSettings);
  mockReciteSettingsService.getSettingsFromServer.mockResolvedValue(reciteSettings);
  mockReciteService.transcribeCapturedRecording.mockResolvedValue(
    options.reciteTranscript ?? 'For God so loved the world'
  );

  const result = await render(MemorizationPracticeSessionComponent, {
    componentInputs: {
      item: options.item ?? verseItem,
      isOpen: options.isOpen ?? true,
    },
    providers: [
      { provide: ScriptureService, useValue: mockScriptureService },
      {
        provide: UserSessionService,
        useValue: sessionService,
      },
      { provide: MemorizationReciteService, useValue: mockReciteService },
      { provide: MemorizationReciteSettingsService, useValue: mockReciteSettingsService },
    ],
  });

  const { fixture } = result;
  const component = fixture.componentInstance;
  const cdr = fixture.changeDetectorRef;

  component.closed.subscribe(closed);
  component.completed.subscribe(completed);
  component.persistInProgress.subscribe(persistInProgress);
  component.clearInProgress.subscribe(clearInProgress);

  await fixture.whenStable();
  cdr.detectChanges();

  return { ...result, component, cdr, closed, completed, persistInProgress, clearInProgress, sessionService };
}

function revealAllHiddenViaTyping(component: MemorizationPracticeSessionComponent): void {
  let guard = 0;
  while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance && guard < 200) {
    guard += 1;
    const token = component.tokens[component.currentTargetIndex];
    if (!token || token.kind === 'punct') break;
    const key = token.kind === 'digit' ? token.text : token.text[0]!;
    component.onPracticeInputKeyDown(makeKeyEvent(key));
  }
}

function correctReorderOrder(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const componentDir = dirname(fileURLToPath(import.meta.url));
const reciteComponentDir = join(componentDir, '../../memorization-recite');

function readComponentResource(url: string): string {
  for (const base of [componentDir, reciteComponentDir]) {
    const path = join(base, url);
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe('MemorizationPracticeSessionComponent', () => {
  beforeAll(async () => {
    await resolveComponentResources((url) => Promise.resolve(readComponentResource(url)));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockScriptureService.getPassage.mockResolvedValue({
      reference: 'John 3:16',
      text: 'For God so loved the world',
      translation: 'esv',
    });
    mockScriptureService.getAudioUrl.mockResolvedValue({
      audioUrl: 'https://audio.test/x.mp3',
      useSpeechSynthesis: false,
    });
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    HTMLElement.prototype.scrollTo = vi.fn(function (
      this: HTMLElement,
      options?: ScrollToOptions | number
    ) {
      if (typeof options === 'object' && options?.top != null) {
        this.scrollTop = options.top;
      }
    }) as typeof HTMLElement.prototype.scrollTo;

    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    } else {
      vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    }

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        speaking: false,
        paused: false,
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        speak: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('setup', () => {
    it('renders open and derives tokens and reorderChunks from item', async () => {
      const { component } = await renderSession();

      expect(component.tokens.length).toBeGreaterThan(0);
      expect(component.typableIndices.length).toBeGreaterThan(0);
      expect(component.reorderChunks.length).toBeGreaterThan(0);
      expect(component.isBibleBooks).toBe(false);
      expect(mockScriptureService.getAudioUrl).toHaveBeenCalledWith('John 3:16', 'esv');
      expect(component.passageAudioUrl).toBe('https://audio.test/x.mp3');
      expect(component.listenViaStreamingAudio).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('shows error when passage fetch returns no text', async () => {
      mockScriptureService.getPassage.mockResolvedValue({
        reference: 'John 3:16',
        text: '  ',
        translation: 'esv',
      });
      const { component } = await renderSession({ item: verseItem });
      expect(component.passageLoadError).toBe('No text returned for this passage.');
    });
  });

  describe('beginPracticeWithMode', () => {
    it('starts type mode in practicing phase', async () => {
      const { component, persistInProgress } = await renderSession();
      component.beginPracticeWithMode('type');

      expect(component.phase).toBe('practicing');
      expect(component.practiceMode).toBe('type');
      expect(component.sessionSeed).toBeTruthy();
      expect(component.hiddenIndices.size).toBeGreaterThan(0);
      expect(persistInProgress).toHaveBeenCalled();
    });

    it('shows ESV attribution inside the scroll area at the bottom of the passage while practicing', async () => {
      const { component, getByTestId, container, cdr } = await renderSession();
      component.beginPracticeWithMode('type');
      cdr.detectChanges();

      const attribution = getByTestId('memorize-practice-attribution');
      const practiceScroll = container.querySelector('#practiceScroll');
      expect(attribution).toBeTruthy();
      expect(getByTestId('scripture-attribution')).toBeTruthy();
      expect(practiceScroll).toBeTruthy();
      expect(practiceScroll!.contains(attribution)).toBe(true);
      expect(component.isBibleBooks).toBe(false);
    });

    it('starts word mode in practicing phase', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('word');

      expect(component.phase).toBe('practicing');
      expect(component.practiceMode).toBe('word');
      expect(component.wordChoiceLabels.length).toBeGreaterThan(0);
    });

    it('starts reorder mode with slot assignment', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('reorder');

      expect(component.phase).toBe('practicing');
      expect(component.practiceMode).toBe('reorder');
      expect(component.reorderSlotChunkIds.length).toBe(component.reorderChunks.length);
      expect(component.reorderRoundMovableIndices.size).toBeGreaterThan(0);
    });

    it('starts firstLetters mode in practicing phase', async () => {
      const { component, getByTestId, cdr } = await renderSession();
      component.beginPracticeWithMode('firstLetters');

      expect(component.phase).toBe('practicing');
      expect(component.practiceMode).toBe('firstLetters');
      expect(component.hiddenIndices.size).toBe(component.typableIndices.length);
      cdr.detectChanges();
      const cues = getByTestId('memorize-first-letter-cues');
      const glyphSpans = cues.querySelectorAll('[data-memorize-cue-slot] > span');
      expect(glyphSpans.length).toBeGreaterThan(0);
      for (const span of Array.from(glyphSpans)) {
        expect(span.classList.contains('px-1')).toBe(true);
        expect(span.classList.contains('inline-block')).toBe(true);
      }
      expect(cues.querySelector('.ring-2')).toBeTruthy();
    });

    it('configures the practice input to discourage Safari contact AutoFill', async () => {
      const { component, getByTestId, cdr } = await renderSession();
      component.beginPracticeWithMode('type');
      cdr.detectChanges();

      const input = getByTestId('memorize-practice-input') as HTMLInputElement;
      expect(input.getAttribute('name')).toBe('search');
      expect(input.getAttribute('autocomplete')).toBe('off');
      expect(input.closest('form')?.getAttribute('autocomplete')).toBe('off');
      expect(input.getAttribute('aria-label')).not.toMatch(/name|email|contact/i);
    });

    it('focuses the practice input when starting firstLetters mode so the keyboard can open', async () => {
      const { component, getByTestId, cdr } = await renderSession();
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      component.beginPracticeWithMode('firstLetters');
      cdr.detectChanges();

      const input = getByTestId('memorize-practice-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(focusSpy).toHaveBeenCalled();
      const focusedInput = focusSpy.mock.instances.find(
        (el) => el === input || (el as HTMLElement).getAttribute?.('data-testid') === 'memorize-practice-input'
      );
      expect(focusedInput).toBeTruthy();
      focusSpy.mockRestore();
    });

    it('respects startRoundChoice for later rounds', async () => {
      const { component } = await renderSession();
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('type');

      expect(component.roundIndex).toBe(MEMORIZATION_FULL_HIDE_ROUND);
      expect(component.hiddenIndices.size).toBe(component.typableIndices.length);
    });

    it('tracks PostHog practice started when beginning word mode', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('word');

      expect(trackMemorizationPracticeSessionStartMock).toHaveBeenCalledWith(
        expect.any(String),
        verseItem,
        'word'
      );
      expect(trackMemorizationPracticeCompletedMock).not.toHaveBeenCalled();
    });

    it('tracks PostHog practice completed when finishing a session', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      trackMemorizationPracticeSessionStartMock.mockClear();
      (component as unknown as { wrongAttemptsRef: number }).wrongAttemptsRef = 2;
      (component as unknown as { correctKeystrokesRef: number }).correctKeystrokesRef = 18;

      component.finishPracticeSession();

      expect(trackMemorizationPracticeCompletedMock).toHaveBeenCalledWith(verseItem, 'type', {
        wrongAttempts: 2,
        correctKeystrokes: 18,
        completed: true,
      });
    });
  });

  describe('processWordGuess', () => {
    it('reveals token on correct guess', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('word');
      const idx = component.currentTargetIndex!;
      const correct = component.tokens[idx]!.text;

      component.processWordGuess(correct);

      expect(component.isTokenRevealed(idx)).toBe(true);
      expect(component.correctKeystrokesTotal).toBe(1);
    });

    it('increments wrong attempts on incorrect guess', async () => {
      const { component } = await renderSession();
      vi.useFakeTimers();
      component.beginPracticeWithMode('word');

      component.processWordGuess('__wrong__');
      expect(component.wrongAttemptsTotal).toBe(1);
      expect(component.flashError).toBe(true);

      vi.advanceTimersByTime(220);
      expect(component.flashError).toBe(false);
    });

    it('auto-reveals after three consecutive wrong guesses', async () => {
      const { component } = await renderSession({ memorizationStrictMode: false });
      vi.useFakeTimers();
      component.beginPracticeWithMode('word');
      const idx = component.currentTargetIndex!;

      component.processWordGuess('__wrong__');
      component.processWordGuess('__wrong__');
      component.processWordGuess('__wrong__');

      expect(component.isTokenRevealed(idx)).toBe(true);
      expect(component.wrongAttemptsTotal).toBe(3);
      vi.advanceTimersByTime(220);
    });

    it('does not auto-reveal after three wrong guesses when strict mode is on', async () => {
      const { component } = await renderSession({ memorizationStrictMode: true });
      vi.useFakeTimers();
      component.beginPracticeWithMode('word');
      const idx = component.currentTargetIndex!;

      component.processWordGuess('__wrong__');
      component.processWordGuess('__wrong__');
      component.processWordGuess('__wrong__');
      component.processWordGuess('__wrong__');

      expect(component.isTokenRevealed(idx)).toBe(false);
      expect(component.wrongAttemptsTotal).toBe(4);
      vi.advanceTimersByTime(220);
    });

    it('does not auto-reveal before session loads when user has strict mode', async () => {
      const { component, sessionService } = await renderSession({ deferSessionLoad: true });
      vi.useFakeTimers();
      component.beginPracticeWithMode('word');
      const idx = component.currentTargetIndex!;

      component.processWordGuess('__wrong__');
      component.processWordGuess('__wrong__');
      component.processWordGuess('__wrong__');
      expect(component.isTokenRevealed(idx)).toBe(false);

      sessionService.finishSessionLoad(true);
      component.processWordGuess('__wrong__');
      expect(component.isTokenRevealed(idx)).toBe(false);
      vi.advanceTimersByTime(220);
    });

    it('ignores guesses while hint is held', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('word');
      component.onHintPointerDown(makePointerEvent('down'));
      const idx = component.currentTargetIndex!;
      const correct = component.tokens[idx]!.text;

      component.processWordGuess(correct);

      expect(component.isTokenRevealed(idx)).toBe(false);
      component.onHintPointerUp(makePointerEvent('up'));
    });
  });

  describe('type mode input handlers', () => {
    it('onPracticeInputKeyDown processes valid letter keystroke', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      const idx = component.currentTargetIndex!;
      const token = component.tokens[idx]!;
      const key = token.kind === 'digit' ? token.text : token.text[0]!;

      component.onPracticeInputKeyDown(makeKeyEvent(key));

      expect(component.isTokenRevealed(idx)).toBe(true);
    });

    it('clears the red error ring after the flash and on a correct keystroke', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      const idx = component.currentTargetIndex!;
      const token = component.tokens[idx]!;
      const correctKey = token.kind === 'digit' ? token.text : token.text[0]!;
      const wrongKey = token.kind === 'digit' ? (correctKey === '0' ? '1' : '0') : correctKey.toLowerCase() === 'z' ? 'y' : 'z';

      vi.useFakeTimers();
      try {
        component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));
        expect(component.flashError).toBe(true);

        vi.advanceTimersByTime(220);
        expect(component.flashError).toBe(false);

        component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));
        expect(component.flashError).toBe(true);
        component.onPracticeInputKeyDown(makeKeyEvent(correctKey));
        expect(component.flashError).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('onPracticeInputKeyDown ignores modifier keys and non-character keys', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      const before = component.correctKeystrokesTotal;

      component.onPracticeInputKeyDown(makeKeyEvent('a', { ctrlKey: true }));
      component.onPracticeInputKeyDown(makeKeyEvent('Enter'));

      expect(component.correctKeystrokesTotal).toBe(before);
    });

    it('onPracticeInput processes pasted character', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      const idx = component.currentTargetIndex!;
      const token = component.tokens[idx]!;
      const key = token.kind === 'digit' ? token.text : token.text[0]!;
      const input = document.createElement('input');
      input.value = key;

      component.onPracticeInput({ target: input } as unknown as Event);

      expect(component.isTokenRevealed(idx)).toBe(true);
      expect(input.value).toBe('');
    });

    it('onPracticeInput clears value when suppressed from keydown', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      const input = document.createElement('input');
      input.value = 'x';
      component.onPracticeInputKeyDown(makeKeyEvent('z'));
      component.onPracticeInput({ target: input } as unknown as Event);
      expect(input.value).toBe('');
    });
  });

  describe('reorder mode', () => {
    it('onReorderInvalidDrop increments wrong attempts and flashes error', async () => {
      const { component } = await renderSession();
      vi.useFakeTimers();
      component.beginPracticeWithMode('reorder');

      component.onReorderInvalidDrop();

      expect(component.wrongAttemptsTotal).toBe(1);
      expect(component.flashError).toBe(true);
      vi.advanceTimersByTime(220);
      expect(component.flashError).toBe(false);
    });

    it('onReorderWrongSwap is ignored in standard mode', async () => {
      const { component } = await renderSession({ memorizationStrictMode: false });
      component.beginPracticeWithMode('reorder');
      component.onReorderWrongSwap();
      expect(component.wrongAttemptsTotal).toBe(0);
    });

    it('onReorderWrongSwap increments wrong attempts in strict mode', async () => {
      const { component } = await renderSession({ memorizationStrictMode: true });
      vi.useFakeTimers();
      component.beginPracticeWithMode('reorder');
      component.onReorderWrongSwap();
      expect(component.wrongAttemptsTotal).toBe(1);
      expect(component.flashError).toBe(true);
      vi.advanceTimersByTime(220);
      expect(component.flashError).toBe(false);
      vi.useRealTimers();
    });

    it('onReorderSlotChunkIdsChange updates slots', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('reorder');
      const swapped = [...component.reorderSlotChunkIds].reverse();

      component.onReorderSlotChunkIdsChange(swapped);

      expect(component.reorderSlotChunkIds).toEqual(swapped);
    });

    it('onReorderSlotsBecameCorrect adds keystrokes and may complete round', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('reorder');

      component.onReorderSlotsBecameCorrect([0]);

      expect(component.correctKeystrokesTotal).toBeGreaterThanOrEqual(1);
    });

    it('completes reorder round when slots are in reading order', async () => {
      const { component, persistInProgress } = await renderSession();
      component.beginPracticeWithMode('reorder');
      const n = component.reorderChunks.length;

      component.onReorderSlotChunkIdsChange(correctReorderOrder(n));

      expect(component.awaitingRoundAdvance).toBe(true);
      expect(component.roundAffirmation).toBeTruthy();
      expect(persistInProgress).toHaveBeenCalled();
    });
  });

  describe('close and start over', () => {
    it('handleClose emits closed and persistInProgress when practicing', async () => {
      const { component, closed, persistInProgress } = await renderSession();
      component.beginPracticeWithMode('type');

      component.handleClose();

      expect(closed).toHaveBeenCalled();
      expect(persistInProgress).toHaveBeenCalledWith(
        expect.objectContaining({ phase: expect.objectContaining({ kind: 'inRound' }) })
      );
      expect(component.listenPanelOpen).toBe(false);
    });

    it('handleClose persists betweenRounds when awaiting round advance', async () => {
      const { component, closed, persistInProgress } = await renderSession();
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);

      component.handleClose();

      expect(closed).toHaveBeenCalled();
      expect(persistInProgress).toHaveBeenCalledWith(
        expect.objectContaining({ phase: expect.objectContaining({ kind: 'betweenRounds' }) })
      );
    });

    it('handleClose persists live metrics when refs lag behind totals', async () => {
      const { component, persistInProgress } = await renderSession();
      component.beginPracticeWithMode('type');
      component.wrongAttemptsTotal = 2;
      component.correctKeystrokesTotal = 4;
      (component as unknown as { wrongAttemptsRef: number }).wrongAttemptsRef = 0;
      (component as unknown as { correctKeystrokesRef: number }).correctKeystrokesRef = 0;

      persistInProgress.mockClear();
      component.handleClose();

      expect(persistInProgress).toHaveBeenCalledWith(
        expect.objectContaining({ wrongAttempts: 2, correctKeystrokes: 4 })
      );
    });

    it('handleClose persists zero metrics when closing right after starting practice', async () => {
      const { component, persistInProgress } = await renderSession();
      (component as unknown as { wrongAttemptsRef: number }).wrongAttemptsRef = 9;
      (component as unknown as { correctKeystrokesRef: number }).correctKeystrokesRef = 7;

      component.beginPracticeWithMode('type');
      persistInProgress.mockClear();
      component.handleClose();

      expect(persistInProgress).toHaveBeenCalledWith(
        expect.objectContaining({ wrongAttempts: 0, correctKeystrokes: 0 })
      );
    });

    it('handleStartOver emits clearInProgress and resets to intro', async () => {
      const { component, clearInProgress } = await renderSession();
      component.beginPracticeWithMode('type');

      component.handleStartOver();

      expect(clearInProgress).toHaveBeenCalled();
      expect(component.phase).toBe('intro');
      expect(component.practiceMode).toBeNull();
    });
  });

  describe('Escape key handling', () => {
    it('closes mode picker on Escape', async () => {
      const { component, closed } = await renderSession();
      await component.openModePicker();
      expect(component.modePickerOpen).toBe(true);

      component.onWindowKeydown(makeKeyEvent('Escape'));

      expect(component.modePickerOpen).toBe(false);
      expect(closed).not.toHaveBeenCalled();
    });

    it('closes listen panel on Escape', async () => {
      const { component, closed } = await renderSession();
      component.openListenPanel();
      expect(component.listenPanelOpen).toBe(true);

      component.onWindowKeydown(makeKeyEvent('Escape'));

      expect(component.listenPanelOpen).toBe(false);
      expect(closed).not.toHaveBeenCalled();
    });

    it('closes session on Escape when no sub-panels open', async () => {
      const { component, closed } = await renderSession();
      component.onWindowKeydown(makeKeyEvent('Escape'));
      expect(closed).toHaveBeenCalled();
    });
  });

  describe('mode picker', () => {
    it('openModePicker and closeModePicker toggle flag', async () => {
      const { component } = await renderSession();

      await component.openModePicker();
      expect(component.modePickerOpen).toBe(true);

      component.closeModePicker();
      expect(component.modePickerOpen).toBe(false);
    });

    it('shows a close X instead of a Cancel button', async () => {
      const { component, getByTestId, queryByTestId, cdr } = await renderSession();

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-close')).toBeTruthy();
      expect(queryByTestId('memorize-practice-mode-cancel')).toBeNull();

      getByTestId('memorize-practice-mode-close').click();
      cdr.detectChanges();
      expect(component.modePickerOpen).toBe(false);
    });
  });

  describe('hint pointer handlers', () => {
    it('onHintPointerDown activates hint and onHintPointerUp clears it', async () => {
      const { component } = await renderSession();
      vi.useFakeTimers();
      component.beginPracticeWithMode('type');
      const btn = document.createElement('button');
      component.hintButtonRef = { nativeElement: btn } as ElementRef<HTMLButtonElement>;

      component.onHintPointerDown(makePointerEvent('down', btn));
      expect(component.hintHeld).toBe(true);
      expect(component.hintActive).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(component.hintPeekCount).toBeGreaterThan(1);

      component.onHintPointerUp(makePointerEvent('up', btn));
      expect(component.hintHeld).toBe(false);
      expect(component.hintActive).toBe(false);
    });

    it('onHintPointerLeave clears hint when no buttons pressed', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      component.onHintPointerDown(makePointerEvent('down'));
      component.onHintPointerLeave(makePointerEvent('leave'));
      expect(component.hintHeld).toBe(false);
    });
  });

  describe('hydrate inProgress from item', () => {
    it('hydrates betweenRounds state on open', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'saved-seed',
          wrongAttempts: 1,
          correctKeystrokes: 2,
          updatedAt: Date.now(),
          phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
          practiceMode: 'type',
        },
      };
      const { component } = await renderSession({ item });

      expect(component.phase).toBe('practicing');
      expect(component.awaitingRoundAdvance).toBe(true);
      expect(component.sessionSeed).toBe('saved-seed');
      expect(component.roundIndex).toBe(1);
      expect(component.roundAffirmation).toBeTruthy();
    });

    it('hydrates legacy betweenRounds errors for strict mode advance gate', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'legacy-seed',
          wrongAttempts: 2,
          correctKeystrokes: 4,
          updatedAt: Date.now(),
          phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
          practiceMode: 'type',
        },
      };
      const { component, cdr } = await renderSession({
        item,
        memorizationStrictMode: true,
      });

      expect(component.roundCompletedWithErrors).toBe(true);
      expect(component.wrongAttemptsInRound).toBe(2);
      cdr.detectChanges();
      expect(component.showNextRoundOption).toBe(false);
      expect(screen.queryByTestId('memorize-next-round')).toBeNull();
    });

    it('hydrates legacy inRound errors from session wrongAttempts', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'legacy-in-round',
          wrongAttempts: 2,
          correctKeystrokes: 1,
          updatedAt: Date.now(),
          phase: { kind: 'inRound', roundIndex: 1 },
          practiceMode: 'type',
        },
      };
      const { component } = await renderSession({ item, memorizationStrictMode: true });

      expect(component.wrongAttemptsInRound).toBe(2);
      expect(component.phase).toBe('practicing');
      expect(component.awaitingRoundAdvance).toBe(false);
    });

    it('re-syncs strict mode when user session updates after practice opens', async () => {
      const { component, sessionService } = await renderSession({ memorizationStrictMode: false });
      component.beginPracticeWithMode('type');
      expect(component.strictModeEnabled).toBe(false);

      sessionService.setMemorizationStrictMode(true);
      expect(component.strictModeEnabled).toBe(true);
    });

    it('hides Next round until session loads when between-rounds had errors', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'pending-session',
          wrongAttempts: 2,
          correctKeystrokes: 4,
          updatedAt: Date.now(),
          phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
          practiceMode: 'type',
        },
      };
      const { component, cdr, sessionService } = await renderSession({
        item,
        deferSessionLoad: true,
      });

      expect(component.roundCompletedWithErrors).toBe(true);
      expect(component.showNextRoundOption).toBe(false);
      cdr.detectChanges();
      expect(screen.queryByTestId('memorize-next-round')).toBeNull();

      const roundBefore = component.roundIndex;
      component.nextRound();
      expect(component.roundIndex).toBe(roundBefore);

      sessionService.finishSessionLoad(true);
      expect(component.strictModeEnabled).toBe(true);
      expect(component.showNextRoundOption).toBe(false);
    });

    it('shows Next round after session loads in standard mode despite prior errors', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'pending-session-standard',
          wrongAttempts: 1,
          correctKeystrokes: 2,
          updatedAt: Date.now(),
          phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
          practiceMode: 'type',
        },
      };
      const { component, cdr, sessionService } = await renderSession({
        item,
        deferSessionLoad: true,
      });

      expect(component.showNextRoundOption).toBe(false);
      sessionService.finishSessionLoad(false);
      cdr.detectChanges();

      expect(component.strictModeEnabled).toBe(false);
      expect(component.showNextRoundOption).toBe(true);
      expect(screen.getByTestId('memorize-next-round')).toBeTruthy();
    });

    it('hydrates inRound reorder state on open', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'reorder-seed',
          wrongAttempts: 0,
          correctKeystrokes: 0,
          updatedAt: Date.now(),
          phase: { kind: 'inRound', roundIndex: 2 },
          practiceMode: 'reorder',
        },
      };
      const { component } = await renderSession({ item });

      expect(component.phase).toBe('practicing');
      expect(component.practiceMode).toBe('reorder');
      expect(component.roundIndex).toBe(2);
      expect(component.reorderSlotChunkIds.length).toBe(component.reorderChunks.length);
      expect(component.awaitingRoundAdvance).toBe(false);
      expect(trackMemorizationPracticeSessionStartMock).toHaveBeenCalledWith(
        'reorder-seed',
        item,
        'reorder',
        { resumed: true }
      );
    });

    it('hydrates inRound type state on open', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'type-seed',
          wrongAttempts: 3,
          correctKeystrokes: 4,
          updatedAt: Date.now(),
          phase: { kind: 'inRound', roundIndex: 2 },
          practiceMode: 'type',
        },
      };
      const { component } = await renderSession({ item });

      expect(component.phase).toBe('practicing');
      expect(component.practiceMode).toBe('type');
      expect(component.hiddenIndices.size).toBeGreaterThan(0);
      expect(component.wrongAttemptsTotal).toBe(3);
    });

    it('focuses the practice input when reopening an in-progress type session', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'resume-seed',
          wrongAttempts: 1,
          correctKeystrokes: 2,
          updatedAt: Date.now(),
          phase: { kind: 'inRound', roundIndex: 1 },
          practiceMode: 'type',
        },
      };
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      const { getByTestId, cdr } = await renderSession({ item });
      cdr.detectChanges();

      const input = getByTestId('memorize-practice-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      const focusedInput = focusSpy.mock.instances.find(
        (el) =>
          el === input ||
          (el as HTMLElement).getAttribute?.('data-testid') === 'memorize-practice-input'
      );
      expect(focusedInput).toBeTruthy();
      focusSpy.mockRestore();
    });

    it('focuses the practice input when reopening an in-progress firstLetters session', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'resume-fl-seed',
          wrongAttempts: 0,
          correctKeystrokes: 1,
          updatedAt: Date.now(),
          phase: { kind: 'inRound', roundIndex: 1 },
          practiceMode: 'firstLetters',
        },
      };
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      const { getByTestId, cdr } = await renderSession({ item });
      cdr.detectChanges();

      const input = getByTestId('memorize-practice-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      const focusedInput = focusSpy.mock.instances.find(
        (el) =>
          el === input ||
          (el as HTMLElement).getAttribute?.('data-testid') === 'memorize-practice-input'
      );
      expect(focusedInput).toBeTruthy();
      focusSpy.mockRestore();
    });

    it('keeps the capture input WebKit-keyboard-eligible (not opacity 0 / pointer-events none)', () => {
      const source = readFileSync(
        join(componentDir, 'memorization-practice-session.component.ts'),
        'utf-8'
      );
      const stylesMatch = source.match(/\.memorize-practice-input-hidden\s*\{([\s\S]*?)\n\s*\}/);
      expect(stylesMatch?.[1]).toBeTruthy();
      const rule = stylesMatch![1];
      expect(rule).toMatch(/opacity:\s*0\.01/);
      expect(rule).not.toMatch(/pointer-events:\s*none/);
      expect(rule).not.toMatch(/opacity:\s*0\s*;/);
    });

    it('soft-clicks the practice input after focus so mobile keyboards open', async () => {
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      const clickSpy = vi.spyOn(HTMLElement.prototype, 'click');
      const { getByTestId, component, cdr } = await renderSession();
      component.beginPracticeWithMode('type');
      cdr.detectChanges();

      const input = getByTestId('memorize-practice-input') as HTMLInputElement;
      expect(
        focusSpy.mock.instances.some(
          (el) =>
            el === input ||
            (el as HTMLElement).getAttribute?.('data-testid') === 'memorize-practice-input'
        )
      ).toBe(true);
      expect(
        clickSpy.mock.instances.some(
          (el) =>
            el === input ||
            (el as HTMLElement).getAttribute?.('data-testid') === 'memorize-practice-input'
        )
      ).toBe(true);
      focusSpy.mockRestore();
      clickSpy.mockRestore();
    });
  });

  describe('handleItemIdChange', () => {
    it('keeps done phase when inProgress cleared after completion', async () => {
      const { component, fixture, completed } = await renderSession();
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);

      expect(component.phase).toBe('done');
      expect(completed).toHaveBeenCalled();

      const clearedItem: MemorizedItem = {
        ...verseItem,
        id: 'v2',
        inProgressPractice: null,
      };
      component.ngOnChanges({
        item: new SimpleChange(verseItem, clearedItem, false),
      });

      expect(component.phase).toBe('done');
      fixture.detectChanges();
    });

    it('resets to intro when inProgress cleared while not done', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');

      const clearedItem: MemorizedItem = {
        ...verseItem,
        id: 'v2',
        inProgressPractice: null,
      };
      component.ngOnChanges({
        item: new SimpleChange(verseItem, clearedItem, false),
      });

      expect(component.phase).toBe('intro');
    });
  });

  describe('listen panel', () => {
    it('openListenPanel, closeListenPanel, and onSelectListenSpeed', async () => {
      const { component } = await renderSession();
      const audioEl = document.createElement('audio');
      component.passageAudioRef = { nativeElement: audioEl } as ElementRef<HTMLAudioElement>;

      component.openListenPanel();
      expect(component.listenPanelOpen).toBe(true);

      component.onSelectListenSpeed(1.5);
      expect(component.listenPlaybackRate).toBe(1.5);

      component.closeListenPanel();
      expect(component.listenPanelOpen).toBe(false);
    });

    it('handleListenPassageClick plays streaming audio', async () => {
      const { component, fixture } = await renderSession();
      const audioEl = document.createElement('audio');
      audioEl.pause = vi.fn();
      audioEl.play = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(audioEl, 'paused', { value: true, configurable: true });
      component.passageAudioRef = { nativeElement: audioEl } as ElementRef<HTMLAudioElement>;

      component.handleListenPassageClick();
      await fixture.whenStable();

      expect(audioEl.play).toHaveBeenCalled();
      expect(component.passageAudioPlaying).toBe(true);
    });

    it('handleRepeatListenToggle enables repeat playback', async () => {
      const { component } = await renderSession();
      const audioEl = document.createElement('audio');
      audioEl.play = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(audioEl, 'paused', { value: true, configurable: true });
      component.passageAudioRef = { nativeElement: audioEl } as ElementRef<HTMLAudioElement>;

      component.handleRepeatListenToggle();
      expect(component.repeatListenOn).toBe(true);
    });
  });

  describe('token display helpers', () => {
    it('isTokenHidden, showViaHint, and isCurrentBlank', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      const blankIdx = component.currentTargetIndex!;
      const visibleIdx = component.typableIndices.find((i) => !component.hiddenIndices.has(i));

      expect(component.isTokenHidden(blankIdx)).toBe(true);
      expect(component.isCurrentBlank(blankIdx)).toBe(true);
      if (visibleIdx != null) {
        expect(component.isTokenHidden(visibleIdx)).toBe(false);
        expect(component.isCurrentBlank(visibleIdx)).toBe(false);
      }

      component.onHintPointerDown(makePointerEvent('down'));
      const peekIdx = [...component.hintPeekIndices][0];
      if (peekIdx != null) {
        expect(component.showViaHint(peekIdx)).toBe(true);
      }
      component.onHintPointerUp(makePointerEvent('up'));
    });
  });

  describe('round advance actions', () => {
    it('repeatRound and nextRound when awaitingRoundAdvance', async () => {
      const { component, persistInProgress } = await renderSession();
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);
      expect(component.awaitingRoundAdvance).toBe(true);

      component.repeatRound();
      expect(component.awaitingRoundAdvance).toBe(false);
      expect(component.phase).toBe('practicing');

      revealAllHiddenViaTyping(component);
      expect(component.awaitingRoundAdvance).toBe(true);

      component.nextRound();
      expect(component.roundIndex).toBe(2);
      expect(component.awaitingRoundAdvance).toBe(false);
      expect(persistInProgress).toHaveBeenCalled();
    });

    it('persistInProgress saves wrongAttemptsInRound 0 after repeatRound', async () => {
      const { component, persistInProgress } = await renderSession({ memorizationStrictMode: true });
      component.beginPracticeWithMode('word');
      component.processWordGuess('__wrong__');
      const idx = component.currentTargetIndex!;
      component.processWordGuess(component.tokens[idx]!.text);
      while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance) {
        const i = component.currentTargetIndex!;
        component.processWordGuess(component.tokens[i]!.text);
      }
      expect(component.wrongAttemptsInRound).toBe(1);

      persistInProgress.mockClear();
      component.repeatRound();

      expect(component.wrongAttemptsInRound).toBe(0);
      expect(persistInProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          wrongAttemptsInRound: 0,
          phase: { kind: 'inRound', roundIndex: component.roundIndex },
        }),
      );
    });

    it('hides Next round in strict mode when the round had errors', async () => {
      const { component, cdr } = await renderSession({ memorizationStrictMode: true });
      component.beginPracticeWithMode('word');
      component.processWordGuess('__wrong__');
      const idx = component.currentTargetIndex!;
      component.processWordGuess(component.tokens[idx]!.text);
      while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance) {
        const i = component.currentTargetIndex!;
        component.processWordGuess(component.tokens[i]!.text);
      }
      cdr.detectChanges();

      expect(component.awaitingRoundAdvance).toBe(true);
      expect(component.showNextRoundOption).toBe(false);
      expect(screen.queryByTestId('memorize-next-round')).toBeNull();
    });

    it('shows Next round in strict mode after a perfect round', async () => {
      const { component, cdr } = await renderSession({ memorizationStrictMode: true });
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);
      cdr.detectChanges();

      expect(component.awaitingRoundAdvance).toBe(true);
      expect(component.showNextRoundOption).toBe(true);
      expect(screen.getByTestId('memorize-next-round')).toBeTruthy();
    });

    it('strict final round with errors shows repeat instead of done', async () => {
      const { component, cdr, completed } = await renderSession({ memorizationStrictMode: true });
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('word');
      component.processWordGuess('__wrong__');
      while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance) {
        const i = component.currentTargetIndex!;
        component.processWordGuess(component.tokens[i]!.text);
      }
      cdr.detectChanges();

      expect(component.phase).toBe('practicing');
      expect(component.awaitingRoundAdvance).toBe(true);
      expect(component.roundCompletedWithErrors).toBe(true);
      expect(component.showNextRoundOption).toBe(false);
      expect(screen.queryByTestId('memorize-next-round')).toBeNull();
      expect(completed).not.toHaveBeenCalled();
    });

    it('strict final round with perfect completion shows done', async () => {
      const { component, cdr, completed } = await renderSession({ memorizationStrictMode: true });
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);
      cdr.detectChanges();

      expect(component.phase).toBe('done');
      expect(component.completionMessage).toBeTruthy();
      expect(screen.getByTestId('memorize-done-title').textContent?.trim()).toBe('Finished');
      expect(completed).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
    });

    it('standard final round with errors still shows done', async () => {
      const { component, cdr, completed } = await renderSession({ memorizationStrictMode: false });
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('word');
      component.processWordGuess('__wrong__');
      while (component.currentTargetIndex !== null && component.phase !== 'done') {
        const i = component.currentTargetIndex!;
        component.processWordGuess(component.tokens[i]!.text);
      }
      cdr.detectChanges();

      expect(component.phase).toBe('done');
      expect(completed).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
    });

    it('strict final round requires perfect repeat before done', async () => {
      const { component, cdr, completed } = await renderSession({ memorizationStrictMode: true });
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('word');
      component.processWordGuess('__wrong__');
      while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance) {
        const i = component.currentTargetIndex!;
        component.processWordGuess(component.tokens[i]!.text);
      }
      expect(completed).not.toHaveBeenCalled();

      component.repeatRound();
      revealAllHiddenViaTyping(component);
      cdr.detectChanges();

      expect(component.phase).toBe('done');
      expect(completed).toHaveBeenCalledTimes(1);
    });

    it('standard resume on final round with errors shows finish instead of next round', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'final-standard-resume',
          wrongAttempts: 2,
          correctKeystrokes: 10,
          wrongAttemptsInRound: 2,
          updatedAt: Date.now(),
          phase: { kind: 'betweenRounds', completedRoundIndex: MEMORIZATION_FULL_HIDE_ROUND },
          practiceMode: 'type',
        },
      };
      const { component, cdr, completed } = await renderSession({
        item,
        memorizationStrictMode: false,
      });
      cdr.detectChanges();

      expect(component.awaitingRoundAdvance).toBe(true);
      expect(component.roundIndex).toBe(MEMORIZATION_FULL_HIDE_ROUND);
      expect(component.showNextRoundOption).toBe(false);
      expect(component.showFinishPracticeOption).toBe(true);
      expect(screen.queryByTestId('memorize-next-round')).toBeNull();
      expect(screen.getByTestId('memorize-finish-practice')).toBeTruthy();
      expect(
        screen.getByText(/repeat this round or finish practice/i),
      ).toBeTruthy();

      component.nextRound();
      expect(component.roundIndex).toBe(MEMORIZATION_FULL_HIDE_ROUND);

      component.finishPracticeSession();
      cdr.detectChanges();

      expect(component.phase).toBe('done');
      expect(completed).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
    });

    it('switching strict off on final round with errors shows finish practice', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'final-strict-resume',
          wrongAttempts: 1,
          correctKeystrokes: 8,
          wrongAttemptsInRound: 1,
          updatedAt: Date.now(),
          phase: { kind: 'betweenRounds', completedRoundIndex: MEMORIZATION_FULL_HIDE_ROUND },
          practiceMode: 'type',
        },
      };
      const { component, cdr, sessionService, completed } = await renderSession({
        item,
        memorizationStrictMode: true,
      });
      cdr.detectChanges();

      expect(component.showNextRoundOption).toBe(false);
      expect(component.showFinishPracticeOption).toBe(false);

      sessionService.setMemorizationStrictMode(false);
      cdr.detectChanges();

      expect(component.showFinishPracticeOption).toBe(true);
      expect(screen.getByTestId('memorize-finish-practice')).toBeTruthy();
      expect(
        screen.getByText(/repeat this round or finish practice/i),
      ).toBeTruthy();

      component.finishPracticeSession();
      cdr.detectChanges();

      expect(component.phase).toBe('done');
      expect(completed).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
    });

    it('strict final round with errors waits for session before finishing', async () => {
      const { component, cdr, completed, sessionService } = await renderSession({
        memorizationStrictMode: true,
        deferSessionLoad: true,
      });
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('word');
      component.processWordGuess('__wrong__');
      while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance && component.phase !== 'done') {
        const i = component.currentTargetIndex!;
        component.processWordGuess(component.tokens[i]!.text);
      }
      cdr.detectChanges();

      expect(component.phase).toBe('practicing');
      expect(component.awaitingRoundAdvance).toBe(true);
      expect(completed).not.toHaveBeenCalled();
      expect(component.showFinishPracticeOption).toBe(false);
      expect(screen.queryByTestId('memorize-finish-practice')).toBeNull();
      expect(
        screen.getByText(/finish practice once settings load/i),
      ).toBeTruthy();

      sessionService.finishSessionLoad(true);
      cdr.detectChanges();

      expect(component.strictModeEnabled).toBe(true);
      expect(component.showFinishPracticeOption).toBe(false);
      expect(completed).not.toHaveBeenCalled();
    });

    it('standard final round with errors auto-finishes once session loads', async () => {
      const { component, cdr, completed, sessionService } = await renderSession({
        memorizationStrictMode: false,
        deferSessionLoad: true,
      });
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('word');
      component.processWordGuess('__wrong__');
      while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance && component.phase !== 'done') {
        const i = component.currentTargetIndex!;
        component.processWordGuess(component.tokens[i]!.text);
      }
      cdr.detectChanges();

      expect(component.phase).toBe('practicing');
      expect(component.awaitingRoundAdvance).toBe(true);
      expect(completed).not.toHaveBeenCalled();

      sessionService.finishSessionLoad(false);
      cdr.detectChanges();

      expect(component.phase).toBe('done');
      expect(completed).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
    });
  });

  describe('passage audio handlers', () => {
    it('onPassageAudioPlay, Pause, Error update playing state', async () => {
      const { component } = await renderSession();
      const audioEl = document.createElement('audio');
      component.passageAudioRef = { nativeElement: audioEl } as ElementRef<HTMLAudioElement>;

      component.onPassageAudioPlay();
      expect(component.passageAudioPlaying).toBe(true);

      component.onPassageAudioPause();
      expect(component.passageAudioPlaying).toBe(false);

      component.onPassageAudioError();
      expect(component.passageAudioPlaying).toBe(false);
    });

    it('onPassageAudioEnded repeats when repeatListenOn is enabled', async () => {
      const { component } = await renderSession();
      vi.useFakeTimers();
      const audioEl = document.createElement('audio');
      audioEl.play = vi.fn().mockResolvedValue(undefined);
      audioEl.setAttribute('src', 'https://audio.test/x.mp3');
      component.passageAudioRef = { nativeElement: audioEl } as ElementRef<HTMLAudioElement>;
      component.repeatListenOn = true;
      component['repeatListenOnRef'] = true;

      component.onPassageAudioEnded();
      expect(component.passageAudioPlaying).toBe(false);

      vi.advanceTimersByTime(MEMORIZE_LISTEN_REPEAT_GAP_MS);
      expect(audioEl.play).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges cleanup', () => {
    it('isOpen false triggers cleanup and restores body overflow', async () => {
      const { component, fixture } = await renderSession();
      expect(document.body.style.overflow).toBe('hidden');

      fixture.componentRef.setInput('isOpen', false);
      component.ngOnChanges({
        isOpen: new SimpleChange(true, false, false),
      });

      expect(document.body.style.overflow).toBe('unset');
      expect(document.documentElement.style.overflow).toBe('unset');
      fixture.detectChanges();
    });
  });

  describe('additional coverage paths', () => {
    it('completes final round and emits completed', async () => {
      const { component, completed } = await renderSession();
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);

      expect(component.phase).toBe('done');
      expect(component.completionMessage).toBeTruthy();
      expect(completed).toHaveBeenCalledWith(
        expect.objectContaining({ completed: true })
      );
    });

    it('onBackdropNothing is a no-op', async () => {
      const { component } = await renderSession();
      expect(() => component.onBackdropNothing()).not.toThrow();
    });

    it('verse touch handlers focus input when not scrolling', async () => {
      const { component, getByTestId, cdr } = await renderSession();
      component.beginPracticeWithMode('type');
      cdr.detectChanges();
      const input = getByTestId('memorize-practice-input') as HTMLInputElement;
      const focusSpy = vi.spyOn(input, 'focus');

      const touch = { clientX: 10, clientY: 10 } as Touch;
      component.onVerseTouchStart({ touches: [touch] } as TouchEvent);
      component.onVerseTouchMove({
        touches: [{ clientX: 11, clientY: 11 } as Touch],
      } as TouchEvent);
      component.onVerseTouchCancel();
      component.onVerseTouchEnd();

      expect(focusSpy).toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it('verse touch move beyond threshold suppresses focus', async () => {
      const { component, getByTestId, cdr } = await renderSession();
      component.beginPracticeWithMode('type');
      cdr.detectChanges();
      const input = getByTestId('memorize-practice-input') as HTMLInputElement;
      const focusSpy = vi.spyOn(input, 'focus');

      component.onVerseTouchStart({ touches: [{ clientX: 0, clientY: 0 } as Touch] } as TouchEvent);
      component.onVerseTouchMove({
        touches: [{ clientX: 20, clientY: 20 } as Touch],
      } as TouchEvent);
      component.onVerseTouchEnd();

      expect(focusSpy).not.toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it('listen getters reflect streaming audio state', async () => {
      const { component } = await renderSession();
      const audioEl = document.createElement('audio');
      audioEl.setAttribute('src', 'https://audio.test/x.mp3');
      Object.defineProperty(audioEl, 'paused', { value: false, configurable: true });
      Object.defineProperty(audioEl, 'ended', { value: false, configurable: true });
      component.passageAudioRef = { nativeElement: audioEl } as ElementRef<HTMLAudioElement>;

      expect(component.listenButtonLabel).toBe('Pause');
      expect(component.listenAriaPressed).toBe(true);
      expect(component.readAloudDialogPrimaryLabel).toBe('Pause');
    });

    it('loadAudioUrl handles scripture service errors', async () => {
      mockScriptureService.getAudioUrl.mockRejectedValueOnce(new Error('network'));
      const { component } = await renderSession();
      expect(component.passageAudioUrl).toBeNull();
      expect(component.translationListenEnabled).toBe(true);
    });

    it('ngOnDestroy runs cleanup', async () => {
      const { fixture } = await renderSession();
      document.body.style.overflow = 'hidden';
      fixture.destroy();
      expect(document.body.style.overflow).toBe('unset');
    });

    it('onReorderSlotsBecameCorrect ignores empty slots', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('reorder');
      const before = component.correctKeystrokesTotal;
      component.onReorderSlotsBecameCorrect([]);
      expect(component.correctKeystrokesTotal).toBe(before);
    });

    it('handleListenPassageClick pauses when audio is playing', async () => {
      const { component } = await renderSession();
      const audioEl = document.createElement('audio');
      const pauseSpy = vi.fn();
      audioEl.pause = pauseSpy;
      Object.defineProperty(audioEl, 'paused', { value: false, configurable: true });
      component.passageAudioRef = { nativeElement: audioEl } as ElementRef<HTMLAudioElement>;

      component.handleListenPassageClick();

      expect(pauseSpy).toHaveBeenCalled();
      expect(component.passageAudioPlaying).toBe(false);
    });
  });

  describe('extended coverage', () => {
    it('firstLetters mode reveals tokens via first-letter keystrokes', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('firstLetters');
      revealAllHiddenViaTyping(component);
      expect(component.revealed.size).toBe(component.typableIndices.length);
    });

    it('type mode auto-reveals token after three wrong keystrokes', async () => {
      const { component } = await renderSession({ memorizationStrictMode: false });
      vi.useFakeTimers();
      component.beginPracticeWithMode('type');
      const idx = component.currentTargetIndex!;
      const token = component.tokens[idx]!;
      const wrongKey = token.kind === 'digit' ? (token.text === '0' ? '9' : '0') : 'Z';

      component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));
      component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));
      component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));

      expect(component.isTokenRevealed(idx)).toBe(true);
      vi.advanceTimersByTime(220);
      vi.useRealTimers();
    });

    it('type mode does not auto-reveal when strict mode is on', async () => {
      const { component } = await renderSession({ memorizationStrictMode: true });
      vi.useFakeTimers();
      component.beginPracticeWithMode('type');
      const idx = component.currentTargetIndex!;
      const token = component.tokens[idx]!;
      const wrongKey = token.kind === 'digit' ? (token.text === '0' ? '9' : '0') : 'Z';

      component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));
      component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));
      component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));
      component.onPracticeInputKeyDown(makeKeyEvent(wrongKey));

      expect(component.isTokenRevealed(idx)).toBe(false);
      expect(component.wrongAttemptsTotal).toBe(4);
      vi.advanceTimersByTime(220);
      vi.useRealTimers();
    });

    it('shows round error count in practice header only when greater than zero', async () => {
      const { component, cdr } = await renderSession();
      vi.useFakeTimers();
      component.beginPracticeWithMode('word');
      cdr.detectChanges();
      expect(screen.queryByTestId('memorize-error-count')).toBeNull();

      component.processWordGuess('__wrong__');
      cdr.detectChanges();
      expect(screen.getByTestId('memorize-error-count').textContent).toContain('Errors: 1');
      vi.useRealTimers();
    });

    it('keeps round error count visible until the next round starts', async () => {
      const { component, cdr } = await renderSession({ memorizationStrictMode: true });
      component.beginPracticeWithMode('word');
      component.processWordGuess('__wrong__');
      const idx = component.currentTargetIndex!;
      component.processWordGuess(component.tokens[idx]!.text);
      while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance) {
        const i = component.currentTargetIndex!;
        component.processWordGuess(component.tokens[i]!.text);
      }
      cdr.detectChanges();
      expect(screen.getByTestId('memorize-error-count').textContent).toContain('Errors: 1');
      expect(component.wrongAttemptsInRound).toBe(1);

      component.repeatRound();
      cdr.detectChanges();
      expect(screen.queryByTestId('memorize-error-count')).toBeNull();
      expect(component.wrongAttemptsInRound).toBe(0);
    });

    it('onPracticeInput clears value when hint is active', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      component.onHintPointerDown(makePointerEvent('down'));
      const input = document.createElement('input');
      input.value = 'x';
      component.onPracticeInput({ target: input } as unknown as Event);
      expect(input.value).toBe('');
      component.onHintPointerUp(makePointerEvent('up'));
    });

    it('onPracticeInput clears value when not practicing', async () => {
      const { component } = await renderSession();
      const input = document.createElement('input');
      input.value = 'a';
      component.onPracticeInput({ target: input } as unknown as Event);
      expect(input.value).toBe('');
    });

    it('onHintPointerLeave ignores leave while pointer buttons are down', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      component.onHintPointerDown(makePointerEvent('down'));
      component.onHintPointerLeave({
        buttons: 1,
        pointerId: 1,
        currentTarget: document.createElement('button'),
      } as unknown as PointerEvent);
      expect(component.hintHeld).toBe(true);
      component.onHintPointerUp(makePointerEvent('up'));
    });

    it('onWindowKeydown ignores Escape when session is closed', async () => {
      const { component, closed } = await renderSession();
      component.isOpen = false;
      component.onWindowKeydown(makeKeyEvent('Escape'));
      expect(closed).not.toHaveBeenCalled();
    });

    it('handleClose does not persist when still in intro', async () => {
      const { component, closed, persistInProgress } = await renderSession();
      const callsBefore = persistInProgress.mock.calls.length;
      component.handleClose();
      expect(closed).toHaveBeenCalled();
      expect(persistInProgress.mock.calls.length).toBe(callsBefore);
    });

    it('exposes wordChoiceLabels during word practice', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('word');
      expect(component.wordChoiceLabels.length).toBeGreaterThan(0);
      expect(component.currentTargetToken).toBeTruthy();
    });

    it('schedules scroll after a word guess so the blank stays above the choice footer', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('word');
      const scheduleSpy = vi.spyOn(
        component as unknown as { scheduleScrollToBlank: (opts?: { force?: boolean }) => void },
        'scheduleScrollToBlank'
      );
      const token = component.currentTargetToken;
      expect(token).toBeTruthy();
      component.processWordGuess(token!.text);
      expect(scheduleSpy).toHaveBeenCalled();
    });

    it('scrolls the verse blank in firstLetters mode, not only the cue strip', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('firstLetters');
      const blankSpy = vi.spyOn(
        component as unknown as { scrollCurrentBlankIntoView: () => void },
        'scrollCurrentBlankIntoView'
      );
      const cueSpy = vi.spyOn(
        component as unknown as { scrollActiveFirstLetterCueIntoView: () => void },
        'scrollActiveFirstLetterCueIntoView'
      );
      vi.useFakeTimers();
      component['hasTypedInRound'] = true;
      (
        component as unknown as { scheduleScrollToBlank: (opts?: { force?: boolean }) => void }
      ).scheduleScrollToBlank();
      vi.runAllTimers();
      vi.useRealTimers();
      expect(cueSpy).toHaveBeenCalled();
      expect(blankSpy).toHaveBeenCalled();
    });

    it('nudge blank into view with instant scrollTop (no smooth bounce)', async () => {
      const { component, container } = await renderSession();
      component.beginPracticeWithMode('type');
      component['hasTypedInRound'] = true;
      const scrollEl = container.querySelector('#practiceScroll') as HTMLElement;
      expect(scrollEl).toBeTruthy();
      Object.defineProperty(scrollEl, 'clientHeight', { configurable: true, value: 200 });
      Object.defineProperty(scrollEl, 'scrollHeight', { configurable: true, value: 2000 });
      scrollEl.scrollTop = 0;
      const blank = container.querySelector(
        '[data-memorize-current-blank="true"]'
      ) as HTMLElement | null;
      expect(blank).toBeTruthy();
      vi.spyOn(blank!, 'getBoundingClientRect').mockReturnValue({
        top: 500,
        bottom: 530,
        left: 0,
        right: 40,
        width: 40,
        height: 30,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      });
      vi.spyOn(scrollEl, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 300,
        left: 0,
        right: 360,
        width: 360,
        height: 200,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      });
      const scrollToSpy = vi.spyOn(scrollEl, 'scrollTo');
      (
        component as unknown as { scrollCurrentBlankIntoView: () => void }
      ).scrollCurrentBlankIntoView();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      expect(scrollEl.scrollTop).toBeGreaterThan(0);
      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('firstLetterCueHiddenSlots returns slots in later firstLetters rounds', async () => {
      const { component } = await renderSession();
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('firstLetters');
      expect(component.firstLetterCueHiddenSlots.size).toBeGreaterThan(0);
    });

    it('listen getters use speech synthesis when streaming is unavailable', async () => {
      const { component } = await renderSession();
      component.listenViaStreamingAudio = false;
      component.translationListenEnabled = true;
      Object.assign(window.speechSynthesis, { speaking: true, paused: false });
      component['memorizeWebSpeechUtteranceIsOurs'] = true;

      expect(component.listenButtonLabel).toBe('Pause');
      expect(component.listenAriaPressed).toBe(true);
      expect(component.readAloudDialogPrimaryAriaLabel).toContain('Pause');
    });

    it('handleListenPassageClick starts device TTS when streaming is off', async () => {
      class MockUtterance {
        lang = '';
        rate = 1;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
      }
      window.SpeechSynthesisUtterance = MockUtterance as unknown as typeof SpeechSynthesisUtterance;
      const speak = vi.fn((utterance: MockUtterance) => {
        Object.assign(window.speechSynthesis, { speaking: true, paused: false });
        utterance.onstart?.();
      });
      Object.assign(window.speechSynthesis, { speaking: false, paused: false, speak, cancel: vi.fn() });

      const { component } = await renderSession();
      component.listenViaStreamingAudio = false;
      component.translationListenEnabled = true;

      component.handleListenPassageClick();

      expect(speak).toHaveBeenCalled();
      expect(component.listenButtonLabel).toBe('Pause');
    });

    it('handleListenPassageClick pauses and resumes TTS utterance', async () => {
      const { component } = await renderSession();
      component.listenViaStreamingAudio = false;
      component.translationListenEnabled = true;
      component['memorizeWebSpeechUtteranceIsOurs'] = true;
      Object.assign(window.speechSynthesis, {
        speaking: true,
        paused: false,
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        speak: vi.fn(),
      });

      component.handleListenPassageClick();
      expect(window.speechSynthesis.pause).toHaveBeenCalled();

      Object.assign(window.speechSynthesis, { speaking: true, paused: true });
      component.handleListenPassageClick();
      expect(window.speechSynthesis.resume).toHaveBeenCalled();
    });

    it('handleRepeatListenToggle starts TTS when repeat is enabled', async () => {
      class MockUtterance {
        lang = '';
        rate = 1;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
      }
      window.SpeechSynthesisUtterance = MockUtterance as unknown as typeof SpeechSynthesisUtterance;
      Object.assign(window.speechSynthesis, {
        speaking: false,
        paused: false,
        speak: vi.fn(),
        cancel: vi.fn(),
      });

      const { component } = await renderSession();
      component.listenViaStreamingAudio = false;
      component.translationListenEnabled = true;
      component.handleRepeatListenToggle();
      expect(component.repeatListenOn).toBe(true);
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });

    it('bible books item uses books reorder chunks and skips streaming audio', async () => {
      const bibleBooksItem: MemorizedItem = {
        id: 'bb1',
        reference: 'Old Testament books',
        text: 'Genesis Exodus',
        translation: 'esv',
        dateAdded: Date.now(),
        lastPracticedAt: null,
        practiceSessions: [],
        kind: 'bibleBooks',
        bibleBooksScope: 'ot',
      };
      const { component } = await renderSession({ item: bibleBooksItem });

      expect(component.isBibleBooks).toBe(true);
      expect(component.listenViaStreamingAudio).toBe(false);
      expect(component.reorderChunks.length).toBeGreaterThan(0);
      expect(mockScriptureService.getAudioUrl).not.toHaveBeenCalled();
    });

    it('non-listen translation disables streaming listen UI', async () => {
      const kjvItem = {
        ...verseItem,
        id: 'kjv1',
        translation: 'kjv' as unknown as MemorizedItem['translation'],
      };
      mockScriptureService.getAudioUrl.mockClear();
      const { component } = await renderSession({ item: kjvItem });

      expect(component.translationListenEnabled).toBe(false);
      expect(component.listenViaStreamingAudio).toBe(false);
      expect(mockScriptureService.getAudioUrl).not.toHaveBeenCalled();
    });

    it('attaches viewport inset listeners when visualViewport exists', async () => {
      const addListener = vi.fn();
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: {
          height: 500,
          offsetTop: 0,
          addEventListener: addListener,
          removeEventListener: vi.fn(),
        },
      });

      await renderSession();
      expect(addListener).toHaveBeenCalled();
    });

    it('startRoundAndFocusInput starts a new round', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      component.startRoundAndFocusInput(2);
      expect(component.roundIndex).toBe(2);
      expect(component.phase).toBe('practicing');
    });

    it('handleRepeatListenToggle disables repeat and clears gap timer', async () => {
      const { component } = await renderSession();
      component.handleRepeatListenToggle();
      expect(component.repeatListenOn).toBe(true);
      component.handleRepeatListenToggle();
      expect(component.repeatListenOn).toBe(false);
    });

    it('TTS utterance onend schedules repeat when repeatListenOn is enabled', async () => {
      class MockUtterance {
        lang = '';
        rate = 1;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
      }
      window.SpeechSynthesisUtterance = MockUtterance as unknown as typeof SpeechSynthesisUtterance;
      let captured: MockUtterance | null = null;
      Object.assign(window.speechSynthesis, {
        speaking: false,
        paused: false,
        cancel: vi.fn(),
        speak: vi.fn((utterance: MockUtterance) => {
          captured = utterance;
          Object.assign(window.speechSynthesis, { speaking: true, paused: false });
          utterance.onstart?.();
        }),
      });

      const { component } = await renderSession();
      vi.useFakeTimers();
      component.listenViaStreamingAudio = false;
      component.translationListenEnabled = true;
      component.handleRepeatListenToggle();
      component.handleListenPassageClick();
      captured?.onend?.();
      vi.advanceTimersByTime(MEMORIZE_LISTEN_REPEAT_GAP_MS);
      expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    });

    it('onVerseTouchEnd does not focus while awaiting round advance', async () => {
      const { component } = await renderSession();
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);
      expect(component.awaitingRoundAdvance).toBe(true);
      const input = document.createElement('input');
      const focusSpy = vi.spyOn(input, 'focus');
      component.practiceInputRef = { nativeElement: input } as ElementRef<HTMLInputElement>;
      component.onVerseTouchEnd();
      expect(focusSpy).not.toHaveBeenCalled();
    });

    it('hydrates betweenRounds reorder state on open', async () => {
      const item: MemorizedItem = {
        ...verseItem,
        inProgressPractice: {
          sessionSeed: 'reorder-between',
          wrongAttempts: 0,
          correctKeystrokes: 3,
          updatedAt: Date.now(),
          phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
          practiceMode: 'reorder',
        },
      };
      const { component } = await renderSession({ item });
      expect(component.practiceMode).toBe('reorder');
      expect(component.awaitingRoundAdvance).toBe(true);
      expect(component.reorderSlotChunkIds.length).toBe(component.reorderChunks.length);
    });

    it('item change while closed does not reset done phase', async () => {
      const { component } = await renderSession();
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);
      expect(component.phase).toBe('done');

      component.isOpen = false;
      const nextItem: MemorizedItem = { ...verseItem, id: 'v3', inProgressPractice: null };
      component.item = nextItem;
      component.ngOnChanges({
        item: new SimpleChange(verseItem, nextItem, false),
      });
      expect(component.phase).toBe('done');
    });

    it('does not reload passage when parent refreshes item stats after final round', async () => {
      const { component } = await renderSession();
      await vi.waitFor(() => expect(mockScriptureService.getPassage).toHaveBeenCalled());
      const callsAfterOpen = mockScriptureService.getPassage.mock.calls.length;

      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('type');
      revealAllHiddenViaTyping(component);
      expect(component.phase).toBe('done');

      const updatedItem: MemorizedItem = {
        ...verseItem,
        lastPracticedAt: Date.now(),
        practiceSessions: [{ at: Date.now(), wrongAttempts: 0, correctKeystrokes: 5 }],
        inProgressPractice: null,
      };
      component.item = updatedItem;
      component.ngOnChanges({
        item: new SimpleChange(verseItem, updatedItem, false),
      });
      await vi.waitFor(() => expect(component.passageLoading).toBe(false));

      expect(mockScriptureService.getPassage.mock.calls.length).toBe(callsAfterOpen);
      expect(component.passageLoading).toBe(false);
      expect(component.phase).toBe('done');
    });

    it('onPassageAudioEnded handles failed repeat play', async () => {
      const { component } = await renderSession();
      vi.useFakeTimers();
      const audioEl = document.createElement('audio');
      audioEl.play = vi.fn().mockRejectedValue(new Error('play blocked'));
      audioEl.setAttribute('src', 'https://audio.test/x.mp3');
      component.passageAudioRef = { nativeElement: audioEl } as ElementRef<HTMLAudioElement>;
      component.repeatListenOn = true;
      component['repeatListenOnRef'] = true;

      component.onPassageAudioEnded();
      vi.advanceTimersByTime(MEMORIZE_LISTEN_REPEAT_GAP_MS);

      expect(component.passageAudioPlaying).toBe(false);
    });

    it('processWordGuess handles digit tokens in word mode at full-hide round', async () => {
      const { component } = await renderSession();
      component.startRoundChoice = MEMORIZATION_FULL_HIDE_ROUND;
      component.beginPracticeWithMode('word');

      while (component.currentTargetIndex !== null) {
        const token = component.tokens[component.currentTargetIndex]!;
        if (token.kind === 'digit') {
          component.processWordGuess(token.text);
          break;
        }
        component.processWordGuess('__wrong__');
        component.processWordGuess('__wrong__');
        component.processWordGuess('__wrong__');
      }
      expect(component.correctKeystrokesTotal).toBeGreaterThan(0);
    });
  });

  describe('recite mode', () => {
    async function waitForReciteSettings(
      component: MemorizationPracticeSessionComponent
    ): Promise<void> {
      await vi.waitFor(() => expect(component.reciteSettingsLoaded).toBe(true));
    }

    it('exposes recite in mode picker for enabled single-verse items', async () => {
      const { component, getByTestId, cdr } = await renderSession({ reciteEnabled: true });
      await waitForReciteSettings(component);
      expect(component.reciteModeAvailable).toBe(true);

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-recite')).toBeTruthy();
    });

    it('allows recite for multi-verse references within the verse limit', async () => {
      const { component, getByTestId, cdr } = await renderSession({
        reciteEnabled: true,
        item: { ...verseItem, reference: 'John 3:16-18' },
      });
      await waitForReciteSettings(component);
      expect(component.reciteModeVisible).toBe(true);
      expect(component.reciteModeAvailable).toBe(true);

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-recite')).toBeTruthy();

      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      expect(component.practiceMode).toBe('recite');
      expect(component.modePickerOpen).toBe(false);
    });

    it('shows inline warning when reference exceeds the verse limit', async () => {
      const { component, getByTestId, cdr } = await renderSession({
        reciteEnabled: true,
        item: { ...verseItem, reference: 'John 3:16-22' },
      });
      await waitForReciteSettings(component);
      expect(component.reciteModeVisible).toBe(true);
      expect(component.reciteModeAvailable).toBe(false);

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-recite')).toBeTruthy();

      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      expect(component.practiceMode).toBeNull();
      expect(component.modePickerOpen).toBe(true);
      expect(getByTestId('memorize-recite-blocked-message')).toBeTruthy();
      expect(getByTestId('memorize-recite-blocked-message').textContent).toContain(
        '5 verses'
      );
    });

    it('exposes recite for bible books items and can start practice', async () => {
      const bibleBooksItem: MemorizedItem = {
        id: 'bb-recite',
        reference: 'Bible Books (OT)',
        text: 'Genesis Exodus Leviticus',
        translation: 'esv',
        dateAdded: Date.now(),
        lastPracticedAt: null,
        practiceSessions: [],
        kind: 'bibleBooks',
        bibleBooksScope: 'ot',
      };
      const { component, getByTestId, cdr } = await renderSession({
        reciteEnabled: true,
        item: bibleBooksItem,
      });
      await waitForReciteSettings(component);
      expect(component.reciteModeVisible).toBe(true);
      expect(component.reciteModeAvailable).toBe(true);

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-recite')).toBeTruthy();

      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      expect(component.practiceMode).toBe('recite');
      expect(component.modePickerOpen).toBe(false);
    });

    it('enables Record when parent settings loaded before child refresh completes', async () => {
      const { component, cdr } = await renderSession({ reciteEnabled: true });
      await waitForReciteSettings(component);
      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      await vi.waitFor(() => expect(component.recitePractice).toBeTruthy());
      component.recitePractice!.settingsLoaded = false;

      expect(component.reciteSettingsLoadedForRecord).toBe(true);
    });

    it('records, transcribes, and shows alignment results', async () => {
      const { component, cdr } = await renderSession({
        reciteEnabled: true,
        reciteTranscript: 'For God so loved the world John 3 16',
      });
      await waitForReciteSettings(component);
      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      await vi.waitFor(() => expect(component.recitePractice).toBeTruthy());

      await component.startReciteRecording();
      cdr.detectChanges();
      expect(component.recitePhase).toBe('recording');
      expect(mockReciteService.startRecording).toHaveBeenCalled();

      await component.stopReciteRecording();
      cdr.detectChanges();
      expect(component.recitePhase).toBe('results');
      expect(component.reciteAlignment).not.toBeNull();
      expect(mockReciteService.stopRecordingCapture).toHaveBeenCalled();
      expect(mockReciteService.transcribeCapturedRecording).toHaveBeenCalledWith(
        expect.objectContaining({
          memorizedItemId: verseItem.id,
          prompt: expect.any(String),
          blob: expect.any(Blob),
          audioSeconds: expect.any(Number),
        })
      );
    });

    it('shows Recite feedback help and can open settings', async () => {
      const { component, cdr } = await renderSession({
        reciteEnabled: true,
        reciteTranscript: 'For God so loved the world John 3 16',
      });
      const openSettingsSpy = vi.spyOn(component.openSettings, 'emit');
      await waitForReciteSettings(component);
      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      await vi.waitFor(() => expect(component.recitePractice).toBeTruthy());
      await component.startReciteRecording();
      await component.stopReciteRecording();
      cdr.detectChanges();

      expect(screen.queryByTestId('memorize-recite-help')).toBeTruthy();
      component.openReciteFeedbackHelp();
      cdr.detectChanges();
      expect(screen.getByTestId('memorize-recite-feedback-help-dialog')).toBeTruthy();
      expect(screen.getByText(/Settings → Send Feedback/)).toBeTruthy();

      const closedSpy = vi.spyOn(component.closed, 'emit');
      await component.openSettingsForReciteFeedback();
      expect(closedSpy).toHaveBeenCalled();
      expect(openSettingsSpy).toHaveBeenCalled();
      expect(component.reciteFeedbackHelpOpen).toBe(false);
    });

    it('retry resets recite results without applying errors', async () => {
      const { component, cdr } = await renderSession({
        reciteEnabled: true,
        reciteTranscript: 'For so loved the world',
      });
      await waitForReciteSettings(component);
      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      await vi.waitFor(() => expect(component.recitePractice).toBeTruthy());
      await component.startReciteRecording();
      await component.stopReciteRecording();
      cdr.detectChanges();
      expect(component.displayPracticeErrors).toBeGreaterThan(0);

      component.onReciteRepeatRound();
      cdr.detectChanges();
      expect(component.recitePhase).toBe('ready');
      expect(component.displayPracticeErrors).toBe(0);
    });
  });
});
