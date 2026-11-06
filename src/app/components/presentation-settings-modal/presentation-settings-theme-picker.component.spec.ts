import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresentationSettingsThemePickerComponent } from './presentation-settings-theme-picker.component';
import { ThemeService } from '../../services/theme.service';

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

describe('PresentationSettingsThemePickerComponent', () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url)),
    );
  });

  let fixture: ComponentFixture<PresentationSettingsThemePickerComponent>;
  let component: PresentationSettingsThemePickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationSettingsThemePickerComponent],
      providers: [
        { provide: ThemeService, useValue: { getResolvedTheme: () => 'light' as const } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsThemePickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('theme', { family: 'default', mode: 'light' });
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders family and mode dropdowns with four and three options when opened', () => {
    const triggers = fixture.nativeElement.querySelectorAll(
      'button[aria-haspopup="listbox"]',
    );
    expect(triggers.length).toBe(2);
    (triggers[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    let options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(4);

    (triggers[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    (triggers[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
  });

  it('emits themeChange when a family option is chosen', () => {
    const emitted: { family: string; mode: string }[] = [];
    component.themeChange.subscribe((value) => emitted.push(value));

    const familyTrigger = fixture.nativeElement.querySelector(
      '[data-settings-dropdown-trigger="presentation-theme-family"]',
    ) as HTMLButtonElement;
    familyTrigger.click();
    fixture.detectChanges();

    const christmas = Array.from(
      fixture.nativeElement.querySelectorAll('[role="option"]'),
    ).find((el: Element) => el.textContent?.includes('Christmas')) as HTMLElement;
    christmas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toEqual([{ family: 'christmas', mode: 'light' }]);
  });

  it('shows the current family label on the trigger', () => {
    fixture.componentRef.setInput('theme', { family: 'blossom', mode: 'light' });
    fixture.detectChanges();
    const familyTrigger = fixture.nativeElement.querySelector(
      '[data-settings-dropdown-trigger="presentation-theme-family"]',
    ) as HTMLButtonElement;
    expect(familyTrigger?.textContent).toContain('Blossom');
  });
});
