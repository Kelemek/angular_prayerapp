import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('emits menuWillOpen before the portal opens', async () => {
    const menuWillOpen = vi.fn();
    component.menuWillOpen.subscribe(menuWillOpen);
    component.items = sampleItems;
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-card-actions-trigger]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await flushMenuPortal();

    expect(menuWillOpen).toHaveBeenCalledTimes(1);
  });

  it('waits for async beforeMenuOpen before opening the menu', async () => {
    let resolvePrepare!: () => void;
    const prepareDone = new Promise<void>((resolve) => {
      resolvePrepare = resolve;
    });
    component.items = sampleItems;
    component.beforeMenuOpen = async () => {
      await prepareDone;
    };
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-card-actions-trigger]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await flushMenuPortal();

    expect(component.menuOpen).toBe(false);

    resolvePrepare();
    await flushMenuPortal();
    fixture.detectChanges();

    expect(component.menuOpen).toBe(true);
  });

  it('refreshes the portaled menu when items change while open', async () => {
    component.items = [sampleItems[0]];
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-card-actions-trigger]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await flushMenuPortal();

    component.items = [
      {
        ...sampleItems[0],
        label: 'Manage prayer reminders',
        filled: true,
      },
    ];
    component.ngOnChanges({
      items: {
        previousValue: [sampleItems[0]],
        currentValue: component.items,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    fixture.detectChanges();

    const reminder = document.body.querySelector(
      '[data-card-action="reminder"]'
    );
    expect(reminder?.textContent).toContain('Manage prayer reminders');
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

  it('closes on Escape', async () => {
    component.items = sampleItems;
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        '[data-card-actions-trigger]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await flushMenuPortal();
    expect(component.menuOpen).toBe(true);

    component.onDocumentKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(component.menuOpen).toBe(false);
  });

  it('does not open the menu after destroy while beforeMenuOpen is pending', async () => {
    let resolvePrepare!: () => void;
    const prepareDone = new Promise<void>((resolve) => {
      resolvePrepare = resolve;
    });
    component.items = sampleItems;
    component.beforeMenuOpen = async () => {
      await prepareDone;
    };
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-card-actions-trigger]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    fixture.destroy();
    resolvePrepare();
    await flushMenuPortal();

    expect(component.menuOpen).toBe(false);
    expect(
      document.body.querySelector('[data-card-actions-overflow-menu]')
    ).toBeNull();
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
