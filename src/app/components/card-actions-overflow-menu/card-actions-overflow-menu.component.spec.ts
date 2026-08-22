import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardActionsOverflowMenuComponent } from './card-actions-overflow-menu.component';
import type { CardActionsOverflowItem } from './card-actions-overflow-menu.types';

async function flushMenuPortal(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe('CardActionsOverflowMenuComponent', () => {
  let fixture: ComponentFixture<CardActionsOverflowMenuComponent>;
  let component: CardActionsOverflowMenuComponent;
  const selected: string[] = [];

  const sampleItems: CardActionsOverflowItem[] = [
    {
      id: 'reminder',
      label: 'Add prayer reminder',
      icon: 'bell',
      tone: 'blue',
      tourAnchorId: 'tour-prayer-reminder-bell',
      onSelect: () => selected.push('reminder'),
    },
    {
      id: 'edit',
      label: 'Edit prayer',
      icon: 'edit',
      tone: 'blue',
      onSelect: () => selected.push('edit'),
    },
    {
      id: 'delete',
      label: 'Delete prayer',
      icon: 'trash',
      tone: 'red',
      onSelect: () => selected.push('delete'),
    },
  ];

  beforeEach(async () => {
    selected.length = 0;
    await TestBed.configureTestingModule({
      imports: [CardActionsOverflowMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardActionsOverflowMenuComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.closeMenu();
    fixture?.destroy();
  });

  it('hides the trigger when there are no items', () => {
    component.items = [];
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-card-actions-trigger]')
    ).toBeNull();
  });

  it('opens labeled menu items and runs the selected item onSelect', async () => {
    component.items = sampleItems;
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      '[data-card-actions-trigger]'
    ) as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    trigger.click();
    fixture.detectChanges();
    await flushMenuPortal();

    const edit = document.body.querySelector(
      '[data-card-action="edit"]'
    ) as HTMLButtonElement;
    expect(edit.textContent).toContain('Edit prayer');
    expect(edit.className).toContain('min-h-[44px]');
    expect(
      document.body.querySelector('#tour-prayer-reminder-bell')
    ).toBeTruthy();

    edit.click();
    fixture.detectChanges();
    expect(selected).toEqual(['edit']);
    expect(component.menuOpen).toBe(false);
  });

  it('closes on Escape', () => {
    component.items = sampleItems;
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        '[data-card-actions-trigger]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(component.menuOpen).toBe(true);

    component.onDocumentKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(component.menuOpen).toBe(false);
  });

  it('portals the menu to document.body so it escapes isolated card shells', async () => {
    component.items = sampleItems;
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-card-actions-trigger]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await flushMenuPortal();

    const menu = document.body.querySelector(
      '[data-card-actions-overflow-menu]'
    );
    expect(menu).toBeTruthy();
    expect(fixture.nativeElement.contains(menu)).toBe(false);

    component.closeMenu();
    fixture.detectChanges();
    expect(
      document.body.querySelector('[data-card-actions-overflow-menu]')
    ).toBeNull();
  });
});
