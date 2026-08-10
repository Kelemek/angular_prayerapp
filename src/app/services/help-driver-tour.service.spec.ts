import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { driver } from 'driver.js';
import {
  FULL_GUIDED_TOUR_CLOSING_SENTINEL,
  FULL_GUIDED_TOUR_QUEUE_KEY,
  HelpDriverTourService,
  parseFullGuidedTourQueue,
  PRESENTATION_HELP_TOUR_SESSION_KEY,
  TOUR_REQUEST_BTN_MOBILE_ID,
  TOUR_REQUEST_BTN_DESKTOP_ID,
  TOUR_FILTER_PERSONAL_ID,
  TOUR_ADD_UPDATE_BTN_ID,
  TOUR_FILTER_CURRENT_ID,
  TOUR_FILTER_TOTAL_ID,
  TOUR_FILTER_ANSWERED_ID,
  TOUR_FILTER_PROMPTS_ID,
  TOUR_FILTER_MEMORIZE_ID,
  TOUR_MEMORIZE_SAMPLE_CARD_ID,
  TOUR_MEMORIZE_SAMPLE_TABLE_ID,
  TOUR_PRAYER_MODE_DESKTOP_ID,
  TOUR_PRAYER_MODE_MOBILE_ID,
  TOUR_PRAYER_SEARCH_ID,
  TOUR_SETTINGS_BTN_DESKTOP_ID,
  TOUR_SETTINGS_BTN_MOBILE_ID,
  TOUR_SETTINGS_PRINT_ROW_ID,
  TOUR_SETTINGS_PRINT_PRAYERS_ID,
  TOUR_SETTINGS_PRINT_PROMPTS_ID,
  TOUR_SETTINGS_PRINT_PERSONAL_ID,
  TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID,
  TOUR_SETTINGS_PRAYER_REMINDERS_ID,
  TOUR_SETTINGS_PRAYER_REMINDER_CONTROLS_ID,
  TOUR_PRAYER_REMINDER_BELL_ID,
  TOUR_SETTINGS_FEEDBACK_SECTION_ID,
  TOUR_SETTINGS_FEEDBACK_TYPE_ID,
  TOUR_SETTINGS_FEEDBACK_DETAILS_ID,
  TOUR_SETTINGS_THEME_ID,
  TOUR_SETTINGS_TEXT_SIZE_ID,
  TOUR_SETTINGS_PUSH_ID,
  TOUR_SETTINGS_BADGES_ID,
  TOUR_SETTINGS_PRAYER_ENCOURAGEMENT_ID,
  TOUR_SETTINGS_DEFAULT_VIEW_ID,
  TOUR_SETTINGS_MEMORIZATION_STRICT_MODE_ID,
  TOUR_PRAYER_SUBMIT_REQUEST_ID,
  TOUR_PRAYER_UPDATE_SUBMIT_ID,
  TOUR_PRAYER_UPDATE_ANONYMOUS_WRAP_ID,
  TOUR_PRAYER_UPDATE_MARK_ANSWERED_WRAP_ID,
  TOUR_PRESENTATION_TOOLBAR_ID,
  TOUR_PRESENTATION_PREV_ID,
  TOUR_PRESENTATION_PLAY_ID,
  TOUR_PRESENTATION_NEXT_ID,
  TOUR_PRESENTATION_SETTINGS_BTN_ID,
  TOUR_PRESENTATION_EXIT_ID,
  TOUR_PRESENTATION_SETTINGS_MODAL_ID,
  TOUR_PRESENTATION_SETTING_THEME_ID,
  TOUR_PRESENTATION_SETTING_SMART_ID,
  TOUR_PRESENTATION_SETTING_DURATION_ID,
  TOUR_PRESENTATION_SETTING_CONTENT_TYPE_ID,
  TOUR_PRESENTATION_SETTING_RANDOMIZE_ID,
  TOUR_PRESENTATION_SETTING_TIME_FILTER_ID,
  TOUR_PRESENTATION_SETTING_STATUS_ID,
  TOUR_PRESENTATION_SETTING_TIMER_ID,
} from './help-driver-tour.service';
import type { HelpContent } from '../types/help-content';

vi.mock('driver.js', () => ({
  driver: vi.fn(),
}));

const sampleHelp: HelpContent = {
  subtitle: 'Creating a New Prayer Request',
  text: 'Click the Request button in the header to create a new prayer request.',
  examples: [],
};

const samplePersonalHelp: HelpContent = {
  subtitle: 'Creating Personal Prayers (Private Prayers)',
  text: 'Click the filter button labeled Personal to view your private prayers.',
  examples: [],
};

const sampleUpdatingHelp: HelpContent = {
  subtitle: 'Updating Prayers',
  text: 'Click the Update button to add an update about the prayer request.',
  examples: [],
};

const sampleManagingViewsHelp: HelpContent = {
  subtitle: 'Managing Personal vs. Regular Prayers',
  text: 'Use the Personal filter for private prayers and Current or Total for community.',
  examples: [],
};

describe('HelpDriverTourService', () => {
  let service: HelpDriverTourService;
  let openPrayerForm: ReturnType<typeof vi.fn>;
  let switchToPersonalFilter: ReturnType<typeof vi.fn>;
  let switchToPersonal: ReturnType<typeof vi.fn>;
  let switchToCurrent: ReturnType<typeof vi.fn>;
  let switchToAnswered: ReturnType<typeof vi.fn>;
  let switchToTotal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    service = new HelpDriverTourService();
    openPrayerForm = vi.fn();
    switchToPersonalFilter = vi.fn();
    switchToPersonal = vi.fn();
    switchToCurrent = vi.fn();
    switchToAnswered = vi.fn();
    switchToTotal = vi.fn();
    vi.mocked(driver).mockImplementation(
      () =>
        ({
          drive: vi.fn(),
          destroy: vi.fn(),
          refresh: vi.fn(),
          moveNext: vi.fn(),
        }) as ReturnType<typeof driver>
    );
  });

  afterEach(() => {
    service.destroy();
    document.body.innerHTML = '';
  });

  it('full guided welcome: programmatic destroy() runs onDestroyed with callback still set (Begin path)', () => {
    const onBegin = vi.fn();
    let savedConfig: { steps?: unknown[]; onDestroyed?: (e: unknown, s: unknown, o: unknown) => void } | undefined;
    vi.mocked(driver).mockImplementation((cfg) => {
      savedConfig = cfg as typeof savedConfig;
      return {
        drive: vi.fn(),
        destroy: vi.fn(),
        refresh: vi.fn(),
        moveNext: vi.fn(),
      } as ReturnType<typeof driver>;
    });
    vi.useFakeTimers();
    service.startFullGuidedTourWelcome(onBegin, { totalSteps: 3 });
    expect(savedConfig?.steps?.length).toBe(1);
    savedConfig?.onDestroyed?.(undefined, undefined, {
      config: { steps: savedConfig?.steps ?? [] },
      state: { activeIndex: 0 },
      driver: {},
    });
    vi.runAllTimers();
    expect(onBegin).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does not call driver when no Request button exists', () => {
    service.startNewPrayerRequestTour(sampleHelp, { openPrayerForm });
    expect(driver).not.toHaveBeenCalled();
  });

  it('starts tour when a Request button exists (desktop id)', () => {
    const btn = document.createElement('button');
    btn.id = TOUR_REQUEST_BTN_DESKTOP_ID;
    document.body.appendChild(btn);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );

    service.startNewPrayerRequestTour(sampleHelp, { openPrayerForm });

    expect(driver).toHaveBeenCalledTimes(1);
    const config = vi.mocked(driver).mock.calls[0][0];
    expect(config?.steps?.length).toBe(6);
    expect(config?.showProgress).toBe(true);

    const instance = vi.mocked(driver).mock.results[0]?.value as { drive: ReturnType<typeof vi.fn> };
    expect(instance.drive).toHaveBeenCalledWith(0);

    vi.unstubAllGlobals();
  });

  it('open form hook runs from step 0 onNextClick then refreshes and advances', () => {
    const btn = document.createElement('button');
    btn.id = TOUR_REQUEST_BTN_MOBILE_ID;
    document.body.appendChild(btn);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );

    const refresh = vi.fn();
    const moveNext = vi.fn();
    vi.mocked(driver).mockImplementation(
      () =>
        ({
          drive: vi.fn(),
          destroy: vi.fn(),
          refresh,
          moveNext,
        }) as ReturnType<typeof driver>
    );

    vi.useFakeTimers();
    service.startNewPrayerRequestTour(sampleHelp, { openPrayerForm });
    const config = vi.mocked(driver).mock.calls[0][0];
    const hook = config?.steps?.[0]?.popover?.onNextClick;
    const mockDriver = { refresh, moveNext };
    hook?.(document.body, config!.steps![0]!, {
      config: config!,
      state: {} as any,
      driver: mockDriver as any,
    });

    expect(openPrayerForm).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(250);
    expect(refresh).toHaveBeenCalled();
    expect(moveNext).toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('destroy is safe when no active tour', () => {
    expect(() => service.destroy()).not.toThrow();
  });

  it('starting again destroys previous driver instance', () => {
    const btn = document.createElement('button');
    btn.id = TOUR_REQUEST_BTN_DESKTOP_ID;
    document.body.appendChild(btn);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );

    const destroyA = vi.fn();
    const destroyB = vi.fn();
    vi.mocked(driver)
      .mockImplementationOnce(
        () => ({ drive: vi.fn(), destroy: destroyA, refresh: vi.fn(), moveNext: vi.fn() }) as ReturnType<
          typeof driver
        >
      )
      .mockImplementationOnce(
        () => ({ drive: vi.fn(), destroy: destroyB, refresh: vi.fn(), moveNext: vi.fn() }) as ReturnType<
          typeof driver
        >
      );

    service.startNewPrayerRequestTour(sampleHelp, { openPrayerForm });
    service.startNewPrayerRequestTour(sampleHelp, { openPrayerForm });

    expect(destroyA).toHaveBeenCalledTimes(1);
    expect(driver).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  describe('startPersonalPrayerTour', () => {
    function mountFilterAndRequest() {
      const filterBtn = document.createElement('button');
      filterBtn.id = TOUR_FILTER_PERSONAL_ID;
      document.body.appendChild(filterBtn);
      const req = document.createElement('button');
      req.id = TOUR_REQUEST_BTN_DESKTOP_ID;
      document.body.appendChild(req);
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
      );
    }

    it('does not call driver when Personal filter element is missing', () => {
      const req = document.createElement('button');
      req.id = TOUR_REQUEST_BTN_DESKTOP_ID;
      document.body.appendChild(req);
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
      );
      service.startPersonalPrayerTour(samplePersonalHelp, {
        switchToPersonalFilter,
        openPrayerForm,
      });
      expect(driver).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('does not call driver when Request button is missing', () => {
      const filterBtn = document.createElement('button');
      filterBtn.id = TOUR_FILTER_PERSONAL_ID;
      document.body.appendChild(filterBtn);
      service.startPersonalPrayerTour(samplePersonalHelp, {
        switchToPersonalFilter,
        openPrayerForm,
      });
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts tour when filter and Request exist', () => {
      mountFilterAndRequest();
      service.startPersonalPrayerTour(samplePersonalHelp, {
        switchToPersonalFilter,
        openPrayerForm,
      });
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(6);
      vi.unstubAllGlobals();
    });

    it('step 0 onNext runs switchToPersonalFilter then refresh and moveNext', () => {
      mountFilterAndRequest();
      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );
      vi.useFakeTimers();
      service.startPersonalPrayerTour(samplePersonalHelp, {
        switchToPersonalFilter,
        openPrayerForm,
      });
      const config = vi.mocked(driver).mock.calls[0][0];
      const hook = config?.steps?.[0]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![0]!, {
        config: config!,
        state: {} as any,
        driver: { refresh, moveNext } as any,
      });
      expect(switchToPersonalFilter).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(250);
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  describe('startUpdatingPrayerTour', () => {
    it('does not call driver when Add Update anchor is missing', () => {
      service.startUpdatingPrayerTour(sampleUpdatingHelp);
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts with 4 steps when anonymous step is excluded', () => {
      const btn = document.createElement('button');
      btn.id = TOUR_ADD_UPDATE_BTN_ID;
      document.body.appendChild(btn);

      service.startUpdatingPrayerTour(sampleUpdatingHelp, { includeAnonymousUpdateStep: false });

      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(4);
    });

    it('starts with 5 steps when anonymous step is included', () => {
      const btn = document.createElement('button');
      btn.id = TOUR_ADD_UPDATE_BTN_ID;
      document.body.appendChild(btn);

      service.startUpdatingPrayerTour(sampleUpdatingHelp, { includeAnonymousUpdateStep: true });

      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(5);
    });

    it('step 0 onNext clicks Add Update then refresh and moveNext', () => {
      const btn = document.createElement('button');
      btn.id = TOUR_ADD_UPDATE_BTN_ID;
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );

      vi.useFakeTimers();
      service.startUpdatingPrayerTour(sampleUpdatingHelp, { includeAnonymousUpdateStep: false });
      const config = vi.mocked(driver).mock.calls[0][0];
      const hook = config?.steps?.[0]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![0]!, {
        config: config!,
        state: {} as any,
        driver: { refresh, moveNext } as any,
      });

      expect(clickSpy).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(300);
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('startManagingPrayerViewsTour', () => {
    const managingHooks = () => ({
      switchToCurrent,
      switchToAnswered,
      switchToTotal,
    });

    function mountFourFilters() {
      const personal = document.createElement('button');
      personal.id = TOUR_FILTER_PERSONAL_ID;
      document.body.appendChild(personal);
      const current = document.createElement('button');
      current.id = TOUR_FILTER_CURRENT_ID;
      document.body.appendChild(current);
      const answered = document.createElement('button');
      answered.id = TOUR_FILTER_ANSWERED_ID;
      document.body.appendChild(answered);
      const total = document.createElement('button');
      total.id = TOUR_FILTER_TOTAL_ID;
      document.body.appendChild(total);
    }

    it('does not call driver when Answered filter element is missing', () => {
      const personal = document.createElement('button');
      personal.id = TOUR_FILTER_PERSONAL_ID;
      document.body.appendChild(personal);
      const current = document.createElement('button');
      current.id = TOUR_FILTER_CURRENT_ID;
      document.body.appendChild(current);
      const total = document.createElement('button');
      total.id = TOUR_FILTER_TOTAL_ID;
      document.body.appendChild(total);
      service.startManagingPrayerViewsTour(sampleManagingViewsHelp, managingHooks());
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts tour when Personal, Current, Answered, and Total exist', () => {
      mountFourFilters();
      service.startManagingPrayerViewsTour(sampleManagingViewsHelp, managingHooks());
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(4);
    });

    it('step 0 onNext runs switchToCurrent then refresh and moveNext', () => {
      mountFourFilters();
      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );
      vi.useFakeTimers();
      service.startManagingPrayerViewsTour(sampleManagingViewsHelp, managingHooks());
      const config = vi.mocked(driver).mock.calls[0][0];
      const hook = config?.steps?.[0]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![0]!, {
        config: config!,
        state: {} as any,
        driver: { refresh, moveNext } as any,
      });
      expect(switchToCurrent).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(250);
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('step 1 onNext runs switchToAnswered', () => {
      mountFourFilters();
      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );
      vi.useFakeTimers();
      service.startManagingPrayerViewsTour(sampleManagingViewsHelp, managingHooks());
      const config = vi.mocked(driver).mock.calls[0][0];
      const hook = config?.steps?.[1]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![1]!, {
        config: config!,
        state: {} as any,
        driver: { refresh, moveNext } as any,
      });
      expect(switchToAnswered).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(250);
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('step 2 onNext runs switchToTotal', () => {
      mountFourFilters();
      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );
      vi.useFakeTimers();
      service.startManagingPrayerViewsTour(sampleManagingViewsHelp, managingHooks());
      const config = vi.mocked(driver).mock.calls[0][0];
      const hook = config?.steps?.[2]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![2]!, {
        config: config!,
        state: {} as any,
        driver: { refresh, moveNext } as any,
      });
      expect(switchToTotal).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(250);
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('startPrayerPromptsTour', () => {
    const samplePromptsSection = { title: 'Using Prayer Prompts', description: 'Get inspired with our prayer prompts' };

    function mountPrayerModeButtons() {
      const desk = document.createElement('button');
      desk.id = TOUR_PRAYER_MODE_DESKTOP_ID;
      document.body.appendChild(desk);
      const mob = document.createElement('button');
      mob.id = TOUR_PRAYER_MODE_MOBILE_ID;
      document.body.appendChild(mob);
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
      );
    }

    it('does not call driver when prompts filter tile is missing', () => {
      mountPrayerModeButtons();
      service.startPrayerPromptsTour(
        samplePromptsSection,
        { hasPrompts: false },
        { switchToPrompts: vi.fn(), clearPromptTypes: vi.fn() }
      );
      expect(driver).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('does not call driver when Prayer mode buttons are missing', () => {
      const pf = document.createElement('button');
      pf.id = TOUR_FILTER_PROMPTS_ID;
      document.body.appendChild(pf);
      service.startPrayerPromptsTour(
        samplePromptsSection,
        { hasPrompts: false },
        { switchToPrompts: vi.fn(), clearPromptTypes: vi.fn() }
      );
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts with 3 steps when hasPrompts is false', () => {
      const pf = document.createElement('button');
      pf.id = TOUR_FILTER_PROMPTS_ID;
      document.body.appendChild(pf);
      mountPrayerModeButtons();
      service.startPrayerPromptsTour(
        samplePromptsSection,
        { hasPrompts: false },
        { switchToPrompts: vi.fn(), clearPromptTypes: vi.fn() }
      );
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(3);
      vi.unstubAllGlobals();
    });

    it('starts with 4 steps when hasPrompts is true', () => {
      const pf = document.createElement('button');
      pf.id = TOUR_FILTER_PROMPTS_ID;
      document.body.appendChild(pf);
      mountPrayerModeButtons();
      service.startPrayerPromptsTour(
        samplePromptsSection,
        { hasPrompts: true },
        { switchToPrompts: vi.fn(), clearPromptTypes: vi.fn() }
      );
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(4);
      vi.unstubAllGlobals();
    });

    it('step 0 onNext runs switchToPrompts then refresh and moveNext', () => {
      const pf = document.createElement('button');
      pf.id = TOUR_FILTER_PROMPTS_ID;
      document.body.appendChild(pf);
      mountPrayerModeButtons();
      const switchToPrompts = vi.fn();
      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );
      vi.useFakeTimers();
      service.startPrayerPromptsTour(
        samplePromptsSection,
        { hasPrompts: false },
        { switchToPrompts, clearPromptTypes: vi.fn() }
      );
      const config = vi.mocked(driver).mock.calls[0][0];
      const hook = config?.steps?.[0]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![0]!, {
        config: config!,
        state: {} as any,
        driver: { refresh, moveNext } as any,
      });
      expect(switchToPrompts).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(250);
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  describe('startMemorizeHelpSectionTour', () => {
    const sampleMemorizeSection = {
      title: 'Memorize Scripture',
      description: 'Memorize Bible verses',
    };

    it('does not call driver when Memorize filter tile is missing', () => {
      service.startMemorizeHelpSectionTour(
        sampleMemorizeSection,
        { hasMemorizedItems: false },
        { switchToMemorize: vi.fn() }
      );
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts without action bar in DOM (before switching filter)', () => {
      const mf = document.createElement('button');
      mf.id = TOUR_FILTER_MEMORIZE_ID;
      document.body.appendChild(mf);
      service.startMemorizeHelpSectionTour(
        sampleMemorizeSection,
        { hasMemorizedItems: false },
        { switchToMemorize: vi.fn() }
      );
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(5);
    });

    it('starts with 5 steps when hasMemorizedItems is true', () => {
      const mf = document.createElement('button');
      mf.id = TOUR_FILTER_MEMORIZE_ID;
      document.body.appendChild(mf);
      service.startMemorizeHelpSectionTour(
        sampleMemorizeSection,
        { hasMemorizedItems: true },
        { switchToMemorize: vi.fn() }
      );
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(5);
    });

    it('targets sample table when listView is table and passages exist', () => {
      const mf = document.createElement('button');
      mf.id = TOUR_FILTER_MEMORIZE_ID;
      document.body.appendChild(mf);
      const table = document.createElement('div');
      table.id = TOUR_MEMORIZE_SAMPLE_TABLE_ID;
      document.body.appendChild(table);

      service.startMemorizeHelpSectionTour(
        sampleMemorizeSection,
        { hasMemorizedItems: true, listView: 'table' },
        { switchToMemorize: vi.fn() }
      );

      const config = vi.mocked(driver).mock.calls[0][0];
      const passageStep = config?.steps?.[3];
      const el =
        typeof passageStep?.element === 'function'
          ? passageStep.element()
          : null;
      expect(el).toBe(table);
      expect(passageStep?.popover?.title).toBe('Passage list');
    });

    it('targets sample card when listView is cards and passages exist', () => {
      const mf = document.createElement('button');
      mf.id = TOUR_FILTER_MEMORIZE_ID;
      document.body.appendChild(mf);
      const card = document.createElement('div');
      card.id = TOUR_MEMORIZE_SAMPLE_CARD_ID;
      document.body.appendChild(card);

      service.startMemorizeHelpSectionTour(
        sampleMemorizeSection,
        { hasMemorizedItems: true, listView: 'cards' },
        { switchToMemorize: vi.fn() }
      );

      const config = vi.mocked(driver).mock.calls[0][0];
      const passageStep = config?.steps?.[3];
      const el =
        typeof passageStep?.element === 'function'
          ? passageStep.element()
          : null;
      expect(el).toBe(card);
      expect(passageStep?.popover?.title).toBe('Passage cards');
    });

    it('falls back to table when cards layout was preferred but only table is in the DOM', () => {
      const mf = document.createElement('button');
      mf.id = TOUR_FILTER_MEMORIZE_ID;
      document.body.appendChild(mf);
      const table = document.createElement('div');
      table.id = TOUR_MEMORIZE_SAMPLE_TABLE_ID;
      document.body.appendChild(table);

      service.startMemorizeHelpSectionTour(
        sampleMemorizeSection,
        { hasMemorizedItems: true, listView: 'cards' },
        { switchToMemorize: vi.fn() }
      );

      const config = vi.mocked(driver).mock.calls[0][0];
      const passageStep = config?.steps?.[3];
      const el =
        typeof passageStep?.element === 'function'
          ? passageStep.element()
          : null;
      expect(el).toBe(table);

      const title = document.createElement('div');
      const description = document.createElement('div');
      passageStep?.popover?.onPopoverRender?.(
        {
          wrapper: document.createElement('div'),
          arrow: document.createElement('div'),
          title,
          description,
          footer: document.createElement('div'),
          progress: document.createElement('div'),
          previousButton: document.createElement('button'),
          nextButton: document.createElement('button'),
          closeButton: document.createElement('button'),
        },
        {
          config: config!,
          state: {} as any,
          driver: {} as any,
        }
      );
      expect(title.innerHTML).toBe('Passage list');
      expect(description.innerHTML).toContain('Sort by');
    });

    it('falls back to card when table layout was preferred but only card is in the DOM', () => {
      const mf = document.createElement('button');
      mf.id = TOUR_FILTER_MEMORIZE_ID;
      document.body.appendChild(mf);
      const card = document.createElement('div');
      card.id = TOUR_MEMORIZE_SAMPLE_CARD_ID;
      document.body.appendChild(card);

      service.startMemorizeHelpSectionTour(
        sampleMemorizeSection,
        { hasMemorizedItems: true, listView: 'table' },
        { switchToMemorize: vi.fn() }
      );

      const config = vi.mocked(driver).mock.calls[0][0];
      const passageStep = config?.steps?.[3];
      const el =
        typeof passageStep?.element === 'function'
          ? passageStep.element()
          : null;
      expect(el).toBe(card);

      const title = document.createElement('div');
      const description = document.createElement('div');
      passageStep?.popover?.onPopoverRender?.(
        {
          wrapper: document.createElement('div'),
          arrow: document.createElement('div'),
          title,
          description,
          footer: document.createElement('div'),
          progress: document.createElement('div'),
          previousButton: document.createElement('button'),
          nextButton: document.createElement('button'),
          closeButton: document.createElement('button'),
        },
        {
          config: config!,
          state: {} as any,
          driver: {} as any,
        }
      );
      expect(title.innerHTML).toBe('Passage cards');
      expect(description.innerHTML).toContain('Learning');
    });

    it('step 0 onNext runs switchToMemorize then refresh and moveNext', () => {
      const mf = document.createElement('button');
      mf.id = TOUR_FILTER_MEMORIZE_ID;
      document.body.appendChild(mf);
      const switchToMemorize = vi.fn();
      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );
      vi.useFakeTimers();
      service.startMemorizeHelpSectionTour(
        sampleMemorizeSection,
        { hasMemorizedItems: false },
        { switchToMemorize }
      );
      const config = vi.mocked(driver).mock.calls[0][0];
      const hook = config?.steps?.[0]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![0]!, {
        config: config!,
        state: {} as any,
        driver: { refresh, moveNext } as any,
      });
      expect(switchToMemorize).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(250);
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('startPrayerEncouragementTour', () => {
    const sampleEncouragementSection = {
      title: 'Prayer Encouragement (Pray For)',
      description: 'Encourage others by marking when you pray',
    };

    it('does not call driver when Current filter tile is missing', () => {
      service.startPrayerEncouragementTour(
        sampleEncouragementSection,
        { hasCommunityPrayer: false },
        { switchToCurrent: vi.fn() }
      );
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts with 2 steps when hasCommunityPrayer is false', () => {
      const cur = document.createElement('button');
      cur.id = TOUR_FILTER_CURRENT_ID;
      document.body.appendChild(cur);
      service.startPrayerEncouragementTour(
        sampleEncouragementSection,
        { hasCommunityPrayer: false },
        { switchToCurrent: vi.fn() }
      );
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(2);
      expect(config?.steps?.[1]?.element).toBeUndefined();
    });

    it('starts with 3 steps when hasCommunityPrayer is true', () => {
      const cur = document.createElement('button');
      cur.id = TOUR_FILTER_CURRENT_ID;
      document.body.appendChild(cur);
      service.startPrayerEncouragementTour(
        sampleEncouragementSection,
        { hasCommunityPrayer: true },
        { switchToCurrent: vi.fn() }
      );
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(3);
      expect(config?.steps?.[2]?.element).toBeUndefined();
    });

    it('step 0 onNext runs switchToCurrent then refresh and moveNext', () => {
      const cur = document.createElement('button');
      cur.id = TOUR_FILTER_CURRENT_ID;
      document.body.appendChild(cur);
      const switchToCurrent = vi.fn();
      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );
      vi.useFakeTimers();
      service.startPrayerEncouragementTour(
        sampleEncouragementSection,
        { hasCommunityPrayer: false },
        { switchToCurrent }
      );
      const config = vi.mocked(driver).mock.calls[0][0];
      const hook = config?.steps?.[0]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![0]!, {
        config: config!,
        state: {} as any,
        driver: { refresh, moveNext } as any,
      });
      expect(switchToCurrent).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(250);
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('startSearchPrayersTour', () => {
    const sampleSearchSection = { title: 'Searching Prayers', description: 'Find prayers using search' };

    it('does not call driver when search input is missing', () => {
      service.startSearchPrayersTour(sampleSearchSection);
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts with 2 steps; second step is popover-only', () => {
      const input = document.createElement('input');
      input.id = TOUR_PRAYER_SEARCH_ID;
      document.body.appendChild(input);
      service.startSearchPrayersTour(sampleSearchSection);
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(2);
      expect(config?.steps?.[0]?.element).toBeDefined();
      expect(config?.steps?.[1]?.element).toBeUndefined();
    });
  });

  describe('startFilteringHelpSectionTour', () => {
    const switchToPrompts = vi.fn();

    const filteringSection = {
      id: 'help_filtering',
      title: 'Filtering Prayers',
      description: 'Filter and sort your prayers',
      icon: '',
      order: 6,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      content: [
        {
          subtitle: 'Filter Options',
          text: 'Use filters: "Current" shows active, "Answered" shows answered ones, "Total" shows all, "Prompts" displays cards, and "Personal" shows private.',
          examples: [] as string[],
        },
        { subtitle: 'Personal Prayers Filter', text: 'Personal help body.', examples: [] },
        { subtitle: 'Finding Archived Prayers', text: 'Total help body.', examples: [] },
        { subtitle: 'Search Across All Filters', text: 'Search help body.', examples: [] },
      ],
    };

    it('does not call driver when Current filter element is missing', () => {
      service.startFilteringHelpSectionTour(filteringSection as any, {
        switchToCurrent,
        switchToAnswered,
        switchToTotal,
        switchToPrompts,
        switchToPersonal: switchToPersonalFilter,
      });
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts tour when Current filter exists', () => {
      const cur = document.createElement('button');
      cur.id = TOUR_FILTER_CURRENT_ID;
      document.body.appendChild(cur);
      service.startFilteringHelpSectionTour(filteringSection as any, {
        switchToCurrent,
        switchToAnswered,
        switchToTotal,
        switchToPrompts,
        switchToPersonal: switchToPersonalFilter,
      });
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('startPersonalPrayersHelpSectionTour', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }))
      );
    });

    const sampleSection = { title: 'Personal Prayers', description: 'Manage private prayers' };
    const handsOnHooks = {
      switchToPersonalFilter: vi.fn(),
      openPrayerForm: vi.fn(),
      markForCheck: vi.fn(),
      fillWalkthroughPrayerFor: vi.fn(),
      fillWalkthroughDescription: vi.fn(),
      ensureWalkthroughPersonalSelected: vi.fn(),
      fillWalkthroughCategory: vi.fn(),
      submitWalkthroughPrayerForm: vi.fn(),
      openWalkthroughPersonalEdit: vi.fn(),
      closeWalkthroughPersonalEdit: vi.fn(),
      clickWalkthroughAddUpdate: vi.fn(),
      narrowToWalkthroughCategoryFilter: vi.fn(),
      deleteWalkthroughTestPrayer: vi.fn(),
    };

    it('does not call driver when Request button is missing', () => {
      const tile = document.createElement('button');
      tile.id = TOUR_FILTER_PERSONAL_ID;
      document.body.appendChild(tile);
      service.startPersonalPrayersHelpSectionTour(sampleSection, handsOnHooks);
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts hands-on walkthrough when Request and Personal filter exist (17 steps)', () => {
      const req = document.createElement('button');
      req.id = TOUR_REQUEST_BTN_MOBILE_ID;
      document.body.appendChild(req);
      const tile = document.createElement('button');
      tile.id = TOUR_FILTER_PERSONAL_ID;
      document.body.appendChild(tile);
      service.startPersonalPrayersHelpSectionTour(sampleSection, handsOnHooks);
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(17);
      expect(config?.steps?.[0]?.element).toBeUndefined();
    });
  });

  function stubWideMatchMedia(wide: boolean) {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: wide, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );
  }

  function mountEl(id: string, tag = 'button'): HTMLElement {
    const el = document.createElement(tag);
    el.id = id;
    document.body.appendChild(el);
    return el;
  }

  function resolveStepElements(config: { steps?: Array<{ element?: unknown }> } | undefined, indices: number[]) {
    for (const i of indices) {
      const el = config?.steps?.[i]?.element;
      if (typeof el === 'function') {
        (el as () => HTMLElement)();
      }
    }
  }

  function fireStepNext(
    config: { steps?: Array<{ popover?: { onNextClick?: (...args: unknown[]) => void } }> } | undefined,
    stepIndex: number,
    driverApi?: { refresh: ReturnType<typeof vi.fn>; moveNext: ReturnType<typeof vi.fn>; destroy?: ReturnType<typeof vi.fn> }
  ) {
    const refresh = driverApi?.refresh ?? vi.fn();
    const moveNext = driverApi?.moveNext ?? vi.fn();
    const destroy = driverApi?.destroy ?? vi.fn();
    const hook = config?.steps?.[stepIndex]?.popover?.onNextClick;
    hook?.(document.body, config!.steps![stepIndex]!, {
      config: config!,
      state: {} as never,
      driver: { refresh, moveNext, destroy } as never,
    });
    return { refresh, moveNext, destroy };
  }

  function mountSettingsGear(wide = true) {
    mountEl(wide ? TOUR_SETTINGS_BTN_DESKTOP_ID : TOUR_SETTINGS_BTN_MOBILE_ID);
    stubWideMatchMedia(wide);
  }

  function settingsTourHooks() {
    return {
      openSettings: vi.fn(),
      closeSettings: vi.fn(),
      markForCheck: vi.fn(),
    };
  }

  function mountPresentationDom() {
    mountEl(TOUR_PRESENTATION_TOOLBAR_ID, 'div');
    mountEl(TOUR_PRESENTATION_PREV_ID);
    mountEl(TOUR_PRESENTATION_PLAY_ID);
    mountEl(TOUR_PRESENTATION_NEXT_ID);
    mountEl(TOUR_PRESENTATION_SETTINGS_BTN_ID);
    mountEl(TOUR_PRESENTATION_EXIT_ID);
    mountEl(TOUR_PRESENTATION_SETTINGS_MODAL_ID, 'div');
    mountEl(TOUR_PRESENTATION_SETTING_THEME_ID, 'div');
    mountEl(TOUR_PRESENTATION_SETTING_SMART_ID, 'div');
    mountEl(TOUR_PRESENTATION_SETTING_DURATION_ID, 'div');
    mountEl(TOUR_PRESENTATION_SETTING_CONTENT_TYPE_ID, 'div');
    mountEl(TOUR_PRESENTATION_SETTING_RANDOMIZE_ID, 'div');
    mountEl(TOUR_PRESENTATION_SETTING_TIME_FILTER_ID, 'div');
    mountEl(TOUR_PRESENTATION_SETTING_STATUS_ID, 'div');
    mountEl(TOUR_PRESENTATION_SETTING_TIMER_ID, 'div');
  }

  describe('full guided tour utilities', () => {
    it('setFullGuidedTourProgress emits current/total and clears when total < 1', () => {
      const values: Array<{ current: number; total: number } | null> = [];
      const sub = service.fullGuidedTourProgress$.subscribe((v) => values.push(v));
      service.setFullGuidedTourProgress(2, 5);
      service.setFullGuidedTourProgress(99, 0);
      sub.unsubscribe();
      expect(values).toEqual([null, { current: 2, total: 5 }, null]);
    });

    it('clearFullGuidedTourProgress sets progress to null', () => {
      service.setFullGuidedTourProgress(1, 4);
      service.clearFullGuidedTourProgress();
      let latest: { current: number; total: number } | null = { current: -1, total: -1 };
      const sub = service.fullGuidedTourProgress$.subscribe((v) => {
        latest = v;
      });
      sub.unsubscribe();
      expect(latest).toBeNull();
    });

    it('clearFullGuidedTourNavigationState removes queue and full-chain presentation payload', () => {
      sessionStorage.setItem(FULL_GUIDED_TOUR_QUEUE_KEY, '["help_a"]');
      sessionStorage.setItem(
        PRESENTATION_HELP_TOUR_SESSION_KEY,
        JSON.stringify({ fullGuidedTourFromFullChain: true, title: 't' })
      );
      service.clearFullGuidedTourNavigationState();
      expect(sessionStorage.getItem(FULL_GUIDED_TOUR_QUEUE_KEY)).toBeNull();
      expect(sessionStorage.getItem(PRESENTATION_HELP_TOUR_SESSION_KEY)).toBeNull();
    });

    it('clearFullGuidedTourNavigationState keeps presentation payload when not full-chain', () => {
      sessionStorage.setItem(
        PRESENTATION_HELP_TOUR_SESSION_KEY,
        JSON.stringify({ fullGuidedTourFromFullChain: false, title: 'solo' })
      );
      service.clearFullGuidedTourNavigationState();
      expect(sessionStorage.getItem(PRESENTATION_HELP_TOUR_SESSION_KEY)).toContain('solo');
    });

    it('interruptGuidedTours clears navigation, progress, and active driver', () => {
      sessionStorage.setItem(FULL_GUIDED_TOUR_QUEUE_KEY, '[]');
      service.setFullGuidedTourProgress(0, 3);
      mountEl(TOUR_REQUEST_BTN_DESKTOP_ID);
      stubWideMatchMedia(true);
      service.startNewPrayerRequestTour(sampleHelp, { openPrayerForm });
      const destroy = vi.mocked(driver).mock.results[0]?.value.destroy as ReturnType<typeof vi.fn>;
      service.interruptGuidedTours();
      expect(sessionStorage.getItem(FULL_GUIDED_TOUR_QUEUE_KEY)).toBeNull();
      let progress: { current: number; total: number } | null = { current: 0, total: 1 };
      const sub = service.fullGuidedTourProgress$.subscribe((v) => {
        progress = v;
      });
      sub.unsubscribe();
      expect(progress).toBeNull();
      expect(destroy).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('queueTourFinishedCallback runs on programmatic tour end in sectionAdvance mode', () => {
      vi.useFakeTimers();
      const onFinished = vi.fn();
      service.queueTourFinishedCallback(onFinished);
      mountEl(TOUR_ADD_UPDATE_BTN_ID);
      let savedConfig: Parameters<typeof driver>[0] | undefined;
      vi.mocked(driver).mockImplementation((cfg) => {
        savedConfig = cfg;
        const inst = {
          drive: vi.fn(),
          destroy: vi.fn(() => {
            savedConfig?.onDestroyed?.(undefined, undefined, {
              config: savedConfig!,
              state: { activeIndex: (savedConfig?.steps?.length ?? 1) - 1 } as never,
              driver: inst as never,
            });
          }),
          refresh: vi.fn(),
          moveNext: vi.fn(),
        };
        return inst as ReturnType<typeof driver>;
      });
      service.startUpdatingPrayerTour(sampleUpdatingHelp, { includeAnonymousUpdateStep: false });
      const config = savedConfig!;
      const last = (config?.steps?.length ?? 1) - 1;
      const hook = config?.steps?.[last]?.popover?.onNextClick;
      hook?.(document.body, config!.steps![last]!, {
        config: config!,
        state: { activeIndex: last } as never,
        driver: { destroy: vi.fn() } as never,
      });
      vi.runAllTimers();
      expect(onFinished).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('queueTourFinishedCallback(null) turns sectionAdvance off', () => {
      service.queueTourFinishedCallback(vi.fn());
      service.queueTourFinishedCallback(null);
      mountEl(TOUR_ADD_UPDATE_BTN_ID);
      const onFinished = vi.fn();
      service.startUpdatingPrayerTour(sampleUpdatingHelp);
      const config = vi.mocked(driver).mock.calls[0][0];
      const last = (config?.steps?.length ?? 1) - 1;
      config?.onDestroyed?.(undefined, undefined, {
        config: config!,
        state: { activeIndex: last } as never,
        driver: {} as never,
      });
      expect(onFinished).not.toHaveBeenCalled();
    });
  });

  describe('startFullGuidedTourWelcome', () => {
    it('sets progress when totalSteps >= 2', () => {
      service.startFullGuidedTourWelcome(vi.fn(), { totalSteps: 4 });
      let latest: { current: number; total: number } | null = null;
      const sub = service.fullGuidedTourProgress$.subscribe((v) => {
        latest = v;
      });
      sub.unsubscribe();
      expect(latest).toEqual({ current: 0, total: 4 });
    });

    it('Begin onNextClick destroys driver and runs onBegin via onDestroyed', () => {
      const onBegin = vi.fn();
      let savedConfig: Parameters<typeof driver>[0] | undefined;
      vi.mocked(driver).mockImplementation((cfg) => {
        savedConfig = cfg;
        return {
          drive: vi.fn(),
          destroy: vi.fn(),
          refresh: vi.fn(),
          moveNext: vi.fn(),
        } as ReturnType<typeof driver>;
      });
      vi.useFakeTimers();
      service.startFullGuidedTourWelcome(onBegin, { totalSteps: 2 });
      const beginHook = savedConfig?.steps?.[0]?.popover?.onNextClick;
      beginHook?.(document.body, savedConfig!.steps![0]!, {
        config: savedConfig!,
        state: {} as never,
        driver: { destroy: vi.fn() } as never,
      });
      savedConfig?.onDestroyed?.(undefined, undefined, {
        config: savedConfig!,
        state: { activeIndex: 0 } as never,
        driver: {} as never,
      });
      vi.runAllTimers();
      expect(onBegin).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('onCloseClick and onDestroyStarted clear progress without running onBegin', () => {
      const onBegin = vi.fn();
      let savedConfig: Parameters<typeof driver>[0] | undefined;
      vi.mocked(driver).mockImplementation((cfg) => {
        savedConfig = cfg;
        return {
          drive: vi.fn(),
          destroy: vi.fn(),
          refresh: vi.fn(),
          moveNext: vi.fn(),
        } as ReturnType<typeof driver>;
      });
      service.setFullGuidedTourProgress(0, 3);
      sessionStorage.setItem(FULL_GUIDED_TOUR_QUEUE_KEY, '["help_x"]');
      service.startFullGuidedTourWelcome(onBegin);
      savedConfig?.steps?.[0]?.popover?.onCloseClick?.(document.body, savedConfig!.steps![0]!, {
        config: savedConfig!,
        state: {} as never,
        driver: { destroy: vi.fn() } as never,
      });
      let progress: { current: number; total: number } | null = { current: 0, total: 1 };
      const sub = service.fullGuidedTourProgress$.subscribe((v) => {
        progress = v;
      });
      sub.unsubscribe();
      expect(progress).toBeNull();
      expect(sessionStorage.getItem(FULL_GUIDED_TOUR_QUEUE_KEY)).toBeNull();
      expect(onBegin).not.toHaveBeenCalled();
    });
  });

  describe('startFullGuidedTourClosing', () => {
    it('starts closing popover and sets progress on last step', () => {
      service.startFullGuidedTourClosing({ totalSteps: 5 });
      expect(driver).toHaveBeenCalledTimes(1);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(1);
      expect(config?.showProgress).toBe(false);
      let latest: { current: number; total: number } | null = null;
      const sub = service.fullGuidedTourProgress$.subscribe((v) => {
        latest = v;
      });
      sub.unsubscribe();
      expect(latest).toEqual({ current: 4, total: 5 });
    });

    it('onDestroyed clears progress', () => {
      service.startFullGuidedTourClosing({ totalSteps: 3 });
      const config = vi.mocked(driver).mock.calls[0][0];
      service.setFullGuidedTourProgress(2, 3);
      config?.onDestroyed?.(undefined, undefined, {
        config: config!,
        state: { activeIndex: 0 } as never,
        driver: {} as never,
      });
      let progress: { current: number; total: number } | null = { current: 0, total: 1 };
      const sub = service.fullGuidedTourProgress$.subscribe((v) => {
        progress = v;
      });
      sub.unsubscribe();
      expect(progress).toBeNull();
    });
  });

  describe('startCreatingPrayersHelpSectionTour', () => {
    const section = { title: 'Creating Prayers', description: 'Community requests and updates' };
    const hooks = () => ({
      openPrayerForm: vi.fn(),
      closePrayerForm: vi.fn(),
      switchToCurrent: vi.fn(),
    });

    it('does not call driver when Request button is missing', () => {
      service.startCreatingPrayersHelpSectionTour(section, hooks());
      expect(driver).not.toHaveBeenCalled();
    });

    it('starts with 11 steps by default and 12 with anonymous step', () => {
      mountEl(TOUR_REQUEST_BTN_DESKTOP_ID);
      stubWideMatchMedia(true);
      service.startCreatingPrayersHelpSectionTour(section, hooks());
      expect(vi.mocked(driver).mock.calls[0][0]?.steps?.length).toBe(11);
      service.startCreatingPrayersHelpSectionTour(section, hooks(), { includeAnonymousUpdateStep: true });
      expect(vi.mocked(driver).mock.calls[1][0]?.steps?.length).toBe(12);
      vi.unstubAllGlobals();
    });

    it('step hooks open form, switch to current, and kill tour on last step', () => {
      mountEl(TOUR_REQUEST_BTN_MOBILE_ID);
      mountEl(TOUR_ADD_UPDATE_BTN_ID);
      mountEl(TOUR_PRAYER_SUBMIT_REQUEST_ID);
      mountEl(TOUR_PRAYER_UPDATE_SUBMIT_ID);
      stubWideMatchMedia(false);
      const h = hooks();
      const refresh = vi.fn();
      const moveNext = vi.fn();
      vi.mocked(driver).mockImplementation(
        () =>
          ({
            drive: vi.fn(),
            destroy: vi.fn(),
            refresh,
            moveNext,
          }) as ReturnType<typeof driver>
      );
      vi.useFakeTimers();
      service.startCreatingPrayersHelpSectionTour(section, h);
      const config = vi.mocked(driver).mock.calls[0][0];
      resolveStepElements(config, [0, 5, 7]);
      fireStepNext(config, 0, { refresh, moveNext });
      expect(h.openPrayerForm).toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      const bridgeIdx = 6;
      fireStepNext(config, bridgeIdx, { refresh, moveNext });
      expect(h.closePrayerForm).toHaveBeenCalled();
      expect(h.switchToCurrent).toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      const addUpdateIdx = 7;
      const addBtn = document.getElementById(TOUR_ADD_UPDATE_BTN_ID)!;
      const clickSpy = vi.spyOn(addBtn, 'click');
      fireStepNext(config, addUpdateIdx, { refresh, moveNext });
      expect(clickSpy).toHaveBeenCalled();
      vi.advanceTimersByTime(250);
      const last = (config?.steps?.length ?? 1) - 1;
      fireStepNext(config, last);
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  describe('settings help section tours', () => {
    const section = { title: 'Section', description: 'Section description' };

    it('startPrintingHelpSectionTour: no gear → no driver; with DOM resolves elements and hooks', () => {
      service.startPrintingHelpSectionTour(section, settingsTourHooks());
      expect(driver).not.toHaveBeenCalled();

      mountSettingsGear(true);
      mountEl(TOUR_SETTINGS_PRINT_ROW_ID, 'div');
      mountEl(TOUR_SETTINGS_PRINT_PRAYERS_ID);
      mountEl(TOUR_SETTINGS_PRINT_PROMPTS_ID);
      mountEl(TOUR_SETTINGS_PRINT_PERSONAL_ID);
      const h = settingsTourHooks();
      vi.useFakeTimers();
      service.startPrintingHelpSectionTour(section, h);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(7);
      resolveStepElements(config, [0, 1, 2, 3, 4, 5, 6]);
      const { refresh, moveNext } = fireStepNext(config, 0);
      expect(h.openSettings).toHaveBeenCalled();
      vi.advanceTimersByTime(420);
      expect(h.markForCheck).toHaveBeenCalled();
      expect(refresh).toHaveBeenCalled();
      expect(moveNext).toHaveBeenCalled();
      fireStepNext(config, 6);
      expect(h.closeSettings).toHaveBeenCalled();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('startEmailSubscriptionHelpSectionTour', () => {
      mountSettingsGear(false);
      mountEl(TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID, 'div');
      const h = settingsTourHooks();
      vi.useFakeTimers();
      service.startEmailSubscriptionHelpSectionTour(section, h);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(4);
      resolveStepElements(config, [0, 1]);
      fireStepNext(config, 0);
      vi.advanceTimersByTime(420);
      fireStepNext(config, 3);
      expect(h.closeSettings).toHaveBeenCalled();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('startPrayerRemindersHelpSectionTour', () => {
      mountSettingsGear(true);
      const cur = document.createElement('div');
      cur.id = TOUR_FILTER_CURRENT_ID;
      document.body.appendChild(cur);
      mountEl(TOUR_PRAYER_REMINDER_BELL_ID, 'button');
      mountEl(TOUR_SETTINGS_PRAYER_REMINDERS_ID, 'div');
      mountEl(TOUR_SETTINGS_PRAYER_REMINDER_CONTROLS_ID, 'div');
      const h = { ...settingsTourHooks(), switchToCurrent: vi.fn() };
      vi.useFakeTimers();
      service.startPrayerRemindersHelpSectionTour(
        section,
        { hasReminderBellTarget: true },
        h
      );
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(7);
      resolveStepElements(config, [0, 1, 2, 3, 4]);
      fireStepNext(config, 0);
      vi.advanceTimersByTime(200);
      fireStepNext(config, 2);
      vi.advanceTimersByTime(420);
      fireStepNext(config, 6);
      expect(h.closeSettings).toHaveBeenCalled();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('startPrayerRemindersHelpSectionTour omits bell step when anchor is missing', () => {
      mountSettingsGear(true);
      const cur = document.createElement('div');
      cur.id = TOUR_FILTER_CURRENT_ID;
      document.body.appendChild(cur);
      mountEl(TOUR_SETTINGS_PRAYER_REMINDERS_ID, 'div');
      mountEl(TOUR_SETTINGS_PRAYER_REMINDER_CONTROLS_ID, 'div');
      const h = { ...settingsTourHooks(), switchToCurrent: vi.fn() };
      service.startPrayerRemindersHelpSectionTour(
        section,
        { hasReminderBellTarget: true },
        h
      );
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(6);
      vi.unstubAllGlobals();
    });

    it('startFeedbackHelpSectionTour', () => {
      mountSettingsGear(true);
      mountEl(TOUR_SETTINGS_FEEDBACK_SECTION_ID, 'div');
      mountEl(TOUR_SETTINGS_FEEDBACK_TYPE_ID, 'div');
      mountEl(TOUR_SETTINGS_FEEDBACK_DETAILS_ID, 'div');
      const h = settingsTourHooks();
      vi.useFakeTimers();
      service.startFeedbackHelpSectionTour(section, h);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(6);
      resolveStepElements(config, [0, 1, 2, 3]);
      fireStepNext(config, 0);
      vi.advanceTimersByTime(420);
      fireStepNext(config, 5);
      expect(h.closeSettings).toHaveBeenCalled();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('startAppSettingsHelpSectionTour walks all settings anchors', () => {
      mountSettingsGear(true);
      mountEl(TOUR_SETTINGS_PRINT_ROW_ID, 'div');
      mountEl(TOUR_SETTINGS_THEME_ID, 'div');
      mountEl(TOUR_SETTINGS_TEXT_SIZE_ID, 'div');
      mountEl(TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID, 'div');
      mountEl(TOUR_SETTINGS_PUSH_ID, 'div');
      mountEl(TOUR_SETTINGS_BADGES_ID, 'div');
      mountEl(TOUR_SETTINGS_PRAYER_ENCOURAGEMENT_ID, 'div');
      mountEl(TOUR_SETTINGS_DEFAULT_VIEW_ID, 'div');
      mountEl(TOUR_SETTINGS_MEMORIZATION_STRICT_MODE_ID, 'div');
      mountEl(TOUR_SETTINGS_PRAYER_REMINDERS_ID, 'div');
      mountEl(TOUR_SETTINGS_FEEDBACK_SECTION_ID, 'div');
      const h = settingsTourHooks();
      vi.useFakeTimers();
      service.startAppSettingsHelpSectionTour(section, h);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(14);
      resolveStepElements(config, Array.from({ length: 14 }, (_, i) => i));
      fireStepNext(config, 0);
      vi.advanceTimersByTime(420);
      fireStepNext(config, 13);
      expect(h.closeSettings).toHaveBeenCalled();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  describe('startPresentationModePrayButtonPreludeTour', () => {
    const section = { title: 'Presentation', description: 'Group prayer mode' };
    const hooks = () => ({
      continueToPresentation: vi.fn(),
      markForCheck: vi.fn(),
    });

    it('with Pray button highlights element and continues on Next', () => {
      mountEl(TOUR_PRAYER_MODE_DESKTOP_ID);
      stubWideMatchMedia(true);
      const h = hooks();
      service.startPresentationModePrayButtonPreludeTour(section, h);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(1);
      resolveStepElements(config, [0]);
      fireStepNext(config, 0);
      expect(h.continueToPresentation).toHaveBeenCalled();
      expect(h.markForCheck).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('without Pray button uses popover-only step', () => {
      const h = hooks();
      service.startPresentationModePrayButtonPreludeTour(section, h);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.[0]?.element).toBeUndefined();
      fireStepNext(config, 0);
      expect(h.continueToPresentation).toHaveBeenCalled();
    });

    it('fullGuidedTourPrelude close clears navigation state', () => {
      sessionStorage.setItem(FULL_GUIDED_TOUR_QUEUE_KEY, '["help_presentation"]');
      service.setFullGuidedTourProgress(1, 4);
      mountEl(TOUR_PRAYER_MODE_MOBILE_ID);
      stubWideMatchMedia(false);
      let savedConfig: Parameters<typeof driver>[0] | undefined;
      vi.mocked(driver).mockImplementation((cfg) => {
        savedConfig = cfg;
        return {
          drive: vi.fn(),
          destroy: vi.fn(),
          refresh: vi.fn(),
          moveNext: vi.fn(),
        } as ReturnType<typeof driver>;
      });
      service.startPresentationModePrayButtonPreludeTour(section, hooks(), { fullGuidedTourPrelude: true });
      savedConfig?.steps?.[0]?.popover?.onCloseClick?.(document.body, savedConfig!.steps![0]!, {
        config: savedConfig!,
        state: {} as never,
        driver: { destroy: vi.fn() } as never,
      });
      expect(sessionStorage.getItem(FULL_GUIDED_TOUR_QUEUE_KEY)).toBeNull();
      let progress: { current: number; total: number } | null = { current: 0, total: 1 };
      const sub = service.fullGuidedTourProgress$.subscribe((v) => {
        progress = v;
      });
      sub.unsubscribe();
      expect(progress).toBeNull();
      vi.unstubAllGlobals();
    });
  });

  describe('startPresentationModeTour', () => {
    const section = { title: 'Presentation mode', description: 'Shared screen prayer' };

    it('does not call driver when toolbar is missing', () => {
      service.startPresentationModeTour(section, {
        openSettings: vi.fn(),
        closeSettings: vi.fn(),
        exitPresentation: vi.fn(),
        markForCheck: vi.fn(),
      });
      expect(driver).not.toHaveBeenCalled();
    });

    it('walks toolbar and settings steps; exit step runs hooks', () => {
      mountPresentationDom();
      const h = {
        openSettings: vi.fn(),
        closeSettings: vi.fn(),
        exitPresentation: vi.fn(),
        markForCheck: vi.fn(),
        persistFullGuidedTourQueue: vi.fn(),
        onFullGuidedTourInterrupted: vi.fn(),
      };
      vi.useFakeTimers();
      service.startPresentationModeTour(section, h);
      const config = vi.mocked(driver).mock.calls[0][0];
      expect(config?.steps?.length).toBe(17);
      resolveStepElements(config, Array.from({ length: 17 }, (_, i) => i));
      fireStepNext(config, 5);
      vi.advanceTimersByTime(380);
      expect(h.openSettings).toHaveBeenCalled();
      const closeSettingsIdx = 15;
      fireStepNext(config, closeSettingsIdx);
      vi.advanceTimersByTime(280);
      expect(h.closeSettings).toHaveBeenCalled();
      config?.onDestroyed?.(undefined, undefined, {
        config: config!,
        state: { activeIndex: 5 } as never,
        driver: {} as never,
      });
      expect(h.onFullGuidedTourInterrupted).toHaveBeenCalled();
      fireStepNext(config, 16);
      expect(h.persistFullGuidedTourQueue).toHaveBeenCalled();
      expect(h.exitPresentation).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});

describe('parseFullGuidedTourQueue', () => {
  it('parses legacy closing sentinel array', () => {
    expect(parseFullGuidedTourQueue(JSON.stringify([FULL_GUIDED_TOUR_CLOSING_SENTINEL]))).toEqual({
      kind: 'legacy_closing',
    });
  });

  it('parses legacy section ids', () => {
    expect(parseFullGuidedTourQueue(JSON.stringify(['help_a', 'help_b']))).toEqual({
      kind: 'legacy_section_ids',
      ids: ['help_a', 'help_b'],
    });
  });

  it('parses v1 closing', () => {
    expect(parseFullGuidedTourQueue(JSON.stringify({ v: 1, mode: 'closing', totalSteps: 5 }))).toEqual({
      kind: 'closing',
      totalSteps: 5,
    });
  });

  it('parses v1 resume with resume index', () => {
    expect(
      parseFullGuidedTourQueue(
        JSON.stringify({
          v: 1,
          totalSteps: 8,
          ids: ['help_settings'],
          resumeStartGlobalSectionIndex: 6,
        })
      )
    ).toEqual({
      kind: 'resume',
      ids: ['help_settings'],
      totalSteps: 8,
      resumeStartGlobalSectionIndex: 6,
    });
  });

  it('returns empty for invalid json', () => {
    expect(parseFullGuidedTourQueue('not json')).toEqual({ kind: 'empty' });
  });
});
