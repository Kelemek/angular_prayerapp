import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeSelectDropdownComponent } from './theme-select-dropdown.component';
import { THEME_SELECT_OPTIONS } from '../../lib/theme-options';

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8');
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe('ThemeSelectDropdownComponent', () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url)),
    );
  });

  let fixture: ComponentFixture<ThemeSelectDropdownComponent>;
  let component: ThemeSelectDropdownComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeSelectDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeSelectDropdownComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('theme', 'light');
    fixture.componentRef.setInput('options', THEME_SELECT_OPTIONS);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('emits themeChange when selecting from the list', () => {
    const values: string[] = [];
    component.themeChange.subscribe((v) => values.push(v));

    component.toggleOpen();
    fixture.detectChanges();
    component.selectTheme('christmas-dark');
    expect(values).toEqual(['christmas-dark']);
  });

  it('exposes tour anchor ids on seasonal options', () => {
    component.toggleOpen();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('#tour-settings-theme-night'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('#tour-settings-theme-blossom'),
    ).toBeTruthy();
  });

  it('moves active index with arrow keys while open', () => {
    component.toggleOpen();
    fixture.detectChanges();
    const start = component.activeIndex;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(component.activeIndex).toBe((start + 1) % THEME_SELECT_OPTIONS.length);
  });
});
