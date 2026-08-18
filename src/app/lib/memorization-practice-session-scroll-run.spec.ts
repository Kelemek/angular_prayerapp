import { describe, it, expect, vi } from 'vitest';
import * as scrollRun from './memorization-practice-session-scroll-run';
import {
  registerPracticeSessionSpecHooks,
  renderSession,
} from '../components/memorization-practice-session/memorization-practice-session.spec-setup';

registerPracticeSessionSpecHooks();

describe('memorization-practice-session-scroll-run', () => {
  describe('MemorizationPracticeSessionComponent scroll integration', () => {
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
        '[data-memorize-current-blank="true"]',
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
  });
});
