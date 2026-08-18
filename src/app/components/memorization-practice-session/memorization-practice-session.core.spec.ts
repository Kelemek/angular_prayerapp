import { describe, it, expect, vi } from 'vitest';
import { MEMORIZATION_FULL_HIDE_ROUND } from '../../lib/memorization/memorizationPracticeUtils';
import { MemorizationPracticeSessionHeaderComponent } from './memorization-practice-session-header.component';

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
      component.headerPanelRef = {
        hintButtonRef: { nativeElement: btn },
      } as MemorizationPracticeSessionHeaderComponent;

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

});
