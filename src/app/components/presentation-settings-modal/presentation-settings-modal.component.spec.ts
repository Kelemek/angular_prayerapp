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

    it('should have contentTypes default to prayers', () => {
      expect(component.contentTypes).toEqual(['prayers']);
    });

    it('should have randomize default to false', () => {
      expect(component.randomize).toBe(false);
    });

    it('should have loop default to true', () => {
      expect(component.loop).toBe(true);
    });

    it('should have timeFilter default to all', () => {
      expect(component.timeFilter).toBe('all');
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

    it('should have localContentTypes default to prayers', () => {
      expect(component.localContentTypes).toEqual(['prayers']);
    });

    it('should have localRandomize default to false', () => {
      expect(component.localRandomize).toBe(false);
    });

    it('should have localLoop default to true', () => {
      expect(component.localLoop).toBe(true);
    });

    it('should have localTimeFilter default to all', () => {
      expect(component.localTimeFilter).toBe('all');
    });

    it('should have localPrayerTimerMinutes default to 10', () => {
      expect(component.localPrayerTimerMinutes).toBe(10);
    });

    it('should have showSmartModeDetails default to false', () => {
      expect(component.showSmartModeDetails).toBe(false);
    });

    it('should have showContentTypeDropdown default to false', () => {
      expect(component.showContentTypeDropdown).toBe(false);
    });

    it('should have showTimeFilterDropdown default to false', () => {
      expect(component.showTimeFilterDropdown).toBe(false);
    });

    it('should have showStatusDropdown default to false', () => {
      expect(component.showStatusDropdown).toBe(false);
    });

    it('should have pendingContentTypes default to empty array', () => {
      expect(component.pendingContentTypes).toEqual([]);
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

    it('should call initPendingContentTypes', () => {
      const initSpy = vi.spyOn(component, 'initPendingContentTypes');
      component.ngOnInit();
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('should sync local state when becoming visible', () => {
      component.visible = true;
      const syncSpy = vi.spyOn(component, 'syncLocalState');
      component.ngOnChanges({
        visible: {
          previousValue: false,
          currentValue: true,
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      expect(syncSpy).toHaveBeenCalled();
    });

    it('should flush open dropdowns when becoming hidden', () => {
      component.visible = false;
      component.showContentTypeDropdown = true;
      component.pendingContentTypes = ['prompts'];
      component.localContentTypes = ['prayers'];
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');
      component.ngOnChanges({
        visible: {
          previousValue: true,
          currentValue: false,
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      expect(emitSpy).toHaveBeenCalledWith(['prompts']);
      expect(component.showContentTypeDropdown).toBe(false);
    });

    it('should reset dropdown state when becoming visible', () => {
      component.visible = true;
      component.showStatusDropdown = true;
      component.ngOnChanges({
        visible: {
          previousValue: false,
          currentValue: true,
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      expect(component.showStatusDropdown).toBe(false);
    });
  });

  describe('syncLocalState', () => {
    it('should sync all input properties to local state', () => {
      component.smartMode = false;
      component.displayDuration = 20;
      component.contentTypes = ['prompts'];
      component.randomize = true;
      component.loop = false;
      component.timeFilter = 'week';
      component.prayerTimerMinutes = 15;

      component.syncLocalState();

      expect(component.localSmartMode).toBe(false);
      expect(component.localDisplayDuration).toBe(20);
      expect(component.localContentTypes).toEqual(['prompts']);
      expect(component.localRandomize).toBe(true);
      expect(component.localLoop).toBe(false);
      expect(component.localTimeFilter).toBe('week');
      expect(component.localPrayerTimerMinutes).toBe(15);
    });

    it('should handle empty contentTypes as all content types', () => {
      component.contentTypes = [];
      component.syncLocalState();
      expect(component.localContentTypes).toEqual([]);
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

    it('should initialize with all statuses when both filters are inactive', () => {
      component.statusFiltersCurrent = false;
      component.statusFiltersAnswered = false;
      component.initPendingStatusFilter();
      expect(component.pendingStatusFilter).toEqual([
        'current',
        'answered',
        'archived',
      ]);
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

  describe('content type dropdown', () => {
    it('should open content type dropdown', () => {
      component.toggleContentTypeDropdown();
      expect(component.showContentTypeDropdown).toBe(true);
    });

    it('should close content type dropdown when toggled again', () => {
      component.showContentTypeDropdown = true;
      component.pendingContentTypes = ['prompts'];
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');
      component.toggleContentTypeDropdown();
      expect(component.showContentTypeDropdown).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith(['prompts']);
    });

    it('should apply pending content types and emit change', () => {
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');
      component.pendingContentTypes = ['prompts', 'personal'];
      component.applyContentTypeFilter();
      expect(component.localContentTypes).toEqual(['prompts', 'personal']);
      expect(emitSpy).toHaveBeenCalledWith(['prompts', 'personal']);
      expect(component.showContentTypeDropdown).toBe(false);
    });

    it('should not emit when pending content types are unchanged', () => {
      component.localContentTypes = ['prompts'];
      component.pendingContentTypes = ['prompts'];
      component.showContentTypeDropdown = true;
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');

      component.applyContentTypeFilter();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.showContentTypeDropdown).toBe(false);
    });

    it('should initialize pending selections as all types when local is empty', () => {
      component.localContentTypes = [];

      component.initPendingContentTypes();

      expect(component.pendingContentTypes).toEqual([
        'prayers',
        'prompts',
        'personal',
      ]);
    });

    it('should select all available content types when All Content Types is chosen', () => {
      component.pendingContentTypes = ['prompts'];

      component.selectAllPendingContentTypes();

      expect(component.pendingContentTypes).toEqual([
        'prayers',
        'prompts',
        'personal',
      ]);
      expect(component.isAllPendingContentTypesSelected()).toBe(true);
    });

    it('should emit empty array when all available content types are selected', () => {
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');
      component.localContentTypes = ['prompts'];
      component.pendingContentTypes = ['prayers', 'prompts', 'personal'];

      component.applyContentTypeFilter();

      expect(emitSpy).toHaveBeenCalledWith([]);
      expect(component.localContentTypes).toEqual([]);
    });

    it('should not emit when all types are already selected via empty local state', () => {
      component.localContentTypes = [];
      component.pendingContentTypes = ['prayers', 'prompts', 'personal'];
      component.showContentTypeDropdown = true;
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');

      component.applyContentTypeFilter();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.showContentTypeDropdown).toBe(false);
    });

    it('should not uncheck the last pending content type', () => {
      component.pendingContentTypes = ['prompts'];

      component.togglePendingContentType('prompts');

      expect(component.pendingContentTypes).toEqual(['prompts']);
    });

    it('should toggle pending content type selections', () => {
      component.pendingContentTypes = ['prompts'];
      component.togglePendingContentType('personal');
      expect(component.pendingContentTypes).toEqual(['prompts', 'personal']);
      component.togglePendingContentType('prompts');
      expect(component.pendingContentTypes).toEqual(['personal']);
    });

    it('should return All Content Types when none selected', () => {
      component.localContentTypes = [];
      expect(component.getContentTypeDisplay()).toBe('All Content Types');
    });

    it('should return display labels for multiple content types', () => {
      component.localContentTypes = ['prayers', 'prompts'];
      expect(component.getContentTypeDisplay()).toBe('Prayers, Prompts');
    });

    it('should close other dropdowns when opening content type', () => {
      component.showTimeFilterDropdown = true;
      component.showStatusDropdown = true;
      component.toggleContentTypeDropdown();
      expect(component.showTimeFilterDropdown).toBe(false);
      expect(component.showStatusDropdown).toBe(false);
      expect(component.showContentTypeDropdown).toBe(true);
    });
  });

  describe('time filter dropdown', () => {
    it('should open time filter dropdown', () => {
      component.toggleTimeFilterDropdown();
      expect(component.showTimeFilterDropdown).toBe(true);
    });

    it('should select time filter and emit change', () => {
      const emitSpy = vi.spyOn(component.timeFilterChange, 'emit');
      component.selectTimeFilter('year');
      expect(component.localTimeFilter).toBe('year');
      expect(emitSpy).toHaveBeenCalledWith('year');
      expect(component.showTimeFilterDropdown).toBe(false);
    });

    it('should return display label for time filter', () => {
      component.localTimeFilter = 'week';
      expect(component.getTimeFilterDisplay()).toBe('Last Week');
    });

    it('should close other dropdowns when opening time filter', () => {
      component.showContentTypeDropdown = true;
      component.toggleTimeFilterDropdown();
      expect(component.showContentTypeDropdown).toBe(false);
      expect(component.showTimeFilterDropdown).toBe(true);
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
      
      expect(applySpy).toHaveBeenCalled();
      expect(component.showStatusDropdown).toBe(false);
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

    it('should not uncheck the last pending status', () => {
      component.pendingStatusFilter = ['answered'];
      component.togglePendingStatus('answered');
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

  describe('selectAllPendingStatus', () => {
    it('should select all available status filters', () => {
      component.pendingStatusFilter = ['current'];

      component.selectAllPendingStatus();

      expect(component.pendingStatusFilter).toEqual([
        'current',
        'answered',
        'archived',
      ]);
      expect(component.isAllPendingStatusSelected()).toBe(true);
    });

    it('should apply as all statuses when every option is selected', () => {
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');
      component.statusFiltersCurrent = true;
      component.statusFiltersAnswered = true;
      component.pendingStatusFilter = ['current', 'answered', 'archived'];

      component.applyStatusFilter();

      expect(emitSpy).toHaveBeenCalledWith({ current: false, answered: false });
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
      component.statusFiltersCurrent = false;
      component.statusFiltersAnswered = false;
      component.pendingStatusFilter = ['current', 'answered'];
      
      component.applyStatusFilter();
      
      expect(emitSpy).toHaveBeenCalledWith({ current: true, answered: true });
    });

    it('should close the dropdown', () => {
      component.showStatusDropdown = true;
      component.statusFiltersCurrent = false;
      component.statusFiltersAnswered = true;
      component.pendingStatusFilter = ['current'];
      
      component.applyStatusFilter();
      
      expect(component.showStatusDropdown).toBe(false);
    });

    it('should emit false for missing statuses', () => {
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');
      component.statusFiltersCurrent = false;
      component.statusFiltersAnswered = true;
      component.pendingStatusFilter = ['current'];
      
      component.applyStatusFilter();
      
      expect(emitSpy).toHaveBeenCalledWith({ current: true, answered: false });
    });

    it('should handle empty filter', () => {
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');
      component.statusFiltersCurrent = true;
      component.statusFiltersAnswered = true;
      component.pendingStatusFilter = [];
      
      component.applyStatusFilter();
      
      expect(emitSpy).toHaveBeenCalledWith({ current: false, answered: false });
    });

    it('should not emit when pending status filters are unchanged', () => {
      component.statusFiltersCurrent = true;
      component.statusFiltersAnswered = false;
      component.pendingStatusFilter = ['current'];
      component.showStatusDropdown = true;
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');

      component.applyStatusFilter();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.showStatusDropdown).toBe(false);
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

  describe('closeModal', () => {
    it('applies open dropdowns before closing', () => {
      const closeSpy = vi.spyOn(component.close, 'emit');
      const applyContentSpy = vi.spyOn(component, 'applyContentTypeFilter');
      const applyStatusSpy = vi.spyOn(component, 'applyStatusFilter');
      component.showContentTypeDropdown = true;
      component.showStatusDropdown = true;
      component.pendingContentTypes = ['prompts'];
      component.pendingStatusFilter = ['answered'];

      component.closeModal();

      expect(applyContentSpy).toHaveBeenCalled();
      expect(applyStatusSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('onSettingsBodyPointerDown', () => {
    it('applies open dropdowns when clicking outside dropdown UI', () => {
      const applyContentSpy = vi.spyOn(component, 'applyContentTypeFilter');
      component.showContentTypeDropdown = true;
      component.pendingContentTypes = ['prompts'];
      const outside = document.createElement('div');

      component.onSettingsBodyPointerDown({ target: outside } as MouseEvent);

      expect(applyContentSpy).toHaveBeenCalled();
      expect(component.showContentTypeDropdown).toBe(false);
    });

    it('does nothing when clicking inside a dropdown panel', () => {
      const applyContentSpy = vi.spyOn(component, 'applyContentTypeFilter');
      component.showContentTypeDropdown = true;
      const panel = document.createElement('div');
      panel.setAttribute('data-settings-dropdown-panel', 'content-type');

      component.onSettingsBodyPointerDown({ target: panel } as MouseEvent);

      expect(applyContentSpy).not.toHaveBeenCalled();
    });
  });

  describe('categories dropdown', () => {
    beforeEach(() => {
      component.availableCategories = ['Current', 'Answered'];
      component.localSelectedCategories = [];
    });

    it('should initialize pending categories as all when none are selected', () => {
      component.initPendingCategories();
      expect(component.pendingCategories).toEqual(['Current', 'Answered']);
    });

    it('should apply all categories as an empty selection', () => {
      const emitSpy = vi.spyOn(component.categoriesChange, 'emit');
      component.localSelectedCategories = ['Current'];
      component.pendingCategories = ['Current', 'Answered'];

      component.applyCategoryFilter();

      expect(emitSpy).toHaveBeenCalledWith([]);
      expect(component.localSelectedCategories).toEqual([]);
    });

    it('should not uncheck the last pending category', () => {
      component.pendingCategories = ['Current'];
      component.togglePendingCategory('Current');
      expect(component.pendingCategories).toEqual(['Current']);
    });

    it('should return All Categories when none are selected', () => {
      expect(component.getCategoriesDisplay()).toBe('All Categories');
    });
  });

  describe('prompt categories dropdown', () => {
    beforeEach(() => {
      component.availablePromptCategories = ['Church', 'Family'];
      component.localSelectedPromptCategories = [];
    });

    it('should initialize pending prompt categories as all when none are selected', () => {
      component.initPendingPromptCategories();
      expect(component.pendingPromptCategories).toEqual(['Church', 'Family']);
    });

    it('should apply all prompt categories as an empty selection', () => {
      const emitSpy = vi.spyOn(component.promptCategoriesChange, 'emit');
      component.localSelectedPromptCategories = ['Church'];
      component.pendingPromptCategories = ['Church', 'Family'];

      component.applyPromptCategoryFilter();

      expect(emitSpy).toHaveBeenCalledWith([]);
      expect(component.localSelectedPromptCategories).toEqual([]);
    });

    it('should not uncheck the last pending prompt category', () => {
      component.pendingPromptCategories = ['Church'];
      component.togglePendingPromptCategory('Church');
      expect(component.pendingPromptCategories).toEqual(['Church']);
    });

    it('should return All Categories when none are selected', () => {
      expect(component.getPromptCategoriesDisplay()).toBe('All Categories');
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

    it('should have contentTypesChange event emitter', () => {
      expect(component.contentTypesChange).toBeTruthy();
    });

    it('should have randomizeChange event emitter', () => {
      expect(component.randomizeChange).toBeTruthy();
    });

    it('should have loopChange event emitter', () => {
      expect(component.loopChange).toBeTruthy();
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

  });
});
