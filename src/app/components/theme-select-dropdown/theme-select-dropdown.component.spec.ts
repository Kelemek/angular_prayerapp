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

  it('uses the gospel blossom icon: stroke petals and a filled center', () => {
    const html = readComponentResource('./theme-select-dropdown.component.html');
    expect(html).toContain('viewBox="3.5 3.5 17 17"');
    expect(html).toContain('stroke-width="1"');
    expect(html).toContain('<circle cx="12" cy="12" r="3" fill="currentColor"></circle>');
    expect(html).toContain('<circle cx="12" cy="7.1" r="2.65"></circle>');
    expect(html).toContain('<circle cx="16.55" cy="10.45" r="2.65"></circle>');
    expect(html).toContain('<circle cx="14.75" cy="15.45" r="2.65"></circle>');
    expect(html).toContain('<circle cx="9.25" cy="15.45" r="2.65"></circle>');
    expect(html).toContain('<circle cx="7.45" cy="10.45" r="2.65"></circle>');
    expect(html).not.toContain('M12 3c0 2.5');
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
