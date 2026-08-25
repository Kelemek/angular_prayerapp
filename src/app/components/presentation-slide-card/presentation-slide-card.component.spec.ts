import { describe, it, expect, vi } from 'vitest';
import { PresentationSlideCardComponent } from './presentation-slide-card.component';

describe('PresentationSlideCardComponent', () => {
  it('passes encouragement visibility inputs to prompt-card', () => {
    const component = new PresentationSlideCardComponent(
      { isAdmin: false } as any,
      { deletionsAllowed: 'everyone', updatesAllowed: 'everyone' } as any,
      { getCurrentListId: vi.fn() } as any,
      { markForCheck: vi.fn() } as any
    );
    component.showPrayForButton = false;
    component.showPrayingCount = false;
    component.prayerEncouragementEnabled = false;

    expect(component.showPrayForButton).toBe(false);
    expect(component.showPrayingCount).toBe(false);
    expect(component.prayerEncouragementEnabled).toBe(false);
  });

  it('opens personal edit modal from card output', () => {
    const cardActions = {
      isAdmin: false,
    } as any;
    const planningCenterListService = {
      getCurrentListId: vi.fn(() => 'list-1'),
    } as any;
    const cdr = { markForCheck: vi.fn() } as any;
    const component = new PresentationSlideCardComponent(
      cardActions,
      { deletionsAllowed: 'everyone', updatesAllowed: 'everyone' } as any,
      planningCenterListService,
      cdr
    );

    component.openEditPersonalPrayer({ id: 'p1', prayer_for: 'Test' } as any);

    expect(component.showEditPersonalPrayer).toBe(true);
    expect(component.editingPrayer?.id).toBe('p1');
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('emits itemRemoved only when deleteCardForCard succeeds', async () => {
    const cardActions = {
      deleteCardForCard: vi.fn().mockResolvedValue(true),
    } as any;
    const component = new PresentationSlideCardComponent(
      cardActions,
      { deletionsAllowed: 'everyone', updatesAllowed: 'everyone' } as any,
      { getCurrentListId: vi.fn() } as any,
      { markForCheck: vi.fn() } as any
    );
    component.prayer = { id: 'p1', user_email: 'a@b.com' } as any;
    const removed: string[] = [];
    component.itemRemoved.subscribe((id) => removed.push(id));

    component.onDeletePrayer();
    await Promise.resolve();

    expect(cardActions.deleteCardForCard).toHaveBeenCalledWith(component.prayer);
    expect(removed).toEqual(['p1']);
  });

  it('does not emit itemRemoved when deleteCardForCard fails', async () => {
    const cardActions = {
      deleteCardForCard: vi.fn().mockResolvedValue(false),
    } as any;
    const component = new PresentationSlideCardComponent(
      cardActions,
      { deletionsAllowed: 'everyone', updatesAllowed: 'everyone' } as any,
      { getCurrentListId: vi.fn() } as any,
      { markForCheck: vi.fn() } as any
    );
    component.prayer = { id: 'p1' } as any;
    const removed: string[] = [];
    component.itemRemoved.subscribe((id) => removed.push(id));

    component.onDeletePrayer();
    await Promise.resolve();

    expect(removed).toEqual([]);
  });

  it('does not emit itemRemoved when deletePrompt fails', async () => {
    const cardActions = {
      deletePrompt: vi.fn().mockResolvedValue(false),
    } as any;
    const component = new PresentationSlideCardComponent(
      cardActions,
      { deletionsAllowed: 'everyone', updatesAllowed: 'everyone' } as any,
      { getCurrentListId: vi.fn() } as any,
      { markForCheck: vi.fn() } as any
    );
    const removed: string[] = [];
    component.itemRemoved.subscribe((id) => removed.push(id));

    await component.onDeletePrompt('prompt-1');

    expect(removed).toEqual([]);
  });

  it('emits itemRemoved when deletePrompt succeeds', async () => {
    const cardActions = {
      deletePrompt: vi.fn().mockResolvedValue(true),
    } as any;
    const component = new PresentationSlideCardComponent(
      cardActions,
      { deletionsAllowed: 'everyone', updatesAllowed: 'everyone' } as any,
      { getCurrentListId: vi.fn() } as any,
      { markForCheck: vi.fn() } as any
    );
    const removed: string[] = [];
    component.itemRemoved.subscribe((id) => removed.push(id));

    await component.onDeletePrompt('prompt-1');

    expect(removed).toEqual(['prompt-1']);
  });
});
