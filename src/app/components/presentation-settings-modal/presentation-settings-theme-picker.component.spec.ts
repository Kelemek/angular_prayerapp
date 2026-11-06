import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresentationSettingsThemePickerComponent } from './presentation-settings-theme-picker.component';

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
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsThemePickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('theme', 'light');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders a theme dropdown with seven options when opened', () => {
    const trigger = fixture.nativeElement.querySelector(
      'button[aria-haspopup="listbox"]',
    ) as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    trigger.click();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(7);
  });

  it('emits themeChange when an option is chosen', () => {
    const emitted: string[] = [];
    component.themeChange.subscribe((value) => emitted.push(value));

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const nightOption = Array.from(
      fixture.nativeElement.querySelectorAll('[role="option"]'),
    ).find((el: Element) => el.textContent?.includes('Night')) as HTMLElement;
    nightOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toEqual(['black']);
  });

  it('shows the current theme label on the trigger', () => {
    fixture.componentRef.setInput('theme', 'blossom');
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Blossom');
  });
});
