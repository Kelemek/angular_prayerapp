import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SimpleChange, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresentationSettingsModalComponent } from './presentation-settings-modal.component';
import { PresentationSettingsFiltersPanelComponent } from './presentation-settings-filters-panel.component';

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
      expect(component.theme).toBe('system');
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
    const path = join(componentDir, url);
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
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
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#tour-presentation-settings-modal')).toBeTruthy();
    expect(el.textContent).toContain('Presentation Settings');
    expect(el.querySelector('app-presentation-settings-theme-section')).toBeTruthy();
    expect(el.querySelector('app-presentation-settings-filters-panel')).toBeTruthy();
    expect(el.querySelector('app-presentation-settings-display-section')).toBeTruthy();
    expect(el.querySelector('app-presentation-settings-timer-section')).toBeTruthy();
  });

  it('emits close when the shell close button is clicked', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    const closeButton = fixture.nativeElement.querySelector(
      '[aria-label="Close settings"]'
    ) as HTMLButtonElement;
    closeButton.click();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('forwards themeChange from the theme section', () => {
    const emitted: string[] = [];
    component.themeChange.subscribe((value) => emitted.push(value));

    const lightButton = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ).find((el: Element) => el.textContent?.includes('Light')) as HTMLButtonElement;
    lightButton.click();

    expect(emitted).toEqual(['light']);
  });
});
