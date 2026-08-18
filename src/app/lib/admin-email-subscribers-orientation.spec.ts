import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailSubscriberOrientationTracker } from './admin-email-subscribers-orientation';

describe('EmailSubscriberOrientationTracker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers and removes window listeners', () => {
    const onLandscapeChange = vi.fn();
    const tracker = new EmailSubscriberOrientationTracker(onLandscapeChange);
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    tracker.init();
    expect(addSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    tracker.destroy();
    expect(removeSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('updates landscape from window dimensions', () => {
    const onLandscapeChange = vi.fn();
    const tracker = new EmailSubscriberOrientationTracker(onLandscapeChange);
    const widthSpy = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1600);
    const heightSpy = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);

    tracker.updateLandscape();

    expect(tracker.isLandscape).toBe(true);
    expect(onLandscapeChange).toHaveBeenCalledWith(true);

    widthSpy.mockRestore();
    heightSpy.mockRestore();
  });

  it('schedules landscape update after orientation change', () => {
    vi.useFakeTimers();
    const onLandscapeChange = vi.fn();
    const tracker = new EmailSubscriberOrientationTracker(onLandscapeChange);
    const updateSpy = vi.spyOn(tracker, 'updateLandscape');

    tracker.init();
    window.dispatchEvent(new Event('orientationchange'));
    vi.runAllTimers();

    expect(updateSpy).toHaveBeenCalled();
    tracker.destroy();
    vi.useRealTimers();
  });
});
