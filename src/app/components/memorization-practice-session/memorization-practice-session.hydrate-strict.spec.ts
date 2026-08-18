import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screen } from '@testing-library/angular';
import { ElementRef, SimpleChange } from '@angular/core';
import { MemorizationPracticeSessionHeaderComponent } from './memorization-practice-session-header.component';
import { MEMORIZATION_FULL_HIDE_ROUND } from '../../lib/memorization/memorizationPracticeUtils';
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
  componentDir,
} from './memorization-practice-session.spec-setup';

registerPracticeSessionSpecHooks();

describe('MemorizationPracticeSessionComponent', () => {
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
        join(componentDir, 'memorization-practice-session.component.css'),
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

});
