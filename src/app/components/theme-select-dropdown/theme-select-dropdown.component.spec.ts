import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeSelectDropdownComponent } from './theme-select-dropdown.component';
import {
  PRESENTATION_THEME_SELECT_OPTIONS,
  THEME_SELECT_OPTIONS,
} from '../../lib/theme-options';

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

  it('uses the gospel sun icon for Light, with filled rays', () => {
    const html = readComponentResource('./theme-select-dropdown.component.html');
    const light = html.slice(html.indexOf("@case ('light')"), html.indexOf("@case ('dark')"));
    expect(light).toContain('fill="currentColor"');
    expect(light).toContain('M12 2.25a.75.75 0 01.75.75v2.25');
    expect(light).toContain('M7.5 12a4.5 4.5 0 119 0');
    expect(light).not.toContain('<line');
    expect(light).not.toContain('<circle');
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

  it('renders an icon on every settings theme row', () => {
    fixture.componentRef.setInput('dropdownKey', 'user-settings-theme');
    fixture.detectChanges();
    component.toggleOpen();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(rows).toHaveLength(THEME_SELECT_OPTIONS.length);
    expect(THEME_SELECT_OPTIONS).toHaveLength(7);

    const byId = (id: string): HTMLElement => {
      const row = fixture.nativeElement.querySelector(`#${id}`);
      expect(row, id).toBeTruthy();
      expect(row.querySelector('svg'), id).toBeTruthy();
      return row as HTMLElement;
    };

    const light = byId('user-settings-theme-opt-light');
    expect(light.getAttribute('aria-selected')).toBe('true');
    expect(light.querySelector('path')?.getAttribute('d')).toContain('M12 2.25');
    expect(light.textContent).toContain('Light');
    expect(light.textContent).toContain('✓');

    const dark = byId('user-settings-theme-opt-dark');
    expect(dark.getAttribute('aria-selected')).toBe('false');
    expect(dark.querySelector('svg')?.getAttribute('class')).toContain('text-blue-600');

    byId('tour-settings-theme-night');
    const blossom = byId('tour-settings-theme-blossom');
    expect(blossom.innerHTML).toContain('r="2.65"');
    expect(blossom.querySelector('svg')?.getAttribute('class')).toContain('text-[#C45B76]');

    byId('tour-settings-theme-christmas-light');
    const christmasDark = byId('tour-settings-theme-christmas-dark');
    expect(christmasDark.querySelector('svg')?.getAttribute('class')).toContain(
      'text-[#C4A35A]',
    );
    byId('user-settings-theme-opt-system');
  });

  it('renders an icon on every presentation theme row', () => {
    fixture.componentRef.setInput('dropdownKey', 'presentation-theme');
    fixture.componentRef.setInput('options', PRESENTATION_THEME_SELECT_OPTIONS);
    fixture.componentRef.setInput('theme', 'christmas-dark');
    fixture.detectChanges();
    component.toggleOpen();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(rows).toHaveLength(7);
    for (const row of rows) {
      expect(row.querySelector('svg')).toBeTruthy();
    }
    expect(
      fixture.nativeElement.querySelector('#tour-presentation-setting-theme-blossom svg'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement
        .querySelector('#tour-presentation-setting-theme-christmas-dark')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
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
