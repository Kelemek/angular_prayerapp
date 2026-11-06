import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeSelectDropdownComponent } from './theme-select-dropdown.component';
import {
  PRESENTATION_THEME_FAMILY_OPTIONS,
  THEME_FAMILY_OPTIONS,
  THEME_MODE_OPTIONS,
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

  let fixture: ComponentFixture<ThemeSelectDropdownComponent<string>>;
  let component: ThemeSelectDropdownComponent<string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeSelectDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeSelectDropdownComponent<string>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 'default');
    fixture.componentRef.setInput('options', THEME_FAMILY_OPTIONS);
    fixture.componentRef.setInput('iconVariant', 'family');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('emits valueChange when selecting from the list', () => {
    const values: string[] = [];
    component.valueChange.subscribe((v) => values.push(v));

    component.toggleOpen();
    fixture.detectChanges();
    component.selectValue('christmas');
    expect(values).toEqual(['christmas']);
  });

  it('uses the gospel sun icon for Light mode, with filled rays', () => {
    const html = readComponentResource('./theme-select-dropdown.component.html');
    const modeLight = html.slice(
      html.indexOf("@if (iconVariant === 'mode')"),
      html.indexOf('@else {'),
    );
    const light = modeLight.slice(
      modeLight.indexOf("@case ('light')"),
      modeLight.indexOf("@case ('dark')"),
    );
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

  it('renders an icon on every settings family row', () => {
    fixture.componentRef.setInput('dropdownKey', 'user-settings-theme-family');
    fixture.detectChanges();
    component.toggleOpen();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(rows).toHaveLength(THEME_FAMILY_OPTIONS.length);
    expect(THEME_FAMILY_OPTIONS).toHaveLength(4);

    const byId = (id: string): HTMLElement => {
      const row = fixture.nativeElement.querySelector(`#${id}`);
      expect(row, id).toBeTruthy();
      expect(row.querySelector('svg'), id).toBeTruthy();
      return row as HTMLElement;
    };

    const def = byId('user-settings-theme-family-opt-default');
    expect(def.getAttribute('aria-selected')).toBe('true');
    expect(def.querySelector('path')?.getAttribute('d')).toContain('M12 2.25');
    expect(def.textContent).toContain('Default');
    expect(def.textContent).toContain('✓');

    const hc = byId('tour-settings-theme-high-contrast');
    expect(hc.getAttribute('aria-selected')).toBe('false');

    const blossom = byId('tour-settings-theme-blossom');
    expect(blossom.innerHTML).toContain('r="2.65"');
    expect(blossom.querySelector('svg')?.getAttribute('class')).toContain('text-[#C45B76]');

    byId('tour-settings-theme-christmas');
    expect(THEME_FAMILY_OPTIONS.map((option) => option.value)).toEqual([
      'default',
      'high-contrast',
      'blossom',
      'christmas',
    ]);
  });

  it('renders an icon on every presentation family row', () => {
    fixture.componentRef.setInput('dropdownKey', 'presentation-theme-family');
    fixture.componentRef.setInput('options', PRESENTATION_THEME_FAMILY_OPTIONS);
    fixture.componentRef.setInput('value', 'christmas');
    fixture.detectChanges();
    component.toggleOpen();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.querySelector('svg')).toBeTruthy();
    }
    expect(
      fixture.nativeElement.querySelector('#tour-presentation-setting-theme-blossom svg'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement
        .querySelector('#tour-presentation-setting-theme-christmas')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('sizes the open list so the last option is not clipped', () => {
    const html = readComponentResource('./theme-select-dropdown.component.html');
    const list = html.slice(html.indexOf('role="listbox"'), html.indexOf('@for'));
    expect(list).toContain('max-h-96');
    expect(list).toContain('overflow-y-auto');
    expect(list).not.toContain('max-h-64');
    expect(html).toContain('track option.value');
  });

  it('keeps the Christmas tree icon forest on light and lighter on a dark host', () => {
    document.documentElement.classList.add('dark');
    try {
      fixture.componentRef.setInput('value', 'christmas');
      fixture.detectChanges();
      component.toggleOpen();
      fixture.detectChanges();

      const triggerIcon = fixture.nativeElement.querySelector(
        'button .christmas-light-theme-icon',
      );
      const rowIcon = fixture.nativeElement.querySelector(
        '#tour-settings-theme-christmas .christmas-light-theme-icon',
      );
      expect(triggerIcon).toBeTruthy();
      expect(rowIcon).toBeTruthy();

      for (const icon of [triggerIcon, rowIcon]) {
        const iconClass = icon!.getAttribute('class') ?? '';
        expect(iconClass).toContain('text-[#1F4D36]');
        expect(iconClass).toContain('dark:text-emerald-300');
        const ornament = icon!.querySelector('circle');
        const ornamentClass = ornament?.getAttribute('class') ?? '';
        expect(ornamentClass).toContain('fill-[#C4A35A]');
        expect(ornamentClass).toContain('dark:fill-amber-300');
      }
    } finally {
      document.documentElement.classList.remove('dark');
    }
  });

  it('exposes tour anchor ids on seasonal family options', () => {
    component.toggleOpen();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#tour-settings-theme-high-contrast')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#tour-settings-theme-blossom')).toBeTruthy();
  });

  it('moves active index with arrow keys while open', () => {
    component.toggleOpen();
    fixture.detectChanges();
    const start = component.activeIndex;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(component.activeIndex).toBe((start + 1) % THEME_FAMILY_OPTIONS.length);
  });

  it('renders mode options with monitor icon for system', () => {
    fixture.componentRef.setInput('options', THEME_MODE_OPTIONS);
    fixture.componentRef.setInput('value', 'system');
    fixture.componentRef.setInput('iconVariant', 'mode');
    fixture.componentRef.setInput('dropdownKey', 'user-settings-theme-mode');
    fixture.detectChanges();
    component.toggleOpen();
    fixture.detectChanges();

    const system = fixture.nativeElement.querySelector('#tour-settings-theme-mode-system');
    expect(system?.textContent ?? '').toContain('System');
    expect(system?.querySelector('rect')).toBeTruthy();
  });
});
