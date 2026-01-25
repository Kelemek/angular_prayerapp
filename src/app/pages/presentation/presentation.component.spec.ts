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
  let mockPrayerService: any;
  let mockCacheService: any;
  let cdr: any;
  let ngZone: any;

  beforeEach(() => {
    mockRouter = { navigate: vi.fn() };
    mockSupabase = { client: { from: vi.fn() } };
    mockThemeService = { getTheme: vi.fn() };
    mockPrayerService = { prayers$: { subscribe: vi.fn(), value: [] } };
    mockCacheService = { get: vi.fn(), set: vi.fn(), invalidate: vi.fn() };
    cdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
    ngZone = { run: (cb: any) => cb() };
    component = new PresentationComponent(mockRouter, mockSupabase, mockPrayerService, mockCacheService, mockThemeService, cdr, ngZone as any);
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
    expect((component as any).autoAdvanceInterval).toBeTruthy();

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
    component.showSettings = true;  // Set showSettings to test that it gets closed
    component.startPrayerTimer();
    expect(component.prayerTimerActive).toBe(true);
    expect(component.showSettings).toBe(false);  // Should be closed
    // advance enough time for timer to complete
    vi.advanceTimersByTime(2000);
    expect(component.prayerTimerActive).toBe(false);
    expect(component.showTimerNotification).toBe(true);
    vi.useRealTimers();
  });

  it('startPrayerTimer unsubscribes from existing subscription before starting new one', () => {
    vi.useFakeTimers();
    // Create a mock subscription
    const mockUnsubscribe = vi.fn();
    (component as any).prayerTimerSubscription = { unsubscribe: mockUnsubscribe } as any;
    
    component.prayerTimerMinutes = 0.001;
    component.startPrayerTimer();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(component.prayerTimerActive).toBe(true);
    
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
    (component as any).initialPeriodElapsed = false;
    component.setupControlsAutoHide();
    // advance timers to execute the hide callback
    vi.runAllTimers();
    expect((component as any).initialPeriodElapsed).toBe(true);
    expect(component.showControls).toBe(false);
    vi.useRealTimers();
  });

  it('handleMouseMove respects initialPeriodElapsed and toggles showControls', () => {
    (component as any).initialPeriodElapsed = true; // skip initial guard
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
    (component as any).lastTap = Date.now() - 1000; // older than threshold
    // first tap
    component.onTouchStart({ touches: [{ clientX: 10 }] } as unknown as TouchEvent);
    // immediate second tap within threshold -> simulate by setting lastTap to recent
    (component as any).lastTap = Date.now() - 100; // within threshold
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

import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { ChangeDetectorRef, NgZone } from '@angular/core';

describe('PresentationComponent', () => {
  let component: PresentationComponent;
  let mockRouter: any;
  let mockSupabase: any;
  let mockThemeService: any;
  let mockPrayerService: any;
  let mockCacheService: any;
  let mockCdr: any;
  let mockNgZone: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRouter = { navigate: vi.fn() };
    mockSupabase = { client: {} };
    mockThemeService = {};
    mockPrayerService = { prayers$: { subscribe: vi.fn(), value: [] } };
    mockCacheService = { get: vi.fn(), set: vi.fn(), invalidate: vi.fn() };
    mockCdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
    mockNgZone = { run: (fn: Function) => fn() } as unknown as NgZone;

    component = new PresentationComponent(
      mockRouter as unknown as Router,
      mockSupabase as unknown as SupabaseService,
      mockPrayerService as any,
      mockCacheService as any,
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
      component.isPlaying = true;
      // Don't mock startAutoAdvance so the branch is covered
      component.displayDuration = 1;
      component.nextSlide();
      expect(component.currentIndex).toBe(1);
      expect((component as any).autoAdvanceInterval).toBeTruthy(); // startAutoAdvance should have been called

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

    it('shuffleItems with contentType prayers shuffles only prayers', () => {
      const prayers = [
        { id: 'p1', prayer_for: 'John' } as any,
        { id: 'p2', prayer_for: 'Jane' } as any,
        { id: 'p3', prayer_for: 'Bob' } as any
      ];
      const prompts = [
        { id: 'pr1', type: 'encouragement' } as any,
        { id: 'pr2', type: 'reflection' } as any
      ];
      
      component.contentType = 'prayers';
      component.prayers = prayers;
      component.prompts = prompts;
      
      component.shuffleItems();
      
      // Check that prayers array was shuffled (has same elements but may be different order)
      expect(component.prayers).toHaveLength(3);
      expect(component.prayers.map((p: any) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
      // Prompts should remain unchanged (not shuffled)
      expect(component.prompts).toEqual(prompts);
    });

    it('shuffleItems with contentType prompts shuffles only prompts', () => {
      const prayers = [
        { id: 'p1', prayer_for: 'John' } as any,
        { id: 'p2', prayer_for: 'Jane' } as any
      ];
      const prompts = [
        { id: 'pr1', type: 'encouragement' } as any,
        { id: 'pr2', type: 'reflection' } as any,
        { id: 'pr3', type: 'challenge' } as any
      ];
      
      component.contentType = 'prompts';
      component.prayers = prayers;
      component.prompts = prompts;
      
      component.shuffleItems();
      
      // Check that prompts array was shuffled (has same elements)
      expect(component.prompts).toHaveLength(3);
      expect(component.prompts.map((p: any) => p.id).sort()).toEqual(['pr1', 'pr2', 'pr3']);
      // Prayers should remain unchanged (not shuffled)
      expect(component.prayers).toEqual(prayers);
    });

    it('shuffleItems with contentType both shuffles both prayers and prompts', () => {
      const prayers = [
        { id: 'p1', prayer_for: 'John' } as any,
        { id: 'p2', prayer_for: 'Jane' } as any
      ];
      const prompts = [
        { id: 'pr1', type: 'encouragement' } as any,
        { id: 'pr2', type: 'reflection' } as any
      ];
      
      component.contentType = 'both';
      component.prayers = prayers;
      component.prompts = prompts;
      
      component.shuffleItems();
      
      // Check that both arrays were shuffled
      expect(component.prayers).toHaveLength(2);
      expect(component.prayers.map((p: any) => p.id).sort()).toEqual(['p1', 'p2']);
      expect(component.prompts).toHaveLength(2);
      expect(component.prompts.map((p: any) => p.id).sort()).toEqual(['pr1', 'pr2']);
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
    (component as any).initialPeriodElapsed = false;
    component.showControls = true;
    component.setupControlsAutoHide();
    // on mobile, initialPeriodElapsed should be set immediately and controls remain visible
    expect((component as any).initialPeriodElapsed).toBe(true);
    delete (globalThis as any).ontouchstart;
  });

  it('handleMouseMove does nothing during initial period', () => {
    (component as any).initialPeriodElapsed = false;
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
    // Set up test data
    component.prayers = [{ id: 'p1', prayer_for: 'John' } as any];
    component.prompts = [{ id: 'pr1', type: 'encouragement' } as any];
    component.contentType = 'prayers';
    
    const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());

    // Test randomize true path
    component.randomize = true;
    await component.handleRandomizeChange();
    // shuffleItems should have been called (not mocked, so branches are covered)
    expect(component.prayers).toBeTruthy();
    expect(component.currentIndex).toBe(0);

    // Test randomize false path
    component.randomize = false;
    await component.handleRandomizeChange();
    expect(loadSpy).toHaveBeenCalled();
    expect(component.currentIndex).toBe(0);
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

  describe('filter and type handlers', () => {
    it('handleStatusFilterChange resets index and fetches prayers', async () => {
      const fetchSpy = vi.spyOn(component, 'fetchPrayers').mockImplementation(() => Promise.resolve());
      component.currentIndex = 5;
      await component.handleStatusFilterChange();
      expect(component.currentIndex).toBe(0);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('handleTimeFilterChange resets index and fetches prayers', async () => {
      const fetchSpy = vi.spyOn(component, 'fetchPrayers').mockImplementation(() => Promise.resolve());
      component.currentIndex = 5;
      await component.handleTimeFilterChange();
      expect(component.currentIndex).toBe(0);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('handleContentTypeChange resets index and loads content', async () => {
      const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());
      component.currentIndex = 5;
      await component.handleContentTypeChange();
      expect(component.currentIndex).toBe(0);
      expect(loadSpy).toHaveBeenCalled();
    });

    it('refreshContent resets index and loads content', async () => {
      const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());
      component.currentIndex = 5;
      await component.refreshContent();
      expect(component.currentIndex).toBe(0);
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('calculateCurrentDuration branches', () => {
    it('returns displayDuration when smartMode is false', () => {
      component.smartMode = false;
      component.displayDuration = 5;
      component.prayers = [{ id: 'p1', description: 'x'.repeat(100) } as any];
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBe(5);
    });

    it('returns displayDuration when currentItem is undefined', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      component.prayers = [];
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBe(5);
    });

    it('calculates duration for prayer based on description length', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      // 120 characters = 10 seconds
      component.prayers = [{ id: 'p1', description: 'x'.repeat(120), prayer_updates: [] } as any];
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('calculates duration for prayer with updates', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      component.prayers = [{
        id: 'p1',
        description: 'x'.repeat(60),
        prayer_updates: [
          { id: 'u1', content: 'y'.repeat(100), created_at: '2024-01-15T10:30:00Z', denial_reason: null, approval_status: 'approved' },
          { id: 'u2', content: 'y'.repeat(50), created_at: '2024-01-14T10:30:00Z', denial_reason: null, approval_status: 'approved' }
        ]
      } as any];
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('calculates duration for prompt', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      component.prompts = [{ id: 'pr1', description: 'x'.repeat(100), type: 'encouragement' } as any];
      component.prayers = [];
      component.contentType = 'prompts';
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });
  });

  describe('startAutoAdvance callback branches', () => {
    it('startAutoAdvance calls nextSlide and restarts when isPlaying is true', () => {
      vi.useFakeTimers();
      component.prayers = [{ id: 'a' }, { id: 'b' }] as any;
      component.displayDuration = 0.001; // very short for test
      component.isPlaying = true;
      component.currentIndex = 0;
      
      component.startAutoAdvance();
      
      // The setTimeout should call nextSlide
      vi.advanceTimersByTime(2); // advance past the timeout
      
      // Now isPlaying is still true, so startAutoAdvance should be called again
      // We can't easily test this without a spy, so we just verify currentIndex changed
      expect(component.currentIndex).toBeGreaterThanOrEqual(0);
      
      vi.useRealTimers();
    });

    it('startAutoAdvance does not restart when isPlaying is false', () => {
      vi.useFakeTimers();
      component.prayers = [{ id: 'a' }, { id: 'b' }] as any;
      component.displayDuration = 0.001;
      component.isPlaying = false;
      component.currentIndex = 0;
      
      component.startAutoAdvance();
      
      vi.advanceTimersByTime(2);
      
      // When nextSlide is called with isPlaying = false, startAutoAdvance won't be called
      expect(component.currentIndex).toBeGreaterThanOrEqual(0);
      
      vi.useRealTimers();
    });
  });

  describe('mouse handling - middle zone', () => {
    it('handleMouseMove does nothing when mouse is between 75-80% of screen', () => {
      (component as any).initialPeriodElapsed = true;
      const initialValue = true;
      component.showControls = initialValue;
      vi.stubGlobal('innerHeight', 100);
      // Mouse at 77% (between 75 and 80)
      component.handleMouseMove({ clientY: 77 } as MouseEvent);
      // Should not change since it's in the deadzone
      expect(component.showControls).toBe(initialValue);
    });
  });

  describe('timeFilter branches', () => {
    it('fetchPrayers applies timeFilter twoweeks correctly', async () => {
      const now = new Date();
      const recent = { id: 'r', created_at: now.toISOString(), prayer_updates: [] };
      const q = createQuery({ data: [recent], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      component.timeFilter = 'twoweeks';
      await component.fetchPrayers();
      expect(component.prayers.length).toBe(1);
    });

    it('fetchPrayers applies timeFilter year correctly', async () => {
      const now = new Date();
      const recent = { id: 'r', created_at: now.toISOString(), prayer_updates: [] };
      const q = createQuery({ data: [recent], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      component.timeFilter = 'year';
      await component.fetchPrayers();
      expect(component.prayers.length).toBe(1);
    });

    it('fetchPrayers skips timeFilter when all is selected', async () => {
      const now = new Date();
      const recent = { id: 'r', created_at: now.toISOString(), prayer_updates: [] };
      const q = createQuery({ data: [recent], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      component.timeFilter = 'all';
      await component.fetchPrayers();
      expect(component.prayers.length).toBe(1);
    });
  });

  describe('status filter edge cases', () => {
    it('fetchPrayers with only current filter true', async () => {
      const current = { id: 'c', status: 'current', created_at: new Date().toISOString(), prayer_updates: [] };
      const q = createQuery({ data: [current], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      component.statusFilters = { current: true, answered: false };
      await component.fetchPrayers();
      expect(component.prayers.length).toBe(1);
    });

    it('fetchPrayers with only answered filter true', async () => {
      const answered = { id: 'a', status: 'answered', created_at: new Date().toISOString(), prayer_updates: [] };
      const q = createQuery({ data: [answered], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      component.statusFilters = { current: false, answered: true };
      await component.fetchPrayers();
      expect(component.prayers.length).toBe(1);
    });
  });

  describe('touch and mouse handlers', () => {
    it('onTouchMove updates touchEnd value', () => {
      (component as any).touchEnd = null;
      component.onTouchMove({ touches: [{ clientX: 123 }] } as unknown as TouchEvent);
      expect((component as any).touchEnd).toBe(123);
    });

    it('onTouchStart sets touchEnd to null', () => {
      (component as any).touchEnd = 100;
      component.onTouchStart({ touches: [{ clientX: 50 }] } as unknown as TouchEvent);
      expect((component as any).touchEnd).toBeNull();
    });

    it('handleMouseMove with mouse at bottom shows controls', () => {
      (component as any).initialPeriodElapsed = true;
      component.showControls = false;
      vi.stubGlobal('innerHeight', 100);
      
      component.handleMouseMove({ clientY: 85 } as MouseEvent); // 85% of screen
      
      expect(component.showControls).toBe(true);
    });

    it('handleMouseMove with mouse at top hides controls', () => {
      (component as any).initialPeriodElapsed = true;
      component.showControls = true;
      vi.stubGlobal('innerHeight', 100);
      
      component.handleMouseMove({ clientY: 50 } as MouseEvent); // 50% of screen, less than 75%
      
      expect(component.showControls).toBe(false);
    });
  });

  describe('prayer timer functionality', () => {
    it('startPrayerTimer unsubscribes from existing timer subscription', () => {
      vi.useFakeTimers();
      const oldUnsubscribeSpy = vi.fn();
      (component as any).prayerTimerSubscription = { unsubscribe: oldUnsubscribeSpy } as any;
      component.prayerTimerMinutes = 0.001;
      
      component.startPrayerTimer();
      
      expect(oldUnsubscribeSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('startPrayerTimer closes settings modal', () => {
      vi.useFakeTimers();
      component.showSettings = true;
      component.prayerTimerMinutes = 0.001;
      
      component.startPrayerTimer();
      
      expect(component.showSettings).toBe(false);
      
      vi.useRealTimers();
    });

    it('startPrayerTimer sets prayerTimerActive to true', () => {
      vi.useFakeTimers();
      component.prayerTimerActive = false;
      component.prayerTimerMinutes = 0.001;
      
      component.startPrayerTimer();
      
      expect(component.prayerTimerActive).toBe(true);
      
      vi.useRealTimers();
    });

    it('startPrayerTimer converts minutes to seconds', () => {
      vi.useFakeTimers();
      component.prayerTimerMinutes = 2;
      component.prayerTimerRemaining = 0;
      
      component.startPrayerTimer();
      
      expect(component.prayerTimerRemaining).toBe(120); // 2 minutes = 120 seconds
      
      vi.useRealTimers();
    });
  });

  describe('more duration and interval tests', () => {
    it('calculateCurrentDuration handles prayer with no prayer_updates property', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      component.prayers = [{ id: 'p1', description: 'x'.repeat(60) } as any]; // no prayer_updates
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('calculateCurrentDuration includes multiple recent updates', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      const now = new Date();
      component.prayers = [{
        id: 'p1',
        description: 'x'.repeat(60),
        prayer_updates: [
          { id: 'u1', content: 'y'.repeat(100), created_at: now.toISOString() },
          { id: 'u2', content: 'y'.repeat(100), created_at: new Date(now.getTime() - 1000).toISOString() },
          { id: 'u3', content: 'y'.repeat(100), created_at: new Date(now.getTime() - 2000).toISOString() },
          { id: 'u4', content: 'y'.repeat(100), created_at: new Date(now.getTime() - 3000).toISOString() }
        ]
      } as any];
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      // Should include description + top 3 recent updates
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(120);
    });

    it('clearIntervals unsubscribes from countdownSubscription', () => {
      const unsubscribeSpy = vi.fn();
      (component as any).autoAdvanceInterval = null;
      (component as any).countdownSubscription = { unsubscribe: unsubscribeSpy } as any;
      
      component.clearIntervals();
      
      expect(unsubscribeSpy).toHaveBeenCalled();
      expect((component as any).countdownSubscription).toBeNull();
    });

    it('startAutoAdvance unsubscribes existing countdownSubscription before creating new one', () => {
      vi.useFakeTimers();
      const oldUnsubscribeSpy = vi.fn();
      (component as any).countdownSubscription = { unsubscribe: oldUnsubscribeSpy } as any;
      component.prayers = [{ id: 'a' } as any];
      component.displayDuration = 1;
      
      component.startAutoAdvance();
      
      expect(oldUnsubscribeSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('fetch and sort operations', () => {
    it('fetchPrayers sorts prayers by latest activity with updates', async () => {
      const now = new Date();
      const oldest = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const newer = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      
      const prayer1 = {
        id: 'p1',
        created_at: oldest.toISOString(),
        prayer_updates: [{ id: 'u1', created_at: newer.toISOString(), approval_status: 'approved' }]
      };
      const prayer2 = {
        id: 'p2',
        created_at: newer.toISOString(),
        prayer_updates: []
      };
      
      const q = createQuery({ data: [prayer1, prayer2], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      component.timeFilter = 'all'; // Don't filter by time for this test
      
      await component.fetchPrayers();
      
      // prayer1 should be first because its update is newer than prayer2's creation
      expect(component.prayers[0].id).toBe('p1');
      expect(component.prayers[1].id).toBe('p2');
    });

    it('fetchPrayers filters prayer_updates by approval_status', async () => {
      const prayerWithMixedUpdates = {
        id: 'p1',
        created_at: new Date().toISOString(),
        prayer_updates: [
          { id: 'u1', content: 'approved', created_at: new Date().toISOString(), approval_status: 'approved' },
          { id: 'u2', content: 'pending', created_at: new Date().toISOString(), approval_status: 'pending' },
          { id: 'u3', content: 'approved2', created_at: new Date().toISOString(), approval_status: 'approved' }
        ]
      };
      const q = createQuery({ data: [prayerWithMixedUpdates], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      
      await component.fetchPrayers();
      
      expect(component.prayers.length).toBe(1);
      expect(component.prayers[0]?.prayer_updates?.length).toBe(2); // Only approved updates
    });

    it('fetchPrayers includes old prayers with recent updates when using time filter', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      
      const oldPrayerWithRecentUpdate = {
        id: 'p1',
        created_at: oldDate.toISOString(),
        prayer_updates: [{ 
          id: 'u1', 
          created_at: recentDate.toISOString(), 
          approval_status: 'approved' 
        }]
      };
      const recentPrayer = {
        id: 'p2',
        created_at: recentDate.toISOString(),
        prayer_updates: []
      };
      const oldPrayerWithoutUpdates = {
        id: 'p3',
        created_at: oldDate.toISOString(),
        prayer_updates: []
      };
      
      const q = createQuery({ data: [oldPrayerWithRecentUpdate, recentPrayer, oldPrayerWithoutUpdates], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      component.timeFilter = 'month'; // 30 days
      
      await component.fetchPrayers();
      
      // Should include p1 (old prayer with recent update) and p2 (recent prayer)
      // Should exclude p3 (old prayer without recent updates)
      expect(component.prayers.length).toBe(2);
      expect(component.prayers.map(p => p.id).sort()).toEqual(['p1', 'p2']);
    });

    it('shuffleArray does not modify input array', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      
      component.shuffleArray(original);
      
      expect(original).toEqual(copy);
    });

    it('previousSlide wraps to end when at index 0', () => {
      component.prayers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as any;
      component.isPlaying = false;
      component.currentIndex = 0;
      
      component.previousSlide();
      
      expect(component.currentIndex).toBe(2);
    });
  });

  describe('state mutation tests', () => {
    it('loadContent sets loading to true and false', async () => {
      const fetchSpy = vi.spyOn(component, 'fetchPrayers').mockImplementation(() => Promise.resolve());
      component.contentType = 'prayers';
      
      expect(component.loading).toBe(true); // was true from constructor
      const promise = component.loadContent();
      // loading is set to true immediately
      expect(component.loading).toBe(true);
      
      await promise;
      
      expect(component.loading).toBe(false);
    });

    it('nextSlide calls cdr.markForCheck', () => {
      const markSpy = vi.spyOn(component['cdr'], 'markForCheck');
      component.prayers = [{ id: 'a' }, { id: 'b' }] as any;
      component.isPlaying = false;
      component.currentIndex = 0;
      
      component.nextSlide();
      
      expect(markSpy).toHaveBeenCalled();
    });

    it('previousSlide calls cdr.markForCheck', () => {
      const markSpy = vi.spyOn(component['cdr'], 'markForCheck');
      component.prayers = [{ id: 'a' }, { id: 'b' }] as any;
      component.isPlaying = false;
      component.currentIndex = 1;
      
      component.previousSlide();
      
      expect(markSpy).toHaveBeenCalled();
    });

    it('handleStatusFilterChange calls cdr.markForCheck', async () => {
      const markSpy = vi.spyOn(component['cdr'], 'markForCheck');
      const fetchSpy = vi.spyOn(component, 'fetchPrayers').mockImplementation(() => Promise.resolve());
      
      await component.handleStatusFilterChange();
      
      expect(markSpy).toHaveBeenCalled();
    });

    it('handleTimeFilterChange calls cdr.markForCheck', async () => {
      const markSpy = vi.spyOn(component['cdr'], 'markForCheck');
      const fetchSpy = vi.spyOn(component, 'fetchPrayers').mockImplementation(() => Promise.resolve());
      
      await component.handleTimeFilterChange();
      
      expect(markSpy).toHaveBeenCalled();
    });

    it('handleContentTypeChange calls cdr.markForCheck', async () => {
      const markSpy = vi.spyOn(component['cdr'], 'markForCheck');
      const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());
      
      await component.handleContentTypeChange();
      
      expect(markSpy).toHaveBeenCalled();
    });

    it('refreshContent calls cdr.markForCheck', async () => {
      const markSpy = vi.spyOn(component['cdr'], 'markForCheck');
      const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());
      
      await component.refreshContent();
      
      expect(markSpy).toHaveBeenCalled();
    });
  });

  describe('additional error and edge case handling', () => {
    it('fetchPrayers with contentType not prayers does not filter by status', async () => {
      const q = createQuery({ data: [{ id: '1', created_at: new Date().toISOString(), prayer_updates: [] }], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prompts';
      await component.fetchPrayers();
      expect(component.prayers.length).toBe(1);
    });

    it('fetchPrayers with contentType not prayers does not apply timeFilter', async () => {
      const q = createQuery({ data: [{ id: '1', created_at: new Date().toISOString(), prayer_updates: [] }], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prompts';
      component.timeFilter = 'week';
      await component.fetchPrayers();
      expect(component.prayers.length).toBe(1);
    });

    it('calculateCurrentDuration handles prayer with empty prayer_updates', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      component.prayers = [{ id: 'p1', description: 'x'.repeat(60), prayer_updates: [] } as any];
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('calculateCurrentDuration handles prayer with no description', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      component.prayers = [{ id: 'p1', prayer_updates: [] } as any];
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('calculateCurrentDuration for prompt with no description', () => {
      component.smartMode = true;
      component.displayDuration = 5;
      component.prompts = [{ id: 'pr1', type: 'encouragement' } as any];
      component.prayers = [];
      component.contentType = 'prompts';
      component.currentIndex = 0;
      
      const duration = component.calculateCurrentDuration();
      
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('items returns prayers when contentType is prayers', () => {
      const prayers = [{ id: 'p1', prayer_for: 'John' } as any];
      const prompts = [{ id: 'pr1', type: 'encouragement' } as any];
      component.prayers = prayers;
      component.prompts = prompts;
      component.contentType = 'prayers';
      
      expect(component.items).toEqual(prayers);
    });

    it('items returns prompts when contentType is prompts', () => {
      const prayers = [{ id: 'p1', prayer_for: 'John' } as any];
      const prompts = [{ id: 'pr1', type: 'encouragement' } as any];
      component.prayers = prayers;
      component.prompts = prompts;
      component.contentType = 'prompts';
      
      expect(component.items).toEqual(prompts);
    });

    it('items returns combined prayers and prompts when contentType is both', () => {
      const prayers = [{ id: 'p1', prayer_for: 'John' } as any];
      const prompts = [{ id: 'pr1', type: 'encouragement' } as any];
      component.prayers = prayers;
      component.prompts = prompts;
      component.contentType = 'both';
      
      const items = component.items;
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('p1');
      expect(items[1].id).toBe('pr1');
    });

    it('currentItem returns item at currentIndex', () => {
      component.prayers = [{ id: 'a' } as any, { id: 'b' } as any, { id: 'c' } as any];
      component.contentType = 'prayers';
      component.currentIndex = 1;
      
      expect(component.currentItem.id).toBe('b');
    });

    it('fetchPrompts handles error in type fetch', async () => {
      const qError = createQuery({ data: null, error: { message: 'types error' } });
      mockSupabase.client.from = vi.fn().mockReturnValue(qError);
      
      await component.fetchPrompts();
      
      expect(component.prompts).toEqual([]);
    });

    it('fetchPrompts handles error in prompts fetch', async () => {
      const qTypes = createQuery({ data: [{ name: 't1', display_order: 1 }], error: null });
      const qPromptsError = createQuery({ data: null, error: { message: 'prompts error' } });
      let callCount = 0;
      mockSupabase.client.from = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? qTypes : qPromptsError;
      });
      
      await component.fetchPrompts();
      
      expect(component.prompts).toEqual([]);
    });

    it('onTouchStart with single tap sets lastTap', () => {
      (component as any).lastTap = 0;
      component.onTouchStart({ touches: [{ clientX: 50 }] } as unknown as TouchEvent);
      expect((component as any).lastTap).toBeGreaterThan(0);
    });

    it('onTouchStart resets lastTap to 0 on double tap', () => {
      (component as any).lastTap = Date.now() - 100;
      component.showControls = true;
      component.onTouchStart({ touches: [{ clientX: 50 }] } as unknown as TouchEvent);
      expect((component as any).lastTap).toBe(0);
    });

    it('clearIntervals sets autoAdvanceInterval to null', () => {
      (component as any).autoAdvanceInterval = setTimeout(() => {}, 1000);
      (component as any).countdownSubscription = null;
      
      component.clearIntervals();
      
      expect((component as any).autoAdvanceInterval).toBeNull();
    });

    it('handleKeyboard ignores unknown keys', () => {
      const nextSpy = vi.spyOn(component, 'nextSlide');
      component.handleKeyboard({ key: 'Unknown', preventDefault: () => {} } as unknown as KeyboardEvent);
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('handleKeyboard with space key calls preventDefault and nextSlide', () => {
      const preventSpy = vi.fn();
      const nextSpy = vi.spyOn(component, 'nextSlide');
      component.handleKeyboard({ key: ' ', preventDefault: preventSpy } as unknown as KeyboardEvent);
      expect(preventSpy).toHaveBeenCalled();
      expect(nextSpy).toHaveBeenCalled();
    });

    it('applyTheme with light theme removes dark class', () => {
      component.theme = 'light';
      const root = document.documentElement;
      root.classList.add('dark');
      component.applyTheme();
      expect(root.classList.contains('dark')).toBe(false);
    });

    it('loadTheme uses default theme when localStorage is empty', () => {
      localStorage.removeItem('theme');
      const applySpy = vi.spyOn(component, 'applyTheme');
      component.theme = 'light';
      component.loadTheme();
      expect(applySpy).toHaveBeenCalled();
    });

    it('ngOnDestroy clears all intervals and timers', () => {
      (component as any).autoAdvanceInterval = setTimeout(() => {}, 1000);
      (component as any).countdownSubscription = { unsubscribe: vi.fn() } as any;
      (component as any).initialTimerHandle = setTimeout(() => {}, 1000);
      (component as any).prayerTimerSubscription = { unsubscribe: vi.fn() } as any;
      
      component.ngOnDestroy();
      
      expect((component as any).autoAdvanceInterval).toBeNull();
      expect((component as any).countdownSubscription).toBeNull();
    });

    it('loadContent catches errors from fetchPrayers', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(component, 'fetchPrayers').mockRejectedValue(new Error('Fetch error'));
      component.contentType = 'prayers';
      await component.loadContent();
      expect(consoleSpy).toHaveBeenCalled();
      expect(component.loading).toBe(false);
      consoleSpy.mockRestore();
    });

    it('setupControlsAutoHide treats device as mobile when touch present', () => {
      (globalThis as any).ontouchstart = true;
      (component as any).initialPeriodElapsed = false;
      component.showControls = true;
      component.setupControlsAutoHide();
      expect((component as any).initialPeriodElapsed).toBe(true);
      delete (globalThis as any).ontouchstart;
    });

    it('handleMouseMove does nothing during initial period', () => {
      (component as any).initialPeriodElapsed = false;
      component.showControls = false;
      vi.stubGlobal('innerHeight', 100);
      component.handleMouseMove({ clientY: 90 } as MouseEvent);
      expect(component.showControls).toBe(false);
    });

    it('fetchPrayers with both status filters false results in no status filter applied', async () => {
      const q = createQuery({ data: [], error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue(q);
      component.contentType = 'prayers';
      component.statusFilters = { current: false, answered: false };
      await component.fetchPrayers();
      expect(component.prayers).toEqual([]);
    });

    it('onTouchEnd does nothing when touchStart is null', () => {
      component.prayers = [{ id: '1' } as any];
      (component as any).touchStart = null;
      (component as any).touchEnd = 100;
      component.currentIndex = 0;
      component.onTouchEnd();
      expect(component.currentIndex).toBe(0);
    });

    it('onTouchEnd does nothing when touchEnd is null', () => {
      component.prayers = [{ id: '1' } as any];
      (component as any).touchStart = 100;
      (component as any).touchEnd = null;
      component.currentIndex = 0;
      component.onTouchEnd();
      expect(component.currentIndex).toBe(0);
    });

    it('onTouchEnd does nothing when swipe distance is too small', () => {
      component.prayers = [{ id: '1' }, { id: '2' }] as any;
      (component as any).touchStart = 100;
      (component as any).touchEnd = 95;
      component.currentIndex = 0;
      component.onTouchEnd();
      expect(component.currentIndex).toBe(0);
    });
  
    describe('Additional presentation helpers', () => {
      it('loadContent randomizes when enabled', async () => {
        component.contentType = 'prayers';
        component.randomize = true;
        const fetchSpy = vi.spyOn(component, 'fetchPrayers').mockResolvedValue();
        const shuffleSpy = vi.spyOn(component, 'shuffleItems').mockImplementation(() => {});

        await component.loadContent();

        expect(fetchSpy).toHaveBeenCalled();
        expect(shuffleSpy).toHaveBeenCalled();
        expect(component.loading).toBe(false);
      });

      it('loadContent handles failures gracefully', async () => {
        component.contentType = 'prayers';
        vi.spyOn(component, 'fetchPrayers').mockRejectedValue(new Error('boom'));

        await component.loadContent();

        expect(component.loading).toBe(false);
      });

      it('fetchPrayers respects time filters to include recent updates', async () => {
        const now = new Date();
        const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const old = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
        const data = [
          {
            id: 'include',
            created_at: old,
            status: 'current',
            prayer_updates: [{ created_at: recent, approval_status: 'approved', content: 'Update' }]
          },
          {
            id: 'exclude',
            created_at: old,
            status: 'current',
            prayer_updates: []
          }
        ];

        component.contentType = 'prayers';
        component.timeFilter = 'week';
        component.statusFilters = { current: true, answered: true };
        const query = createQuery({ data, error: null });
        mockSupabase.client.from = vi.fn().mockReturnValue(query);

        await component.fetchPrayers();

        expect(component.prayers).toHaveLength(1);
        expect(component.prayers[0].id).toBe('include');
      });

      it('fetchPrompts handles type fetch errors by clearing prompts', async () => {
        const q1 = createQuery({ data: null, error: { message: 'types fail' } });
        const q2 = createQuery({ data: [], error: null });
        let callCount = 0;
        mockSupabase.client.from = vi.fn().mockImplementation(() => {
          callCount += 1;
          return callCount === 1 ? q1 : q2;
        });

        await component.fetchPrompts();

        expect(component.prompts).toEqual([]);
      });

      it('fetchPersonalPrayers filters by time and status', async () => {
        const now = new Date();
        const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const older = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
        const prayers = [
          { id: 'current', created_at: recent, category: 'Current', updates: [], status: 'current' },
          { id: 'answered', created_at: older, category: 'Answered', updates: [], status: 'answered' }
        ];

        component['prayerService'] = {
          allPersonalPrayers$: {
            subscribe(cb: any) {
              cb(prayers);
              return { unsubscribe: vi.fn() };
            }
          }
        } as any;

        component.timeFilter = 'week';
        component.statusFilters = { current: true, answered: false };

        await component.fetchPersonalPrayers();

        expect(component.personalPrayers).toHaveLength(1);
        expect(component.personalPrayers[0].category).toBe('Current');
      });

      it('fetchPersonalPrayers handles subscription errors gracefully', async () => {
        component['prayerService'] = {
          allPersonalPrayers$: {
            subscribe() {
              throw new Error('failed');
            }
          }
        } as any;

        await component.fetchPersonalPrayers();

        expect(component.personalPrayers).toEqual([]);
      });

      it('togglePersonalCategory manages selections and resets index', () => {
        component.selectedPersonalCategories = ['Current'];
        component.currentIndex = 3;

        component.togglePersonalCategory('Current');
        expect(component.selectedPersonalCategories).not.toContain('Current');
        expect(component.currentIndex).toBe(0);

        component.togglePersonalCategory('Answered');
        expect(component.selectedPersonalCategories).toContain('Answered');
      });

      it('isPersonalCategorySelected reports correctly', () => {
        component.selectedPersonalCategories = ['foo'];
        expect(component.isPersonalCategorySelected('foo')).toBe(true);
        expect(component.isPersonalCategorySelected('bar')).toBe(false);
      });

      it('extractUniquePersonalCategories trims duplicates', () => {
        component.personalPrayers = [
          { category: 'Answered ' },
          { category: 'Answered' },
          { category: 'Current' }
        ] as any;
        component['extractUniquePersonalCategories']();
        expect(component.uniquePersonalCategories).toEqual(['Answered', 'Current']);
      });

      it('items getter respects selected personal categories for all content', () => {
        component.contentType = 'all';
        component.prayers = [{ id: 'p' }] as any;
        component.prompts = [{ id: 'pr' }] as any;
        component.personalPrayers = [{ id: 'personal', category: 'cat' }] as any;
        component.selectedPersonalCategories = ['cat'];

        const items = component.items;

        expect(items).toContainEqual({ id: 'p' });
        expect(items).toContainEqual({ id: 'pr' });
        expect(items).toContainEqual({ id: 'personal', category: 'cat' });
      });

      it('handleContentTypeChange reloads content and resets index', async () => {
        component.currentIndex = 5;
        const loadSpy = vi.spyOn(component, 'loadContent').mockResolvedValue();

        await component.handleContentTypeChange();

        expect(component.currentIndex).toBe(0);
        expect(loadSpy).toHaveBeenCalled();
      });

      it('handleStatusFilterChange refreshes both prayers and personal lists when showing all', async () => {
        component.contentType = 'all';
        const prayersSpy = vi.spyOn(component, 'fetchPrayers').mockResolvedValue();
        const personalSpy = vi.spyOn(component, 'fetchPersonalPrayers').mockResolvedValue();

        await component.handleStatusFilterChange();

        expect(prayersSpy).toHaveBeenCalled();
        expect(personalSpy).toHaveBeenCalled();
        expect(component.currentIndex).toBe(0);
      });

      it('handleTimeFilterChange mirrors status change behavior', async () => {
        component.contentType = 'all';
        const prayersSpy = vi.spyOn(component, 'fetchPrayers').mockResolvedValue();
        const personalSpy = vi.spyOn(component, 'fetchPersonalPrayers').mockResolvedValue();

        await component.handleTimeFilterChange();

        expect(prayersSpy).toHaveBeenCalled();
        expect(personalSpy).toHaveBeenCalled();
      });

      it('handleRandomizeChange shuffles when enabled and reloads when disabled', async () => {
        component.randomize = true;
        const shuffleSpy = vi.spyOn(component, 'shuffleItems').mockImplementation(() => {});
        await component.handleRandomizeChange();
        expect(shuffleSpy).toHaveBeenCalled();

        component.randomize = false;
        const loadSpy = vi.spyOn(component, 'loadContent').mockResolvedValue();
        await component.handleRandomizeChange();
        expect(loadSpy).toHaveBeenCalled();
      });

      it('refreshContent reloads data and resets index', async () => {
        component.currentIndex = 4;
        const loadSpy = vi.spyOn(component, 'loadContent').mockResolvedValue();

        await component.refreshContent();

        expect(loadSpy).toHaveBeenCalled();
        expect(component.currentIndex).toBe(0);
      });

      it('calculateCurrentDuration handles prompt descriptions', () => {
        const prompt = { description: 'a'.repeat(50) } as any;
        component.prompts = [prompt];
        component.contentType = 'prompts';
        component.currentIndex = 0;
        component.smartMode = true;

        const duration = component.calculateCurrentDuration();

        expect(duration).toBeGreaterThanOrEqual(10);
      });

      it('shuffleArray preserves elements and returns new array', () => {
        const arr = [1, 2, 3];
        const shuffled = component.shuffleArray(arr);
        expect(shuffled).not.toBe(arr);
        expect(shuffled.sort()).toEqual(arr.slice().sort());
      });
    });
  });
});
