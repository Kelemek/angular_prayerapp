import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { driver } from 'driver.js';
import { AdminHelpDriverTourService } from './admin-help-driver-tour.service';
import { HelpDriverTourService } from './help-driver-tour.service';

vi.mock('driver.js', () => ({
  driver: vi.fn(),
}));

describe('AdminHelpDriverTourService', () => {
  let service: AdminHelpDriverTourService;
  let helpDriverTour: HelpDriverTourService;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    helpDriverTour = { interruptGuidedTours: vi.fn() } as unknown as HelpDriverTourService;
    service = new AdminHelpDriverTourService(helpDriverTour);
    vi.mocked(driver).mockReturnValue({
      drive: vi.fn(),
      destroy: vi.fn(),
      refresh: vi.fn(),
      moveNext: vi.fn(),
    } as ReturnType<typeof driver>);
  });

  afterEach(() => {
    service.destroy();
    document.body.innerHTML = '';
  });

  describe('destroy', () => {
    it('calls destroy on the active driver from startEmailSubscribersOverviewTour', () => {
      const mockDriver = { drive: vi.fn(), destroy: vi.fn(), refresh: vi.fn(), moveNext: vi.fn() };
      vi.mocked(driver).mockReturnValue(mockDriver as ReturnType<typeof driver>);
      service.startEmailSubscribersOverviewTour();
      service.destroy();
      expect(mockDriver.destroy).toHaveBeenCalled();
    });

    it('is safe when no tour has started', () => {
      expect(() => service.destroy()).not.toThrow();
    });
  });

  describe('startEmailSubscribersOverviewTour', () => {
    it('calls interruptGuidedTours and driver with steps', () => {
      service.startEmailSubscribersOverviewTour();
      expect(helpDriverTour.interruptGuidedTours).toHaveBeenCalled();
      expect(vi.mocked(driver)).toHaveBeenCalled();
      const cfg = vi.mocked(driver).mock.calls[0][0] as { steps: unknown[]; onDestroyed?: () => void };
      expect(cfg.steps.length).toBeGreaterThan(5);
      const mockDriver = vi.mocked(driver).mock.results[0].value as { drive: (n: number) => void };
      expect(mockDriver.drive).toHaveBeenCalledWith(0);
    });

    it('uses column steps when #tour-email-overview-name exists', () => {
      const anchor = document.createElement('div');
      anchor.id = 'tour-email-overview-name';
      document.body.appendChild(anchor);
      service.startEmailSubscribersOverviewTour();
      const cfg = vi.mocked(driver).mock.calls[0][0] as {
        steps: { element?: string }[];
      };
      expect(cfg.steps.some((s) => s.element === '#tour-email-overview-name')).toBe(true);
      expect(cfg.steps.some((s) => s.element === '#tour-email-overview-email')).toBe(true);
      expect(cfg.steps.some((s) => s.element === '#tour-email-subscribers-list-area')).toBe(false);
    });

    it('uses fallback list-area step when no column anchors exist', () => {
      service.startEmailSubscribersOverviewTour();
      const cfg = vi.mocked(driver).mock.calls[0][0] as {
        steps: { element?: string }[];
      };
      expect(cfg.steps.some((s) => s.element === '#tour-email-subscribers-list-area')).toBe(true);
    });

    it('adds pagination step when column anchors and #tour-email-subscribers-pagination exist', () => {
      const name = document.createElement('div');
      name.id = 'tour-email-overview-name';
      const pag = document.createElement('div');
      pag.id = 'tour-email-subscribers-pagination';
      document.body.appendChild(name);
      document.body.appendChild(pag);
      service.startEmailSubscribersOverviewTour();
      const cfg = vi.mocked(driver).mock.calls[0][0] as {
        steps: { element?: string }[];
      };
      expect(cfg.steps.some((s) => s.element === '#tour-email-subscribers-pagination')).toBe(true);
    });

    it('clears activeDriver reference via onDestroyed when driver invokes it', () => {
      let onDestroyed: (() => void) | undefined;
      vi.mocked(driver).mockImplementation((config: { onDestroyed?: () => void }) => {
        onDestroyed = config.onDestroyed;
        return {
          drive: vi.fn(),
          destroy: vi.fn(),
        } as ReturnType<typeof driver>;
      });
      service.startEmailSubscribersOverviewTour();
      expect(onDestroyed).toBeDefined();
      onDestroyed?.();
      service.destroy();
      expect(helpDriverTour.interruptGuidedTours).toHaveBeenCalled();
    });
  });

  describe('startPrayerEditorCreateTour', () => {
    it('starts driver with create-prayer steps', () => {
      service.startPrayerEditorCreateTour({
        openCreatePrayerForm: vi.fn(),
      });
      expect(helpDriverTour.interruptGuidedTours).toHaveBeenCalled();
      const cfg = vi.mocked(driver).mock.calls[0][0] as { steps: unknown[] };
      expect(cfg.steps.length).toBeGreaterThan(8);
    });

    it('invokes openCreatePrayerForm from the Create New Prayer step onNextClick', async () => {
      vi.useFakeTimers();
      const openCreatePrayerForm = vi.fn();
      service.startPrayerEditorCreateTour({ openCreatePrayerForm });
      const cfg = vi.mocked(driver).mock.calls[0][0] as {
        steps: { popover?: { onNextClick?: (a: unknown, b: unknown, c: { driver: unknown }) => void } }[];
      };
      const mockDrv = { refresh: vi.fn(), moveNext: vi.fn(), destroy: vi.fn() };
      for (const step of cfg.steps) {
        const fn = step.popover?.onNextClick;
        if (fn) {
          fn(null, null, { driver: mockDrv });
        }
      }
      await vi.runAllTimersAsync();
      expect(openCreatePrayerForm).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('startPrayerEditorManageTour', () => {
    const callbacks = {
      openEditFormForTour: vi.fn(),
      cancelEditForTour: vi.fn(),
      openAddUpdateFormForTour: vi.fn(),
      cancelAddUpdateForTour: vi.fn(),
      resetTourUiState: vi.fn(),
    };

    it('uses no-prayer steps when hasPrayerRow is false', () => {
      service.startPrayerEditorManageTour(false, callbacks);
      const cfg = vi.mocked(driver).mock.calls[0][0] as { steps: { popover?: { title?: string } }[] };
      const titles = cfg.steps.map((s) => s.popover?.title).filter(Boolean);
      expect(titles.some((t) => String(t).includes('No prayers'))).toBe(true);
    });

    it('uses full row steps when hasPrayerRow is true', () => {
      service.startPrayerEditorManageTour(true, callbacks);
      const cfg = vi.mocked(driver).mock.calls[0][0] as { steps: { element?: string }[] };
      expect(cfg.steps.some((s) => s.element === '#tour-prayer-editor-first-row')).toBe(true);
    });

    it('invokes resetTourUiState on destroy when hasPrayerRow is true', () => {
      let onDestroyed: (() => void) | undefined;
      vi.mocked(driver).mockImplementation((config: { onDestroyed?: () => void }) => {
        onDestroyed = config.onDestroyed;
        return { drive: vi.fn(), destroy: vi.fn() } as ReturnType<typeof driver>;
      });
      service.startPrayerEditorManageTour(true, callbacks);
      onDestroyed?.();
      expect(callbacks.resetTourUiState).toHaveBeenCalled();
    });

    it('invokes all popover onNextClick handlers when hasPrayerRow is true', async () => {
      vi.useFakeTimers();
      service.startPrayerEditorManageTour(true, callbacks);
      const cfg = vi.mocked(driver).mock.calls[0][0] as {
        steps: { popover?: { onNextClick?: (a: unknown, b: unknown, c: { driver: unknown }) => void } }[];
      };
      const mockDrv = { refresh: vi.fn(), moveNext: vi.fn(), destroy: vi.fn() };
      for (const step of cfg.steps) {
        const fn = step.popover?.onNextClick;
        if (fn) {
          fn(null, null, { driver: mockDrv });
        }
      }
      await vi.runAllTimersAsync();
      expect(callbacks.openEditFormForTour).toHaveBeenCalled();
      expect(callbacks.cancelEditForTour).toHaveBeenCalled();
      expect(callbacks.openAddUpdateFormForTour).toHaveBeenCalled();
      expect(callbacks.cancelAddUpdateForTour).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('startEmailSubscribersTour', () => {
    it('starts driver with the interactive subscribers tour', () => {
      service.startEmailSubscribersTour({
        openAddForm: vi.fn(),
        showPcSearchTab: vi.fn(),
      });
      expect(helpDriverTour.interruptGuidedTours).toHaveBeenCalled();
      const cfg = vi.mocked(driver).mock.calls[0][0] as { steps: unknown[] };
      expect(cfg.steps.length).toBeGreaterThan(5);
    });

    it('invokes popover onNextClick handlers for the interactive tour', async () => {
      vi.useFakeTimers();
      const cbs = {
        openAddForm: vi.fn(),
        showPcSearchTab: vi.fn(),
        runPlanningCenterSearchTourDemo: vi.fn().mockResolvedValue(undefined),
        selectTourPlanningCenterMatchFromDemoResults: vi.fn(),
        applyTourDemoPlanningCenterAdd: vi.fn(),
        clearEmailSubscribersTourDemoForm: vi.fn(),
      };
      service.startEmailSubscribersTour(cbs);
      const cfg = vi.mocked(driver).mock.calls[0][0] as {
        steps: { popover?: { onNextClick?: (a: unknown, b: unknown, c: { driver: unknown }) => void | Promise<void> } }[];
      };
      const mockDrv = { refresh: vi.fn(), moveNext: vi.fn(), destroy: vi.fn() };
      for (const step of cfg.steps) {
        const fn = step.popover?.onNextClick;
        if (fn) {
          await fn(null, null, { driver: mockDrv });
        }
      }
      await vi.runAllTimersAsync();
      expect(cbs.openAddForm).toHaveBeenCalled();
      expect(cbs.showPcSearchTab).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
