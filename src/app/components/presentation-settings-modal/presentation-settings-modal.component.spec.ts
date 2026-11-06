import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SimpleChange, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresentationSettingsModalComponent } from './presentation-settings-modal.component';
import { PresentationSettingsFiltersPanelComponent } from './presentation-settings-filters-panel.component';
import { ThemeService } from '../../services/theme.service';

describe('PresentationSettingsModalComponent', () => {
  let component: PresentationSettingsModalComponent;

  beforeEach(() => {
    component = new PresentationSettingsModalComponent();
    component.filtersPanel = new PresentationSettingsFiltersPanelComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('should have visible default to false', () => {
      expect(component.visible).toBe(false);
    });
    it('should have theme default to system', () => {
      expect(component.theme).toEqual({ family: 'default', mode: 'system' });
    });
    it('should have contentTypes default to prayers', () => {
      expect(component.contentTypes).toEqual(['prayers']);
    });
    it('should have hasMappedList default to false', () => {
      expect(component.hasMappedList).toBe(false);
    });
  });

  describe('closeModal', () => {
    it('applies open dropdowns before closing', () => {
      const closeSpy = vi.spyOn(component.close, 'emit');
      const applyContentSpy = vi.spyOn(component.filtersPanel!.contentTypeField, 'apply');
      component.filtersPanel!.contentTypeField.showDropdown = true;
      component.filtersPanel!.pendingContentTypes = ['prompts'];
      component.closeModal();
      expect(applyContentSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges visible', () => {
    it('applies open dropdowns when visible becomes false without closeModal', () => {
      const applyContentSpy = vi.spyOn(component.filtersPanel!.contentTypeField, 'apply');
      component.filtersPanel!.contentTypeField.showDropdown = true;
      component.filtersPanel!.pendingContentTypes = ['prompts'];
      component.ngOnChanges({
        visible: new SimpleChange(true, false, false),
      });
      expect(applyContentSpy).toHaveBeenCalled();
    });
  });

  describe('onSettingsBodyPointerDown', () => {
    it('delegates to filters panel', () => {
      const spy = vi.spyOn(component.filtersPanel!, 'onBodyPointerDown');
      const event = { target: document.createElement('div') } as MouseEvent;
      component.onSettingsBodyPointerDown(event);
      expect(spy).toHaveBeenCalledWith(event);
    });
  });

  describe('Event Emitters', () => {
    it('should have close event emitter', () => {
      expect(component.close).toBeTruthy();
    });
    it('should have themeChange event emitter', () => {
      expect(component.themeChange).toBeTruthy();
    });
    it('should have contentTypesChange event emitter', () => {
      expect(component.contentTypesChange).toBeTruthy();
    });
  });
});

describe('PresentationSettingsModalComponent (template)', () => {
  const componentDir = dirname(fileURLToPath(import.meta.url));

  function readComponentResource(url: string): string {
    const relative = url.replace(/^\.\//, '');
    const paths = [
      join(componentDir, url),
      join(componentDir, '..', 'theme-select-dropdown', relative),
    ];
    for (const path of paths) {
      if (existsSync(path)) {
        return readFileSync(path, 'utf-8');
      }
    }
    throw new Error(`Component resource not found: ${url}`);
  }

  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<PresentationSettingsModalComponent>;
  let component: PresentationSettingsModalComponent;

  beforeEach(async () => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    await TestBed.configureTestingModule({
      imports: [PresentationSettingsModalComponent],
      providers: [
        { provide: ThemeService, useValue: { getResolvedTheme: () => 'light' as const } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  });

  it('does not render when visible is false', () => {
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('#tour-presentation-settings-modal')
    ).toBeNull();
  });

  it('renders the modal shell and all settings sections', () => {
    const panel = document.querySelector('#tour-presentation-settings-modal');
    expect(panel).toBeTruthy();
    expect(document.body.textContent).toContain('Presentation Settings');
    expect(panel?.querySelector('app-presentation-settings-theme-section')).toBeTruthy();
    expect(panel?.querySelector('app-presentation-settings-filters-panel')).toBeTruthy();
    expect(panel?.querySelector('app-presentation-settings-display-section')).toBeTruthy();
    expect(panel?.querySelector('app-presentation-settings-timer-section')).toBeTruthy();
  });

  it('emits close when the shell close button is clicked', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    const closeButton = document.querySelector(
      '[aria-label="Close settings"]'
    ) as HTMLButtonElement;
    closeButton.click();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('forwards themeChange from the theme section', () => {
    const emitted: { family: string; mode: string }[] = [];
    component.themeChange.subscribe((value) => emitted.push(value));

    const panel = document.querySelector('#tour-presentation-settings-modal');
    const familyTrigger = panel?.querySelector(
      '[data-settings-dropdown-trigger="presentation-theme-family"]',
    ) as HTMLButtonElement;
    expect(familyTrigger).toBeTruthy();
    familyTrigger.click();
    fixture.detectChanges();

    const christmas = Array.from(
      panel?.querySelectorAll('[role="option"]') ?? [],
    ).find((el: Element) => el.textContent?.includes('Christmas')) as HTMLElement;
    christmas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toEqual([{ family: 'christmas', mode: 'system' }]);
  });
});
