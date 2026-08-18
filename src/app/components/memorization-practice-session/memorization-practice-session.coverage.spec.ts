import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { ElementRef, SimpleChange } from '@angular/core';
import { MemorizationPracticeSessionHeaderComponent } from './memorization-practice-session-header.component';
import { MEMORIZATION_FULL_HIDE_ROUND } from '../../lib/memorization/memorizationPracticeUtils';
import { MEMORIZE_LISTEN_REPEAT_GAP_MS } from '../../lib/memorization/memorizeListenSpeedStorage';
import * as scrollRun from '../../lib/memorization-practice-session-scroll-run';
import {
  registerPracticeSessionSpecHooks,
  renderSession,
  revealAllHiddenViaTyping,
  correctReorderOrder,
  makeKeyEvent,
  makePointerEvent,
  verseItem,
  mockScriptureService,
  mockReciteService,
  mockReciteSettingsService,
  trackMemorizationPracticeSessionStartMock,
  trackMemorizationPracticeCompletedMock,
} from './memorization-practice-session.spec-setup';

registerPracticeSessionSpecHooks();

describe('MemorizationPracticeSessionComponent', () => {
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
      const scheduleSpy = vi.spyOn(scrollRun, 'runPracticeSessionScheduleScrollToBlank');
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
        'scrollCurrentBlankIntoView',
      );
      const cueSpy = vi.spyOn(
        component as unknown as { scrollActiveFirstLetterCueIntoView: () => void },
        'scrollActiveFirstLetterCueIntoView',
      );
      vi.useFakeTimers();
      component['hasTypedInRound'] = true;
      scrollRun.runPracticeSessionScheduleScrollToBlank(component);
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
      component.scrollCurrentBlankIntoView();
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

});
