import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresentationSettingsFiltersPanelComponent } from './presentation-settings-filters-panel.component';

describe('PresentationSettingsFiltersPanelComponent', () => {
  let component: PresentationSettingsFiltersPanelComponent;

  beforeEach(() => {
    component = new PresentationSettingsFiltersPanelComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('should have showContentTypeDropdown default to false', () => {
      expect(component.contentTypeField.showDropdown).toBe(false);
    });
    it('should have pendingContentTypes default to empty array', () => {
      expect(component.contentTypeField.pending).toEqual([]);
    });
    it('should have hasMappedList default to false', () => {
      expect(component.hasMappedList).toBe(false);
    });
  });

  describe('ngOnInit', () => {
    it('should call syncFromInputs', () => {
      const syncSpy = vi.spyOn(component, 'syncFromInputs');
      component.ngOnInit();
      expect(syncSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('should sync when becoming visible', () => {
      component.modalVisible = true;
      const syncSpy = vi.spyOn(component, 'syncFromInputs');
      component.ngOnChanges({
        modalVisible: {
          previousValue: false,
          currentValue: true,
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      expect(syncSpy).toHaveBeenCalled();
    });

    it('should flush open dropdowns when becoming hidden', () => {
      component.modalVisible = false;
      component.contentTypeField.showDropdown = true;
      component.contentTypeField.pending = ['prompts'];
      component.localContentTypes = ['prayers'];
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');
      component.ngOnChanges({
        modalVisible: {
          previousValue: true,
          currentValue: false,
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      expect(emitSpy).toHaveBeenCalledWith(['prompts']);
      expect(component.contentTypeField.showDropdown).toBe(false);
    });
  });

  describe('onBodyPointerDown', () => {
    it('applies open dropdowns when clicking outside dropdown UI', () => {
      const applyContentSpy = vi.spyOn(component.contentTypeField, 'apply');
      component.contentTypeField.showDropdown = true;
      component.contentTypeField.pending = ['prompts'];
      const outside = document.createElement('div');
      component.onBodyPointerDown({ target: outside } as MouseEvent);
      expect(applyContentSpy).toHaveBeenCalled();
      expect(component.contentTypeField.showDropdown).toBe(false);
    });

    it('does nothing when clicking inside a dropdown panel', () => {
      const applyContentSpy = vi.spyOn(component.contentTypeField, 'apply');
      component.contentTypeField.showDropdown = true;
      const panel = document.createElement('div');
      panel.setAttribute('data-settings-dropdown-panel', 'content-type');

      component.onBodyPointerDown({ target: panel } as MouseEvent);

      expect(applyContentSpy).not.toHaveBeenCalled();
    });
  });

  describe('content type dropdown', () => {
    it('should open content type dropdown', () => {
      component.contentTypeField.toggleDropdown();
      expect(component.contentTypeField.showDropdown).toBe(true);
    });

    it('should close content type dropdown when toggled again', () => {
      component.contentTypeField.showDropdown = true;
      component.contentTypeField.pending = ['prompts'];
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');
      component.contentTypeField.toggleDropdown();
      expect(component.contentTypeField.showDropdown).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith(['prompts']);
    });

    it('should apply pending content types and emit change', () => {
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');
      component.contentTypeField.pending = ['prompts', 'personal'];
      component.contentTypeField.apply();
      expect(component.localContentTypes).toEqual(['prompts', 'personal']);
      expect(emitSpy).toHaveBeenCalledWith(['prompts', 'personal']);
      expect(component.contentTypeField.showDropdown).toBe(false);
    });

    it('should not emit when pending content types are unchanged', () => {
      component.localContentTypes = ['prompts'];
      component.contentTypeField.pending = ['prompts'];
      component.contentTypeField.showDropdown = true;
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');

      component.contentTypeField.apply();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.contentTypeField.showDropdown).toBe(false);
    });

    it('should initialize pending selections as all types when local is empty', () => {
      component.localContentTypes = [];

      component.contentTypeField.initPending();

      expect(component.contentTypeField.pending).toEqual([
        'prayers',
        'prompts',
        'personal',
      ]);
    });

    it('should select all available content types when All Content Types is chosen', () => {
      component.contentTypeField.pending = ['prompts'];

      component.contentTypeField.selectAllPending();

      expect(component.contentTypeField.pending).toEqual([
        'prayers',
        'prompts',
        'personal',
      ]);
      expect(component.contentTypeField.isAllPendingSelected()).toBe(true);
    });

    it('should emit empty array when all available content types are selected', () => {
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');
      component.localContentTypes = ['prompts'];
      component.contentTypeField.pending = ['prayers', 'prompts', 'personal'];

      component.contentTypeField.apply();

      expect(emitSpy).toHaveBeenCalledWith([]);
      expect(component.localContentTypes).toEqual([]);
    });

    it('should not emit when all types are already selected via empty local state', () => {
      component.localContentTypes = [];
      component.contentTypeField.pending = ['prayers', 'prompts', 'personal'];
      component.contentTypeField.showDropdown = true;
      const emitSpy = vi.spyOn(component.contentTypesChange, 'emit');

      component.contentTypeField.apply();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.contentTypeField.showDropdown).toBe(false);
    });

    it('should not uncheck the last pending content type', () => {
      component.contentTypeField.pending = ['prompts'];

      component.contentTypeField.togglePending('prompts');

      expect(component.contentTypeField.pending).toEqual(['prompts']);
    });

    it('should toggle pending content type selections', () => {
      component.contentTypeField.pending = ['prompts'];
      component.contentTypeField.togglePending('personal');
      expect(component.contentTypeField.pending).toEqual(['prompts', 'personal']);
      component.contentTypeField.togglePending('prompts');
      expect(component.contentTypeField.pending).toEqual(['personal']);
    });

    it('should return All Content Types when none selected', () => {
      component.localContentTypes = [];
      expect(component.contentTypeField.getDisplay()).toBe('All Content Types');
    });

    it('should return display labels for multiple content types', () => {
      component.localContentTypes = ['prayers', 'prompts'];
      expect(component.contentTypeField.getDisplay()).toBe('Prayers, Prompts');
    });

    it('should close other dropdowns when opening content type', () => {
      component.timeFilterDropdown.open = true;
      component.statusField.showDropdown = true;
      component.contentTypeField.toggleDropdown();
      expect(component.timeFilterDropdown.open).toBe(false);
      expect(component.statusField.showDropdown).toBe(false);
      expect(component.contentTypeField.showDropdown).toBe(true);
    });
  });

  describe('time filter dropdown', () => {
    it('should open time filter dropdown', () => {
      component.toggleTimeFilterDropdown();
      expect(component.timeFilterDropdown.open).toBe(true);
    });

    it('should select time filter and emit change', () => {
      const emitSpy = vi.spyOn(component.timeFilterChange, 'emit');
      component.selectTimeFilter('year');
      expect(component.localTimeFilter).toBe('year');
      expect(emitSpy).toHaveBeenCalledWith('year');
      expect(component.timeFilterDropdown.open).toBe(false);
    });

    it('should return display label for time filter', () => {
      component.localTimeFilter = 'week';
      expect(component.getTimeFilterDisplay()).toBe('Last Week');
    });

    it('should close other dropdowns when opening time filter', () => {
      component.contentTypeField.showDropdown = true;
      component.toggleTimeFilterDropdown();
      expect(component.contentTypeField.showDropdown).toBe(false);
      expect(component.timeFilterDropdown.open).toBe(true);
    });
  });

  describe('prayer status dropdown', () => {
    it('opens status dropdown', () => {
      component.syncFromInputs();
      component.statusField.toggleDropdown();
      expect(component.statusField.showDropdown).toBe(true);
    });

    it('emits status apply from status field', () => {
      const emitSpy = vi.spyOn(component.statusFiltersChange, 'emit');
      component.statusFilters = { current: false, answered: false, archived: false };
      component.syncFromInputs();
      component.statusField.pending = ['current', 'answered'];
      component.statusField.apply();
      expect(emitSpy).toHaveBeenCalledWith({
        current: true,
        answered: true,
        archived: false,
      });
    });
  });

  describe('categories dropdown', () => {
    beforeEach(() => {
      component.availableCategories = ['Current', 'Answered'];
      component.localSelectedCategories = [];
    });

    it('should initialize pending categories as all when none are selected', () => {
      component.categoriesField.initPending();
      expect(component.categoriesField.pending).toEqual(['Current', 'Answered']);
    });

    it('should apply all categories as an empty selection', () => {
      const emitSpy = vi.spyOn(component.categoriesChange, 'emit');
      component.localSelectedCategories = ['Current'];
      component.categoriesField.pending = ['Current', 'Answered'];

      component.categoriesField.apply();

      expect(emitSpy).toHaveBeenCalledWith([]);
      expect(component.localSelectedCategories).toEqual([]);
    });

    it('should not uncheck the last pending category', () => {
      component.categoriesField.pending = ['Current'];
      component.categoriesField.togglePending('Current');
      expect(component.categoriesField.pending).toEqual(['Current']);
    });

    it('should return All Categories when none are selected', () => {
      expect(component.categoriesField.getDisplay()).toBe('All Categories');
    });
  });

  describe('prompt categories dropdown', () => {
    beforeEach(() => {
      component.availablePromptCategories = ['Church', 'Family'];
      component.localSelectedPromptCategories = [];
    });

    it('should initialize pending prompt categories as all when none are selected', () => {
      component.promptCategoriesField.initPending();
      expect(component.promptCategoriesField.pending).toEqual(['Church', 'Family']);
    });

    it('should apply all prompt categories as an empty selection', () => {
      const emitSpy = vi.spyOn(component.promptCategoriesChange, 'emit');
      component.localSelectedPromptCategories = ['Church'];
      component.promptCategoriesField.pending = ['Church', 'Family'];

      component.promptCategoriesField.apply();

      expect(emitSpy).toHaveBeenCalledWith([]);
      expect(component.localSelectedPromptCategories).toEqual([]);
    });

    it('should not uncheck the last pending prompt category', () => {
      component.promptCategoriesField.pending = ['Church'];
      component.promptCategoriesField.togglePending('Church');
      expect(component.promptCategoriesField.pending).toEqual(['Church']);
    });

    it('should return All Categories when none are selected', () => {
      expect(component.promptCategoriesField.getDisplay()).toBe('All Categories');
    });
  });
});

describe("PresentationSettingsFiltersPanelComponent (template)", () => {
  const componentDir = dirname(fileURLToPath(import.meta.url));

  function readComponentResource(url: string): string {
    const path = join(componentDir, url);
    if (existsSync(path)) {
      return readFileSync(path, "utf-8");
    }
    throw new Error(`Component resource not found: ${url}`);
  }

  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<PresentationSettingsFiltersPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationSettingsFiltersPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsFiltersPanelComponent);
    fixture.componentRef.setInput("contentTypes", ["prayers"]);
    fixture.componentRef.setInput("modalVisible", true);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("renders the Filters section and content type tour anchor", () => {
    expect(fixture.nativeElement.textContent).toContain("Filters");
    expect(
      fixture.nativeElement.querySelector(
        "#tour-presentation-setting-content-type"
      )
    ).toBeTruthy();
  });

  it("opens the content type dropdown from the trigger button", () => {
    const trigger = fixture.nativeElement.querySelector(
      '[data-settings-dropdown-trigger="content-type"]'
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-settings-dropdown-panel="content-type"]'
      )
    ).toBeTruthy();
  });

  it("shows personal categories when personal content is selected", () => {
    fixture.destroy();
    fixture = TestBed.createComponent(PresentationSettingsFiltersPanelComponent);
    fixture.componentRef.setInput("contentTypes", ["personal"]);
    fixture.componentRef.setInput("availableCategories", ["Current", "Answered"]);
    fixture.componentRef.setInput("modalVisible", true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        "#tour-presentation-setting-categories"
      )
    ).toBeTruthy();
  });

  it("shows prayer status and time filters for prayer content", () => {
    expect(
      fixture.nativeElement.querySelector(
        "#tour-presentation-setting-status"
      )
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector(
        "#tour-presentation-setting-time-filter"
      )
    ).toBeTruthy();
  });
});
