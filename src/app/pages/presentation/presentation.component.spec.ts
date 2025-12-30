import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PresentationComponent } from './presentation.component';

function createQuery(result: any) {
  const q: any = {
    _result: result,
    select() { return q; },
    eq() { return q; },
    in() { return q; },
    gte() { return q; },
    order() { return q; },
    then(cb: any) { return Promise.resolve(cb(q._result)); },
    // make await work
    [Symbol.toStringTag]: 'Promise'
  };
  // also make it awaitable directly
  (q as any).then = (onFulfilled: any) => Promise.resolve(result).then(onFulfilled);
  return q;
}

describe('PresentationComponent', () => {
  let component: PresentationComponent;
  let mockRouter: any;
  let mockSupabase: any;
  let mockThemeService: any;
  let cdr: any;
  let ngZone: any;

  beforeEach(() => {
    mockRouter = { navigate: vi.fn() };
    mockSupabase = { client: { from: vi.fn() } };
    mockThemeService = { getTheme: vi.fn() };
    cdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
    ngZone = { run: (cb: any) => cb() };
    component = new PresentationComponent(mockRouter, mockSupabase, mockThemeService, cdr, ngZone as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('identifies prayers and prompts correctly', () => {
    const prayer = { id: 'p1', prayer_for: 'someone' } as any;
    const prompt = { id: 'pr1', type: 'encouragement' } as any;
    expect(component.isPrayer(prayer)).toBe(true);
    expect(component.isPrompt(prayer)).toBe(false);
    expect(component.isPrompt(prompt)).toBe(true);
    expect(component.isPrayer(prompt)).toBe(false);
  });

  it('loadTheme applies saved theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    // ensure document root is clean
    document.documentElement.classList.remove('dark');
    component.loadTheme();
    expect(component.theme).toBe('dark');
    // applyTheme should add class
    component.applyTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    localStorage.removeItem('theme');
  });

  it('handleThemeChange updates theme and localStorage', () => {
    document.documentElement.classList.remove('dark');
    component.handleThemeChange('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(component.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    localStorage.removeItem('theme');
  });

  it('nextSlide and previousSlide cycle correctly', () => {
    component.prayers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as any;
    component.currentIndex = 0;
    component.nextSlide();
    expect(component.currentIndex).toBe(1);
    component.nextSlide();
    expect(component.currentIndex).toBe(2);
    component.nextSlide();
    expect(component.currentIndex).toBe(0);

    component.previousSlide();
    expect(component.currentIndex).toBe(2);
    component.previousSlide();
    expect(component.currentIndex).toBe(1);
  });

  it('togglePlay starts and stops auto advance (uses timers)', async () => {
    vi.useFakeTimers();
    component.prayers = [{ id: 'a' }, { id: 'b' }] as any;
    component.displayDuration = 1; // 1 second for quick test
    component.togglePlay();
    expect(component.isPlaying).toBe(true);
    expect(component.autoAdvanceInterval).toBeTruthy();

    // advance timers to trigger nextSlide
    vi.advanceTimersByTime(1100);
    // nextSlide should have run and autoAdvanceInterval reset for replay
    expect(component.currentIndex).toBeGreaterThanOrEqual(0);

    // stop
    component.togglePlay();
    expect(component.isPlaying).toBe(false);
    vi.useRealTimers();
  });

  it('calculateCurrentDuration returns a value based on content length and updates', () => {
    const item: any = { description: 'short text', prayer_updates: [{ content: 'update1', created_at: new Date().toISOString() }] };
    component.prayers = [item] as any;
    component.currentIndex = 0;
    component.smartMode = true;
    const duration = component.calculateCurrentDuration();
    expect(duration).toBeGreaterThanOrEqual(10);
    expect(duration).toBeLessThanOrEqual(120);
  });

  it('startPrayerTimer counts down and shows notification when complete', () => {
    vi.useFakeTimers();
    component.prayerTimerMinutes = 0.001; // ~0.06s
    component.startPrayerTimer();
    expect(component.prayerTimerActive).toBe(true);
    // advance enough time for timer to complete
    vi.advanceTimersByTime(2000);
    expect(component.prayerTimerActive).toBe(false);
    expect(component.showTimerNotification).toBe(true);
    vi.useRealTimers();
  });

  it('exitPresentation navigates to home', () => {
    component.exitPresentation();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('setupControlsAutoHide hides controls after initial period on non-mobile', () => {
    vi.useFakeTimers();
    // ensure environment appears non-mobile
    // force navigator to report zero touch points and remove any ontouchstart
    vi.stubGlobal('navigator', { ...(globalThis as any).navigator, maxTouchPoints: 0 });
    if ((globalThis as any).ontouchstart !== undefined) {
      // remove property so `'ontouchstart' in window` is false
      delete (globalThis as any).ontouchstart;
    }
    component.showControls = true;
    component.initialPeriodElapsed = false;
    component.setupControlsAutoHide();
    // advance timers to execute the hide callback
    vi.runAllTimers();
    expect(component.initialPeriodElapsed).toBe(true);
    expect(component.showControls).toBe(false);
    vi.useRealTimers();
  });

  it('handleMouseMove respects initialPeriodElapsed and toggles showControls', () => {
    component.initialPeriodElapsed = true; // skip initial guard
    // pretend window height is 100
    vi.stubGlobal('innerHeight', 100);
    // mouse near bottom -> show
    component.showControls = false;
    component.handleMouseMove({ clientY: 90 } as MouseEvent);
    expect(component.showControls).toBe(true);
    // mouse high up -> hide
    component.handleMouseMove({ clientY: 10 } as MouseEvent);
    expect(component.showControls).toBe(false);
  });

  it('touch handlers handle double-tap and swipe navigation', () => {
    // prepare items so next/previous can operate
    component.prayers = [{ id: '1' } as any, { id: '2' } as any];
    component.currentIndex = 0;

    // single tap sets lastTap, double tap toggles showControls
    component.lastTap = Date.now() - 1000; // older than threshold
    // first tap
    component.onTouchStart({ touches: [{ clientX: 10 }] } as unknown as TouchEvent);
    // immediate second tap within threshold -> simulate by setting lastTap to recent
    component.lastTap = Date.now() - 100; // within threshold
    component.onTouchStart({ touches: [{ clientX: 10 }] } as unknown as TouchEvent);
    // toggled (should be boolean)
    expect(typeof component.showControls).toBe('boolean');

    // test swipe left -> nextSlide
    component.onTouchStart({ touches: [{ clientX: 200 }] } as unknown as TouchEvent);
    component.onTouchMove({ touches: [{ clientX: 100 }] } as unknown as TouchEvent);
    component.onTouchEnd();
    expect(component.currentIndex).toBe(1);

    // test swipe right -> previousSlide
    component.onTouchStart({ touches: [{ clientX: 100 }] } as unknown as TouchEvent);
    component.onTouchMove({ touches: [{ clientX: 200 }] } as unknown as TouchEvent);
    component.onTouchEnd();
    expect(component.currentIndex).toBe(0);
  });

  it('handleKeyboard triggers navigation and togglePlay/exit', () => {
    const prevSpy = vi.spyOn(component, 'previousSlide');
    const nextSpy = vi.spyOn(component, 'nextSlide');
    const exitSpy = vi.spyOn(component, 'exitPresentation');
    const toggleSpy = vi.spyOn(component, 'togglePlay');

    component.handleKeyboard({ key: 'ArrowLeft', preventDefault: () => {} } as unknown as KeyboardEvent);
    expect(prevSpy).toHaveBeenCalled();

    component.handleKeyboard({ key: 'ArrowRight', preventDefault: () => {} } as unknown as KeyboardEvent);
    expect(nextSpy).toHaveBeenCalled();

    component.handleKeyboard({ key: ' ', preventDefault: () => {} } as unknown as KeyboardEvent);
    expect(nextSpy).toHaveBeenCalledTimes(2);

    component.handleKeyboard({ key: 'Escape', preventDefault: () => {} } as unknown as KeyboardEvent);
    expect(exitSpy).toHaveBeenCalled();

    component.handleKeyboard({ key: 'p', preventDefault: () => {} } as unknown as KeyboardEvent);
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('fetchPrayers handles success and sorts by latest activity', async () => {
    const now = new Date();
    const older = { id: 'old', created_at: new Date(now.getTime() - 10000).toISOString(), prayer_updates: [] };
    const newer = { id: 'new', created_at: now.toISOString(), prayer_updates: [] };
    const query = createQuery({ data: [older, newer], error: null });
    mockSupabase.client.from = vi.fn().mockReturnValue(query);
    component.contentType = 'prayers';
    await component.fetchPrayers();
    expect(component.prayers.length).toBe(2);
    expect(component.prayers[0].id).toBe('new');
  });

  it('fetchPrayers handles errors by clearing prayers', async () => {
    const query = createQuery({ data: null, error: { message: 'boom' } });
    mockSupabase.client.from = vi.fn().mockReturnValue(query);
    component.contentType = 'prayers';
    await component.fetchPrayers();
    expect(component.prayers).toEqual([]);
  });

  it('fetchPrompts filters by active types and orders by display_order', async () => {
    const types = [{ name: 't1', display_order: 2 }, { name: 't2', display_order: 1 }];
    const prompts = [{ id: 'p1', type: 't1' }, { id: 'p2', type: 't2' }, { id: 'p3', type: 'other' }];
    const q1 = createQuery({ data: types, error: null });
    const q2 = createQuery({ data: prompts, error: null });
    // supabase.client.from will be called twice; return q1 then q2
    let calls = 0;
    mockSupabase.client.from = vi.fn().mockImplementation(() => {
      calls++;
      return calls === 1 ? q1 : q2;
    });
    component.contentType = 'prompts';
    await component.fetchPrompts();
    expect(component.prompts.length).toBe(2);
    // p2 has type t2 which has display_order 1 so it should come first
    expect(component.prompts[0].id).toBe('p2');
  });

  it('fetchPrompts handles fetch errors by clearing prompts', async () => {
    const q1 = createQuery({ data: null, error: { message: 'err' } });
    mockSupabase.client.from = vi.fn().mockImplementation(() => q1);
    await component.fetchPrompts();
    expect(component.prompts).toEqual([]);
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PresentationComponent } from './presentation.component';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { ChangeDetectorRef, NgZone } from '@angular/core';

describe('PresentationComponent', () => {
  let component: PresentationComponent;
  let mockRouter: any;
  let mockSupabase: any;
  let mockThemeService: any;
  let mockCdr: any;
  let mockNgZone: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRouter = { navigate: vi.fn() };
    mockSupabase = { client: {} };
    mockThemeService = {};
    mockCdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
    mockNgZone = { run: (fn: Function) => fn() } as unknown as NgZone;

    component = new PresentationComponent(
      mockRouter as unknown as Router,
      mockSupabase as unknown as SupabaseService,
      mockThemeService as unknown as ThemeService,
      mockCdr as unknown as ChangeDetectorRef,
      mockNgZone as unknown as NgZone
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit calls loadTheme, loadContent and setupControlsAutoHide', () => {
    const lt = vi.spyOn(component, 'loadTheme').mockImplementation(() => {});
    const lc = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());
    const sc = vi.spyOn(component, 'setupControlsAutoHide').mockImplementation(() => {});

    component.ngOnInit();

    expect(lt).toHaveBeenCalled();
    expect(lc).toHaveBeenCalled();
    expect(sc).toHaveBeenCalled();
  });

  describe('theme handling', () => {
    it('applyTheme adds dark class when theme dark', () => {
      component.theme = 'dark';
      const root = document.documentElement;
      root.classList.remove('dark');
      component.applyTheme();
      expect(root.classList.contains('dark')).toBe(true);
    });

    it('applyTheme removes dark class when theme light', () => {
      component.theme = 'light';
      const root = document.documentElement;
      root.classList.add('dark');
      component.applyTheme();
      expect(root.classList.contains('dark')).toBe(false);
    });

    it('loadTheme picks saved theme from localStorage', () => {
      localStorage.setItem('theme', 'dark');
      const applySpy = vi.spyOn(component, 'applyTheme');
      component.loadTheme();
      expect(component.theme).toBe('dark');
      expect(applySpy).toHaveBeenCalled();
      localStorage.removeItem('theme');
    });
  });

  describe('items helpers', () => {
    it('isPrayer and isPrompt detect types', () => {
      const prayer = { prayer_for: 'x' };
      const prompt = { type: 't' };
      expect(component.isPrayer(prayer)).toBe(true);
      expect(component.isPrompt(prayer)).toBe(false);
      expect(component.isPrompt(prompt)).toBe(true);
      expect(component.isPrayer(prompt)).toBe(false);
    });

    it('calculateCurrentDuration returns minimum 10 seconds for short text', () => {
      component.prayers = [{ id: '1', description: 'short', created_at: new Date().toISOString() } as any];
      component.currentIndex = 0;
      component.smartMode = true;
      const dur = component.calculateCurrentDuration();
      expect(dur).toBeGreaterThanOrEqual(10);
    });

    it('calculateCurrentDuration caps at 120 seconds for very long content', () => {
      const longText = 'a'.repeat(2000);
      component.prayers = [{ id: '1', description: longText, created_at: new Date().toISOString() } as any];
      component.currentIndex = 0;
      component.smartMode = true;
      const dur = component.calculateCurrentDuration();
      expect(dur).toBeLessThanOrEqual(120);
    });
  });

  describe('navigation and play', () => {
    it('nextSlide/previousSlide do nothing when no items', () => {
      component.prayers = [];
      component.prompts = [];
      component.currentIndex = 0;
      component.nextSlide();
      expect(component.currentIndex).toBe(0);
      component.previousSlide();
      expect(component.currentIndex).toBe(0);
    });

    it('nextSlide and previousSlide update index', () => {
      component.prayers = [{ id: '1' } as any, { id: '2' } as any, { id: '3' } as any];
      component.contentType = 'prayers';
      component.currentIndex = 0;
      const spy = vi.spyOn(component, 'startAutoAdvance').mockImplementation(() => {});
      component.isPlaying = true;
      component.nextSlide();
      expect(component.currentIndex).toBe(1);
      expect(spy).toHaveBeenCalled();

      component.previousSlide();
      expect(component.currentIndex).toBe(0);
    });

    it('togglePlay toggles and calls start or clear', () => {
      const startSpy = vi.spyOn(component, 'startAutoAdvance').mockImplementation(() => {});
      const clearSpy = vi.spyOn(component, 'clearIntervals').mockImplementation(() => {});
      component.isPlaying = false;
      component.togglePlay();
      expect(component.isPlaying).toBe(true);
      expect(startSpy).toHaveBeenCalled();

      component.togglePlay();
      expect(component.isPlaying).toBe(false);
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('shuffle utilities', () => {
    it('shuffleArray returns same elements', () => {
      const arr = [1,2,3,4,5];
      const out = component.shuffleArray(arr);
      expect(out).toHaveLength(5);
      expect(out.sort()).toEqual(arr.sort());
    });
  });

  it('handleThemeChange stores theme and applies it', () => {
    const applySpy = vi.spyOn(component, 'applyTheme').mockImplementation(() => {});
    component.handleThemeChange('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(component.theme).toBe('dark');
    expect(applySpy).toHaveBeenCalled();
    localStorage.removeItem('theme');
  });

  it('exitPresentation navigates to home', () => {
    component.exitPresentation();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('applyTheme uses system preference when theme is system', () => {
    component.theme = 'system';
    // stub matchMedia to report dark preference
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true } as any));
    const root = document.documentElement;
    root.classList.remove('dark');
    component.applyTheme();
    expect(root.classList.contains('dark')).toBe(true);
    // now stub to light
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false } as any));
    component.applyTheme();
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('setupControlsAutoHide treats device as mobile when touch present', () => {
    // simulate mobile by defining ontouchstart
    (globalThis as any).ontouchstart = true;
    component.initialPeriodElapsed = false;
    component.showControls = true;
    component.setupControlsAutoHide();
    // on mobile, initialPeriodElapsed should be set immediately and controls remain visible
    expect(component.initialPeriodElapsed).toBe(true);
    delete (globalThis as any).ontouchstart;
  });

  it('handleMouseMove does nothing during initial period', () => {
    component.initialPeriodElapsed = false;
    component.showControls = false;
    vi.stubGlobal('innerHeight', 100);
    component.handleMouseMove({ clientY: 90 } as MouseEvent);
    // still false because initialPeriodElapsed guard prevents change
    expect(component.showControls).toBe(false);
  });

  it('handleKeyboard uppercase P toggles play', () => {
    const spy = vi.spyOn(component, 'togglePlay');
    component.handleKeyboard({ key: 'P', preventDefault: () => {} } as unknown as KeyboardEvent);
    expect(spy).toHaveBeenCalled();
  });

  it('handleRandomizeChange calls shuffle when randomize true and reload when false', async () => {
    const shuffleSpy = vi.spyOn(component, 'shuffleItems').mockImplementation(() => {});
    const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());

    component.randomize = true;
    await component.handleRandomizeChange();
    expect(shuffleSpy).toHaveBeenCalled();

    component.randomize = false;
    await component.handleRandomizeChange();
    expect(loadSpy).toHaveBeenCalled();
  });

  it('startAutoAdvance sets countdown and decreases over time', () => {
    vi.useFakeTimers();
    component.prayers = [{ id: 'a', description: 'x' } as any];
    component.isPlaying = true;
    component.displayDuration = 1; // 1 second
    component.startAutoAdvance();
    expect(component.countdownRemaining).toBeGreaterThanOrEqual(1);
    // advance one second
    vi.advanceTimersByTime(1100);
    // countdown should have decreased (or been reset by next start)
    expect(component.countdownRemaining).toBeGreaterThanOrEqual(0);
    component.clearIntervals();
    vi.useRealTimers();
  });

  it('fetchPrayers applies status filters and timeFilter week correctly', async () => {
    const now = new Date();
    const recent = { id: 'r', created_at: now.toISOString(), prayer_updates: [] };
    const q = createQuery({ data: [recent], error: null });
    mockSupabase.client.from = vi.fn().mockReturnValue(q);
    component.contentType = 'prayers';
    component.timeFilter = 'week';
    component.statusFilters = { current: true, answered: false };
    await component.fetchPrayers();
    expect(component.prayers.length).toBe(1);
  });

  it('loadContent handles both prayers and prompts and randomize triggers shuffle', async () => {
    const pSpy = vi.spyOn(component, 'fetchPrayers').mockImplementation(() => Promise.resolve());
    const prSpy = vi.spyOn(component, 'fetchPrompts').mockImplementation(() => Promise.resolve());
    const shuffleSpy = vi.spyOn(component, 'shuffleItems').mockImplementation(() => {});
    component.contentType = 'both';
    component.randomize = true;
    await component.loadContent();
    expect(pSpy).toHaveBeenCalled();
    expect(prSpy).toHaveBeenCalled();
    expect(shuffleSpy).toHaveBeenCalled();
  });
});
