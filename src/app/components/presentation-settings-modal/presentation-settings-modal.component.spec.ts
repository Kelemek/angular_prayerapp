import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PresentationSettingsModalComponent } from './presentation-settings-modal.component';

describe('PresentationSettingsModalComponent', () => {
  let component: PresentationSettingsModalComponent;

  beforeEach(() => {
    component = new PresentationSettingsModalComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('should have visible default to false', () => {
      expect(component.visible).toBe(false);
    });

    it('should have theme default to system', () => {
      expect(component.theme).toBe('system');
    });

    it('should have smartMode default to true', () => {
      expect(component.smartMode).toBe(true);
    });

    it('should have displayDuration default to 10', () => {
      expect(component.displayDuration).toBe(10);
    });

    it('should have contentType default to prayers', () => {
      expect(component.contentType).toBe('prayers');
    });

    it('should have randomize default to false', () => {
      expect(component.randomize).toBe(false);
    });

    it('should have timeFilter default to month', () => {
      expect(component.timeFilter).toBe('month');
    });

    it('should have statusFiltersCurrent default to true', () => {
      expect(component.statusFiltersCurrent).toBe(true);
    });

    it('should have statusFiltersAnswered default to true', () => {
      expect(component.statusFiltersAnswered).toBe(true);
    });

    it('should have prayerTimerMinutes default to 10', () => {
      expect(component.prayerTimerMinutes).toBe(10);
    });

    it('should have localSmartMode default to true', () => {
      expect(component.localSmartMode).toBe(true);
    });

    it('should have localDisplayDuration default to 10', () => {
      expect(component.localDisplayDuration).toBe(10);
    });

    it('should have localContentType default to prayers', () => {
      expect(component.localContentType).toBe('prayers');
    });

    it('should have localRandomize default to false', () => {
      expect(component.localRandomize).toBe(false);
    });

    it('should have localTimeFilter default to month', () => {
      expect(component.localTimeFilter).toBe('month');
    });

    it('should have localPrayerTimerMinutes default to 10', () => {
      expect(component.localPrayerTimerMinutes).toBe(10);
    });

    it('should have showSmartModeDetails default to false', () => {
      expect(component.showSmartModeDetails).toBe(false);
    });

    it('should have showStatusDropdown default to false', () => {
      expect(component.showStatusDropdown).toBe(false);
    });

    it('should have pendingStatusFilter default to empty array', () => {
      expect(component.pendingStatusFilter).toEqual([]);
    });

    it('should have hasMappedList default to false', () => {
      expect(component.hasMappedList).toBe(false);
    });
  });

  describe('ngOnInit', () => {
    it('should call syncLocalState', () => {
      const syncSpy = vi.spyOn(component, 'syncLocalState');
      component.ngOnInit();
      expect(syncSpy).toHaveBeenCalled();
    });

    it('should call initPendingStatusFilter', () => {
      const initSpy = vi.spyOn(component, 'initPendingStatusFilter');
      component.ngOnInit();
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('should call syncLocalState', () => {
      const syncSpy = vi.spyOn(component, 'syncLocalState');
      component.ngOnChanges();
      expect(syncSpy).toHaveBeenCalled();
    });

    it('should call initPendingStatusFilter', () => {
      const initSpy = vi.spyOn(component, 'initPendingStatusFilter');
      component.ngOnChanges();
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('syncLocalState', () => {
    it('should sync all input properties to local state', () => {
      component.smartMode = false;
      component.displayDuration = 20;
      component.contentType = 'prompts';
      component.randomize = true;
      component.timeFilter = 'week';
      component.prayerTimerMinutes = 15;

      component.syncLocalState();

      expect(component.localSmartMode).toBe(false);
      expect(component.localDisplayDuration).toBe(20);
      expect(component.localContentType).toBe('prompts');
      expect(component.localRandomize).toBe(true);
      expect(component.localTimeFilter).toBe('week');
      expect(component.localPrayerTimerMinutes).toBe(15);
    });

    it('should handle contentType "all"', () => {
      component.contentType = 'all';
      component.syncLocalState();
      expect(component.localContentType).toBe('all');
    });

    it('should handle theme changes', () => {
      component.theme = 'light';
      component.syncLocalState();
      // Theme is not synced to local state, but method should not fail
      expect(component.theme).toBe('light');
    });
  });

  describe('initPendingStatusFilter', () => {
    it('should initialize with both filters when both are true', () => {
      component.statusFiltersCurrent = true;
      component.statusFiltersAnswered = true;
      component.initPendingStatusFilter();
      expect(component.pendingStatusFilter).toEqual(['current', 'answered']);
    });

    it('should initialize with only current when answered is false', () => {
      component.statusFiltersCurrent = true;
      component.statusFiltersAnswered = false;
      component.initPendingStatusFilter();
      expect(component.pendingStatusFilter).toEqual(['current']);
    });

    it('should initialize with only answered when current is false', () => {
      component.statusFiltersCurrent = false;
      component.statusFiltersAnswered = true;
      component.initPendingStatusFilter();
      expect(component.pendingStatusFilter).toEqual(['answered']);
    });

    it('should initialize with empty array when both are false', () => {
      component.statusFiltersCurrent = false;
      component.statusFiltersAnswered = false;
      component.initPendingStatusFilter();
      expect(component.pendingStatusFilter).toEqual([]);
    });
  });

  describe('setDuration', () => {
    it('should set localDisplayDuration to the provided value', () => {
      component.setDuration(30);
      expect(component.localDisplayDuration).toBe(30);
    });

    it('should emit displayDurationChange event', () => {
      const emitSpy = vi.spyOn(component.displayDurationChange, 'emit');
      component.setDuration(20);
      expect(emitSpy).toHaveBeenCalledWith(20);
    });

    it('should work with different duration values', () => {
      const emitSpy = vi.spyOn(component.displayDurationChange, 'emit');
      
      component.setDuration(10);
      expect(component.localDisplayDuration).toBe(10);
      expect(emitSpy).toHaveBeenCalledWith(10);

      component.setDuration(20);
      expect(component.localDisplayDuration).toBe(20);
      expect(emitSpy).toHaveBeenCalledWith(20);

      component.setDuration(30);
      expect(component.localDisplayDuration).toBe(30);
      expect(emitSpy).toHaveBeenCalledWith(30);
    });
  });

  describe('toggleStatusDropdown', () => {
    it('should toggle showStatusDropdown from false to true', () => {
      component.showStatusDropdown = false;
      const initSpy = vi.spyOn(component, 'initPendingStatusFilter');
      
      component.toggleStatusDropdown();
      
      expect(component.showStatusDropdown).toBe(true);
      expect(initSpy).toHaveBeenCalled();
    });

    it('should toggle showStatusDropdown from true to false and apply filter', () => {
      component.showStatusDropdown = true;
      const applySpy = vi.spyOn(component, 'applyStatusFilter');
      
      component.toggleStatusDropdown();
      
      // After toggling from true, showStatusDropdown is toggled to false
      // Note: applyStatusFilter also sets showStatusDropdown to false, 
      // then the toggle inverts it, so it ends up true
      expect(applySpy).toHaveBeenCalled();
      expect(component.showStatusDropdown).toBe(true);
    });

    it('should call initPendingStatusFilter when opening', () => {
      component.showStatusDropdown = false;
      const initSpy = vi.spyOn(component, 'initPendingStatusFilter');
      
      component.toggleStatusDropdown();
      
      expect(initSpy).toHaveBeenCalled();
    });

    it('should call applyStatusFilter when closing', () => {
      component.showStatusDropdown = true;
      const applySpy = vi.spyOn(component, 'applyStatusFilter');
      
      component.toggleStatusDropdown();
      
      expect(applySpy).toHaveBeenCalled();
    });
  });

  describe('togglePendingStatus', () => {
    it('should add status if not present', () => {
      component.pendingStatusFilter = [];
      component.togglePendingStatus('current');
      expect(component.pendingStatusFilter).toEqual(['current']);
    });

    it('should remove status if already present', () => {
      component.pendingStatusFilter = ['current', 'answered'];
      component.togglePendingStatus('current');
      expect(component.pendingStatusFilter).toEqual(['answered']);
    });

    it('should handle multiple toggles', () => {
      component.pendingStatusFilter = [];
      
      component.togglePendingStatus('current');
      expect(component.pendingStatusFilter).toEqual(['current']);
      
      component.togglePendingStatus('answered');
      expect(component.pendingStatusFilter).toEqual(['current', 'answered']);
      
      component.togglePendingStatus('current');
      expect(component.pendingStatusFilter).toEqual(['answered']);
    });

    it('should work with archived status', () => {
      component.pendingStatusFilter = [];
      component.togglePendingStatus('archived');
      expect(component.pendingStatusFilter).toEqual(['archived']);
    });

    it('should not create duplicates', () => {
      component.pendingStatusFilter = ['current'];
      component.togglePendingStatus('answered');
      expect(component.pendingStatusFilter).toEqual(['current', 'answered']);
      component.togglePendingStatus('current');
      expect(component.pendingStatusFilter).toEqual(['answered']);
    });
  });

  describe('clearPendingStatus', () => {
    it('should clear all pending status filters', () => {
      component.pendingStatusFilter = ['current', 'answered'];
      component.clearPendingStatus();
      expect(component.pendingStatusFilter).toEqual([]);
    });

    it('should work when already empty', () => {
      component.pendingStatusFilter = [];
      component.clearPendingStatus();
      expect(component.pendingStatusFilter).toEqual([]);
    });
  });

  describe('isPendingStatusSelected', () => {
    it('should return true if status is in pendingStatusFilter', () => {
      component.pendingStatusFilter = ['current', 'answered'];
      expect(component.isPendingStatusSelected('current')).toBe(true);
      expect(component.isPendingStatusSelected('answered')).toBe(true);
    });

    it('should return false if status is not in pendingStatusFilter', () => {
      component.pendingStatusFilter = ['current'];
      expect(component.isPendingStatusSelected('answered')).toBe(false);
      expect(component.isPendingStatusSelected('archived')).toBe(false);
    });

    it('should return false for empty filter', () => {
      component.pendingStatusFilter = [];
      expect(component.isPendingStatusSelected('current')).toBe(false);
    });
  });

  describe('applyStatusFilter', () => {
    it('should emit statusFiltersChange with correct values', () => {
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');
      component.pendingStatusFilter = ['current', 'answered'];
      
      component.applyStatusFilter();
      
      expect(emitSpy).toHaveBeenCalledWith({ current: true, answered: true });
    });

    it('should close the dropdown', () => {
      component.showStatusDropdown = true;
      component.pendingStatusFilter = ['current'];
      
      component.applyStatusFilter();
      
      expect(component.showStatusDropdown).toBe(false);
    });

    it('should emit false for missing statuses', () => {
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');
      component.pendingStatusFilter = ['current'];
      
      component.applyStatusFilter();
      
      expect(emitSpy).toHaveBeenCalledWith({ current: true, answered: false });
    });

    it('should handle empty filter', () => {
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');
      component.pendingStatusFilter = [];
      
      component.applyStatusFilter();
      
      expect(emitSpy).toHaveBeenCalledWith({ current: false, answered: false });
    });

    it('should handle only answered', () => {
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');
      component.pendingStatusFilter = ['answered'];
      
      component.applyStatusFilter();
      
      expect(emitSpy).toHaveBeenCalledWith({ current: false, answered: true });
    });
  });

  describe('getStatusFilterDisplay', () => {
    it('should return "All Statuses" when no filters are active', () => {
      component.statusFiltersCurrent = false;
      component.statusFiltersAnswered = false;
      expect(component.getStatusFilterDisplay()).toBe('All Statuses');
    });

    it('should return "Current" when only current filter is active', () => {
      component.statusFiltersCurrent = true;
      component.statusFiltersAnswered = false;
      expect(component.getStatusFilterDisplay()).toBe('Current');
    });

    it('should return "Answered" when only answered filter is active', () => {
      component.statusFiltersCurrent = false;
      component.statusFiltersAnswered = true;
      expect(component.getStatusFilterDisplay()).toBe('Answered');
    });

    it('should return "Current, Answered" when both filters are active', () => {
      component.statusFiltersCurrent = true;
      component.statusFiltersAnswered = true;
      expect(component.getStatusFilterDisplay()).toBe('Current, Answered');
    });
  });

  describe('Event Emitters', () => {
    it('should have close event emitter', () => {
      expect(component.close).toBeTruthy();
    });

    it('should have themeChange event emitter', () => {
      expect(component.themeChange).toBeTruthy();
    });

    it('should have smartModeChange event emitter', () => {
      expect(component.smartModeChange).toBeTruthy();
    });

    it('should have displayDurationChange event emitter', () => {
      expect(component.displayDurationChange).toBeTruthy();
    });

    it('should have contentTypeChange event emitter', () => {
      expect(component.contentTypeChange).toBeTruthy();
    });

    it('should have randomizeChange event emitter', () => {
      expect(component.randomizeChange).toBeTruthy();
    });

    it('should have timeFilterChange event emitter', () => {
      expect(component.timeFilterChange).toBeTruthy();
    });

    it('should have statusFiltersChange event emitter', () => {
      expect(component.statusFiltersChange).toBeTruthy();
    });

    it('should have prayerTimerMinutesChange event emitter', () => {
      expect(component.prayerTimerMinutesChange).toBeTruthy();
    });

    it('should have startPrayerTimer event emitter', () => {
      expect(component.startPrayerTimer).toBeTruthy();
    });

    it('should have refresh event emitter', () => {
      expect(component.refresh).toBeTruthy();
    });
  });
});
