import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NgZone } from '@angular/core';
import {
  PresentationPlaybackController,
  type PresentationPlaybackHost,
} from './presentation-playback.controller';
import type { PresentationSlideItem } from './presentation-catalog.store';

function createHost(
  overrides: Partial<{
    currentIndex: number;
    loop: boolean;
    smartMode: boolean;
    displayDuration: number;
    items: PresentationSlideItem[];
    showSettings: boolean;
    showTimerNotification: boolean;
  }> = {}
): PresentationPlaybackHost & {
  currentIndex: number;
  loop: boolean;
  smartMode: boolean;
  displayDuration: number;
  showSettings: boolean;
  showTimerNotification: boolean;
  items: PresentationSlideItem[];
  markForCheckCalls: number;
  detectChangesCalls: number;
} {
  const state = {
    currentIndex: overrides.currentIndex ?? 0,
    loop: overrides.loop ?? true,
    smartMode: overrides.smartMode ?? false,
    displayDuration: overrides.displayDuration ?? 10,
    showSettings: overrides.showSettings ?? false,
    showTimerNotification: overrides.showTimerNotification ?? false,
    items: overrides.items ?? [{ id: '1' } as PresentationSlideItem],
    markForCheckCalls: 0,
    detectChangesCalls: 0,
  };

  return {
    get currentIndex() {
      return state.currentIndex;
    },
    set currentIndex(value: number) {
      state.currentIndex = value;
    },
    get loop() {
      return state.loop;
    },
    set loop(value: boolean) {
      state.loop = value;
    },
    get smartMode() {
      return state.smartMode;
    },
    set smartMode(value: boolean) {
      state.smartMode = value;
    },
    get displayDuration() {
      return state.displayDuration;
    },
    set displayDuration(value: number) {
      state.displayDuration = value;
    },
    get showSettings() {
      return state.showSettings;
    },
    set showSettings(value: boolean) {
      state.showSettings = value;
    },
    get showTimerNotification() {
      return state.showTimerNotification;
    },
    set showTimerNotification(value: boolean) {
      state.showTimerNotification = value;
    },
    get items() {
      return state.items;
    },
    set items(value: PresentationSlideItem[]) {
      state.items = value;
    },
    get markForCheckCalls() {
      return state.markForCheckCalls;
    },
    get detectChangesCalls() {
      return state.detectChangesCalls;
    },
    getSlideCount: () => state.items.length,
    getCurrentItem: () => state.items[state.currentIndex],
    isPrayerItem: (item): item is PresentationSlideItem & { description: string } =>
      'description' in item,
    getScrollRoot: () => null,
    markForCheck: () => {
      state.markForCheckCalls++;
    },
    detectChanges: () => {
      state.detectChangesCalls++;
    },
  };
}

const threeSlides = (): PresentationSlideItem[] => [
  { id: 'a' } as PresentationSlideItem,
  { id: 'b' } as PresentationSlideItem,
  { id: 'c' } as PresentationSlideItem,
];

describe('PresentationPlaybackController', () => {
  let controller: PresentationPlaybackController;
  let mockNgZone: NgZone;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNgZone = { run: (fn: () => void) => fn() } as unknown as NgZone;
    controller = new PresentationPlaybackController(mockNgZone);
  });

  it('throws when host is not bound', () => {
    expect(() => controller.togglePlay()).toThrow(/host is not bound/);
  });

  describe('calculateCurrentDuration', () => {
    it('returns minimum 10 seconds for short prayer text', () => {
      const host = createHost({
        smartMode: true,
        items: [
          { id: '1', description: 'short', created_at: new Date().toISOString() } as any,
        ],
      });
      controller.bindHost(host);
      expect(controller.calculateCurrentDuration()).toBeGreaterThanOrEqual(10);
    });

    it('caps at 120 seconds for very long content', () => {
      const host = createHost({
        smartMode: true,
        items: [{ id: '1', description: 'a'.repeat(2000), created_at: '' } as any],
      });
      controller.bindHost(host);
      expect(controller.calculateCurrentDuration()).toBeLessThanOrEqual(120);
    });

    it('uses displayDuration when smartMode is off', () => {
      const host = createHost({ smartMode: false, displayDuration: 25 });
      controller.bindHost(host);
      expect(controller.calculateCurrentDuration()).toBe(25);
    });

    it('returns displayDuration when currentItem is undefined', () => {
      const host = createHost({ smartMode: true, displayDuration: 5, items: [] });
      controller.bindHost(host);
      expect(controller.calculateCurrentDuration()).toBe(5);
    });

    it('calculates duration for prayer based on description length', () => {
      const host = createHost({
        smartMode: true,
        displayDuration: 5,
        items: [{ id: 'p1', description: 'x'.repeat(120), updates: [] } as any],
      });
      controller.bindHost(host);
      const duration = controller.calculateCurrentDuration();
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('calculates duration for prayer with updates', () => {
      const host = createHost({
        smartMode: true,
        displayDuration: 5,
        items: [
          {
            id: 'p1',
            description: 'x'.repeat(60),
            updates: [
              {
                id: 'u2',
                content: 'y'.repeat(50),
                created_at: '2024-01-14T10:30:00Z',
                denial_reason: null,
                approval_status: 'approved',
              },
            ],
          } as any,
        ],
      });
      controller.bindHost(host);
      const duration = controller.calculateCurrentDuration();
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('calculates duration for prompt', () => {
      const host = createHost({
        smartMode: true,
        displayDuration: 5,
        items: [{ id: 'pr1', description: 'x'.repeat(100), type: 'encouragement' } as any],
      });
      controller.bindHost(host);
      const duration = controller.calculateCurrentDuration();
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('handles prayer with no updates property', () => {
      const host = createHost({
        smartMode: true,
        displayDuration: 5,
        items: [{ id: 'p1', description: 'x'.repeat(60) } as any],
      });
      controller.bindHost(host);
      const duration = controller.calculateCurrentDuration();
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('includes multiple recent updates', () => {
      const now = new Date();
      const host = createHost({
        smartMode: true,
        displayDuration: 5,
        items: [
          {
            id: 'p1',
            description: 'x'.repeat(60),
            updates: [
              { id: 'u1', content: 'y'.repeat(100), created_at: now.toISOString() },
              {
                id: 'u2',
                content: 'y'.repeat(100),
                created_at: new Date(now.getTime() - 1000).toISOString(),
              },
              {
                id: 'u3',
                content: 'y'.repeat(100),
                created_at: new Date(now.getTime() - 2000).toISOString(),
              },
              {
                id: 'u4',
                content: 'y'.repeat(100),
                created_at: new Date(now.getTime() - 3000).toISOString(),
              },
            ],
          } as any,
        ],
      });
      controller.bindHost(host);
      const duration = controller.calculateCurrentDuration();
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('handles prayer with empty updates', () => {
      const host = createHost({
        smartMode: true,
        displayDuration: 5,
        items: [{ id: 'p1', description: 'x'.repeat(60), updates: [] } as any],
      });
      controller.bindHost(host);
      expect(controller.calculateCurrentDuration()).toBeGreaterThanOrEqual(10);
    });

    it('handles prayer with no description', () => {
      const host = createHost({
        smartMode: true,
        displayDuration: 5,
        items: [{ id: 'p1', updates: [] } as any],
      });
      controller.bindHost(host);
      expect(controller.calculateCurrentDuration()).toBeGreaterThanOrEqual(10);
    });

    it('handles prompt with no description', () => {
      const host = createHost({
        smartMode: true,
        displayDuration: 5,
        items: [{ id: 'pr1', type: 'encouragement' } as any],
      });
      controller.bindHost(host);
      expect(controller.calculateCurrentDuration()).toBeGreaterThanOrEqual(10);
    });

    it('returns a value based on content length and updates', () => {
      const host = createHost({
        smartMode: true,
        items: [
          {
            description: 'short text',
            updates: [{ content: 'update1', created_at: new Date().toISOString() }],
          } as any,
        ],
      });
      controller.bindHost(host);
      const duration = controller.calculateCurrentDuration();
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });
  });

  describe('navigation', () => {
    it('nextSlide and previousSlide do nothing when there are no slides', () => {
      const host = createHost({ items: [] });
      controller.bindHost(host);
      controller.nextSlide();
      expect(host.currentIndex).toBe(0);
      controller.previousSlide();
      expect(host.currentIndex).toBe(0);
    });

    it('nextSlide and previousSlide update index', () => {
      const host = createHost({ items: threeSlides() });
      controller.bindHost(host);
      controller.nextSlide();
      expect(host.currentIndex).toBe(1);
      controller.previousSlide();
      expect(host.currentIndex).toBe(0);
    });

    it('previousSlide wraps to end when at index 0', () => {
      const host = createHost({ items: threeSlides(), currentIndex: 0 });
      controller.bindHost(host);
      controller.isPlaying = false;
      controller.previousSlide();
      expect(host.currentIndex).toBe(2);
    });

    it('nextSlide and previousSlide call markForCheck', () => {
      const host = createHost({ items: threeSlides() });
      controller.bindHost(host);
      controller.nextSlide();
      expect(host.markForCheckCalls).toBeGreaterThan(0);
      controller.previousSlide();
      expect(host.markForCheckCalls).toBeGreaterThan(1);
    });
  });

  describe('togglePlay and auto-advance', () => {
    it('togglePlay starts and clears auto-advance', () => {
      const host = createHost({
        items: [{ id: 'a' } as PresentationSlideItem],
      });
      controller.bindHost(host);
      const startSpy = vi.spyOn(controller, 'startAutoAdvance').mockImplementation(() => {});
      const clearSpy = vi.spyOn(controller, 'clearIntervals').mockImplementation(() => {});

      controller.togglePlay();
      expect(controller.isPlaying).toBe(true);
      expect(startSpy).toHaveBeenCalled();

      controller.togglePlay();
      expect(controller.isPlaying).toBe(false);
      expect(clearSpy).toHaveBeenCalled();
    });

    it('togglePlay starts and stops auto advance with timers', () => {
      vi.useFakeTimers();
      const host = createHost({
        items: [{ id: 'a' }, { id: 'b' }] as PresentationSlideItem[],
        displayDuration: 1,
      });
      controller.bindHost(host);
      controller.togglePlay();
      expect(controller.isPlaying).toBe(true);
      expect(controller.autoAdvanceInterval).toBeTruthy();

      vi.advanceTimersByTime(1100);
      expect(host.currentIndex).toBeGreaterThanOrEqual(0);

      controller.togglePlay();
      expect(controller.isPlaying).toBe(false);
      vi.useRealTimers();
    });

    it('startAutoAdvance sets countdown and decreases over time', () => {
      vi.useFakeTimers();
      const host = createHost({
        items: [{ id: 'a' } as PresentationSlideItem],
        displayDuration: 2,
      });
      controller.bindHost(host);
      controller.isPlaying = true;
      controller.startAutoAdvance();
      expect(controller.countdownRemaining).toBe(2);
      vi.advanceTimersByTime(1000);
      expect(controller.countdownRemaining).toBe(1);
      vi.useRealTimers();
    });

    it('startAutoAdvance calls nextSlide and restarts when isPlaying is true', () => {
      vi.useFakeTimers();
      const host = createHost({
        items: [{ id: 'a' }, { id: 'b' }] as PresentationSlideItem[],
        displayDuration: 0.001,
      });
      controller.bindHost(host);
      controller.isPlaying = true;
      controller.startAutoAdvance();
      vi.advanceTimersByTime(2 + 400);
      expect(host.currentIndex).toBeGreaterThanOrEqual(0);
      vi.useRealTimers();
    });

    it('startAutoAdvance does not restart when isPlaying is false', () => {
      vi.useFakeTimers();
      const host = createHost({
        items: [{ id: 'a' }, { id: 'b' }] as PresentationSlideItem[],
        displayDuration: 0.001,
      });
      controller.bindHost(host);
      controller.isPlaying = false;
      controller.startAutoAdvance();
      vi.advanceTimersByTime(2);
      expect(host.currentIndex).toBeGreaterThanOrEqual(0);
      vi.useRealTimers();
    });

    it('startAutoAdvance unsubscribes existing countdownSubscription before creating new one', () => {
      vi.useFakeTimers();
      const host = createHost({
        items: [{ id: 'a' } as PresentationSlideItem],
        displayDuration: 1,
      });
      controller.bindHost(host);
      const oldUnsubscribeSpy = vi.fn();
      controller.countdownSubscription = { unsubscribe: oldUnsubscribeSpy } as any;
      controller.startAutoAdvance();
      expect(oldUnsubscribeSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('clearIntervals', () => {
    it('unsubscribes countdown and clears timers', () => {
      const host = createHost();
      controller.bindHost(host);
      controller.startAutoAdvance();
      expect(controller.countdownSubscription).toBeTruthy();

      controller.clearIntervals();

      expect(controller.autoAdvanceInterval).toBeNull();
      expect(controller.countdownSubscription).toBeNull();
      expect(controller.slideCardFaded).toBe(false);
    });

    it('unsubscribes from countdownSubscription', () => {
      const host = createHost();
      controller.bindHost(host);
      const unsubscribeSpy = vi.fn();
      controller.autoAdvanceInterval = null;
      controller.countdownSubscription = { unsubscribe: unsubscribeSpy } as any;
      controller.clearIntervals();
      expect(unsubscribeSpy).toHaveBeenCalled();
      expect(controller.countdownSubscription).toBeNull();
    });

    it('sets autoAdvanceInterval to null', () => {
      const host = createHost();
      controller.bindHost(host);
      controller.autoAdvanceInterval = setTimeout(() => {}, 1000);
      controller.countdownSubscription = null;
      controller.clearIntervals();
      expect(controller.autoAdvanceInterval).toBeNull();
    });

    it('cancels play mode scroll animation', () => {
      const host = createHost();
      controller.bindHost(host);
      controller.playScrollRafId = 42;
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      controller.clearIntervals();
      expect(cancelSpy).toHaveBeenCalledWith(42);
      expect(controller.playScrollRafId).toBeNull();
    });
  });

  describe('loop setting', () => {
    let host: ReturnType<typeof createHost>;

    beforeEach(() => {
      host = createHost({
        smartMode: false,
        displayDuration: 1,
        items: threeSlides(),
      });
      controller.bindHost(host);
    });

    it('nextSlide wraps when loop is on', () => {
      host.loop = true;
      host.currentIndex = 2;
      controller.nextSlide();
      expect(host.currentIndex).toBe(0);
    });

    it('nextSlide shows completion when loop is off on last slide', () => {
      host.loop = false;
      host.currentIndex = 2;
      controller.isPlaying = false;
      controller.nextSlide();
      expect(host.currentIndex).toBe(2);
      expect(controller.showPresentationCompleteNotification).toBe(true);
      expect(controller.isPlaying).toBe(false);
    });

    it('nextSlide shows completion when loop is off on last slide while playing', () => {
      vi.useFakeTimers();
      host.loop = false;
      host.currentIndex = 2;
      controller.isPlaying = true;
      controller.nextSlide();
      expect(host.currentIndex).toBe(2);
      expect(controller.slideCardFaded).toBe(true);
      vi.advanceTimersByTime(400);
      expect(controller.showPresentationCompleteNotification).toBe(true);
      expect(controller.isPlaying).toBe(false);
      vi.useRealTimers();
    });

    it('previousSlide does not wrap when loop is off at first slide', () => {
      host.loop = false;
      host.currentIndex = 0;
      controller.previousSlide();
      expect(host.currentIndex).toBe(0);
    });

    it('togglePlay resets to first slide when loop is off', () => {
      host.loop = false;
      host.currentIndex = 2;
      controller.togglePlay();
      expect(host.currentIndex).toBe(0);
      expect(controller.isPlaying).toBe(true);
      controller.togglePlay();
    });

    it('togglePlay resumes from current slide when loop is off after pause', () => {
      vi.useFakeTimers();
      host.loop = false;
      host.currentIndex = 2;
      controller.togglePlay();
      expect(host.currentIndex).toBe(0);

      host.currentIndex = 2;
      controller.togglePlay();
      expect(controller.isPlaying).toBe(false);

      controller.togglePlay();
      expect(host.currentIndex).toBe(2);
      expect(controller.isPlaying).toBe(true);

      controller.togglePlay();
      vi.useRealTimers();
    });

    it('auto-play with loop off completes after one full pass', () => {
      vi.useFakeTimers();
      host.loop = false;
      host.currentIndex = 0;
      controller.isPlaying = true;
      controller.startAutoAdvance();

      const slideStepMs = 1000 + 400;

      vi.advanceTimersByTime(slideStepMs);
      expect(host.currentIndex).toBe(1);
      expect(controller.isPlaying).toBe(true);

      vi.advanceTimersByTime(slideStepMs);
      expect(host.currentIndex).toBe(2);
      expect(controller.isPlaying).toBe(true);

      vi.advanceTimersByTime(slideStepMs);
      expect(host.currentIndex).toBe(2);
      expect(controller.isPlaying).toBe(false);
      expect(controller.showPresentationCompleteNotification).toBe(true);

      vi.useRealTimers();
    });

    it('with loop off, reaching the end shows completion overlay', () => {
      vi.useFakeTimers();
      const twoItemHost = createHost({
        loop: false,
        currentIndex: 1,
        items: [
          { id: '1' } as PresentationSlideItem,
          { id: '2' } as PresentationSlideItem,
        ],
      });
      controller.bindHost(twoItemHost);
      controller.isPlaying = true;
      controller.nextSlide();
      vi.advanceTimersByTime(400);
      expect(controller.showPresentationCompleteNotification).toBe(true);
      expect(controller.isPlaying).toBe(false);
      vi.useRealTimers();
    });

    it('dismissPresentationComplete resets to first slide without starting playback', () => {
      vi.useFakeTimers();
      host.loop = false;
      controller.showPresentationCompleteNotification = true;
      host.currentIndex = 2;
      controller.isPlaying = false;

      controller.dismissPresentationComplete();

      expect(controller.showPresentationCompleteNotification).toBe(false);
      expect(host.currentIndex).toBe(0);
      expect(controller.isPlaying).toBe(false);
      expect(controller.autoAdvanceInterval).toBeFalsy();

      vi.useRealTimers();
    });

    it('dismissPresentationComplete with startPlayback restarts auto-advance from first slide', () => {
      vi.useFakeTimers();
      host.loop = false;
      controller.showPresentationCompleteNotification = true;
      host.currentIndex = 2;
      controller.isPlaying = false;

      controller.dismissPresentationComplete(true);

      expect(controller.showPresentationCompleteNotification).toBe(false);
      expect(host.currentIndex).toBe(0);
      expect(controller.isPlaying).toBe(true);
      expect(controller.autoAdvanceInterval).toBeTruthy();

      controller.togglePlay();
      vi.useRealTimers();
    });

    it('dismissPresentationComplete closes overlays and resets to first slide paused', () => {
      const dismissHost = createHost({
        loop: false,
        currentIndex: 2,
        showSettings: true,
        showTimerNotification: true,
        items: threeSlides(),
      });
      controller.bindHost(dismissHost);
      controller.showPresentationCompleteNotification = true;

      controller.dismissPresentationComplete(false);

      expect(controller.showPresentationCompleteNotification).toBe(false);
      expect(dismissHost.showSettings).toBe(false);
      expect(dismissHost.showTimerNotification).toBe(false);
      expect(dismissHost.currentIndex).toBe(0);
      expect(controller.isPlaying).toBe(false);
    });

    it('dismissPresentationComplete closes settings modal before resetting', () => {
      controller.showPresentationCompleteNotification = true;
      host.showSettings = true;

      controller.dismissPresentationComplete();

      expect(host.showSettings).toBe(false);
      expect(controller.isPlaying).toBe(false);
    });

    it('dismissPresentationComplete closes timer notification without starting playback', () => {
      controller.showPresentationCompleteNotification = true;
      host.showTimerNotification = true;
      host.items = [{ id: 'a' } as PresentationSlideItem];

      controller.dismissPresentationComplete();

      expect(host.showTimerNotification).toBe(false);
      expect(controller.isPlaying).toBe(false);
    });

    it('togglePlay while completion overlay is open dismisses overlay instead of playing behind it', () => {
      vi.useFakeTimers();
      host.loop = false;
      controller.showPresentationCompleteNotification = true;
      host.currentIndex = 2;
      controller.isPlaying = false;

      controller.togglePlay();

      expect(controller.showPresentationCompleteNotification).toBe(false);
      expect(host.currentIndex).toBe(0);
      expect(controller.isPlaying).toBe(true);

      controller.togglePlay();
      vi.useRealTimers();
    });

    it('nextSlide and previousSlide are blocked while completion overlay is open', () => {
      controller.showPresentationCompleteNotification = true;
      host.currentIndex = 1;

      controller.nextSlide();
      expect(host.currentIndex).toBe(1);

      controller.previousSlide();
      expect(host.currentIndex).toBe(1);
    });

    it('togglePlay with loop off and no items does not show completion overlay', () => {
      vi.useFakeTimers();
      host.loop = false;
      host.items = [];

      controller.togglePlay();

      expect(controller.isPlaying).toBe(false);
      expect(controller.showPresentationCompleteNotification).toBe(false);

      vi.advanceTimersByTime(5000);
      expect(controller.showPresentationCompleteNotification).toBe(false);
      vi.useRealTimers();
    });

    it('dismissPresentationComplete with no items does not restart playback', () => {
      host.items = [];
      controller.showPresentationCompleteNotification = true;
      host.showSettings = true;

      controller.dismissPresentationComplete();

      expect(controller.showPresentationCompleteNotification).toBe(false);
      expect(host.showSettings).toBe(false);
      expect(controller.isPlaying).toBe(false);
    });
  });
});
