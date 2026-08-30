import { ApplicationRef, ChangeDetectorRef } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerseMemorizationPrayerManagerComponent } from './verse-memorization-prayer-manager.component';
import type { VerseMemorizationPrayerBroadcastPayload } from '../../services/verse-memorization-prayer.service';

describe('VerseMemorizationPrayerManagerComponent', () => {
  let component: VerseMemorizationPrayerManagerComponent;
  let mockVersePrayer: {
    createVerseMemorizationPrayer: ReturnType<typeof vi.fn>;
    broadcastVerseMemorizationPrayerNotifications: ReturnType<typeof vi.fn>;
  };
  let mockMemorization: { getPreferredTranslation: ReturnType<typeof vi.fn> };
  let mockToast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn>; detectChanges: ReturnType<typeof vi.fn> };
  let mockAppRef: { tick: ReturnType<typeof vi.fn> };

  const payload: VerseMemorizationPrayerBroadcastPayload = {
    prayerId: 'prayer-verse-1',
    verseReference: 'John 3:16',
    verseTranslation: 'esv',
    verseText: 'For God so loved the world.',
    adminMessage: 'Focus on this week.',
  };

  beforeEach(() => {
    mockVersePrayer = {
      createVerseMemorizationPrayer: vi.fn(),
      broadcastVerseMemorizationPrayerNotifications: vi.fn().mockResolvedValue(undefined),
    };
    mockMemorization = {
      getPreferredTranslation: vi.fn().mockReturnValue('esv'),
    };
    mockToast = { success: vi.fn(), error: vi.fn() };
    mockCdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
    mockAppRef = { tick: vi.fn() };

    component = new VerseMemorizationPrayerManagerComponent(
      mockVersePrayer as never,
      mockMemorization as never,
      mockToast as never,
      mockCdr as unknown as ChangeDetectorRef,
      mockAppRef as unknown as ApplicationRef,
    );
  });

  function setPendingBroadcast(next: VerseMemorizationPrayerBroadcastPayload | null): void {
    (
      component as unknown as {
        pendingBroadcast: VerseMemorizationPrayerBroadcastPayload | null;
      }
    ).pendingBroadcast = next;
  }

  it('broadcasts verse notifications only once when Send is clicked twice', async () => {
    let resolveBroadcast: () => void = () => undefined;
    mockVersePrayer.broadcastVerseMemorizationPrayerNotifications.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveBroadcast = resolve;
      })
    );

    setPendingBroadcast(payload);
    component.showSendNotificationDialog = true;

    const first = component.onConfirmSendNotification();
    const second = component.onConfirmSendNotification();
    resolveBroadcast();
    await Promise.all([first, second]);

    expect(mockVersePrayer.broadcastVerseMemorizationPrayerNotifications).toHaveBeenCalledTimes(1);
    expect(mockVersePrayer.broadcastVerseMemorizationPrayerNotifications).toHaveBeenCalledWith(
      payload
    );
    expect(mockToast.success).toHaveBeenCalledTimes(1);
    expect(component.showSendNotificationDialog).toBe(false);
  });

  it('does not close the send dialog if decline fires while broadcast is in flight', async () => {
    let resolveBroadcast: () => void = () => undefined;
    mockVersePrayer.broadcastVerseMemorizationPrayerNotifications.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveBroadcast = resolve;
      })
    );

    setPendingBroadcast(payload);
    component.showSendNotificationDialog = true;

    const inFlight = component.onConfirmSendNotification();
    component.onDeclineSendNotification();

    expect(component.showSendNotificationDialog).toBe(true);

    resolveBroadcast();
    await inFlight;

    expect(component.showSendNotificationDialog).toBe(false);
  });

  it('creates the verse prayer only once when Post is clicked twice', async () => {
    let resolveCreate: (value: {
      ok: true;
      prayerId: string;
      verseText: string;
    }) => void = () => undefined;
    mockVersePrayer.createVerseMemorizationPrayer.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );

    component.pendingReference = 'John 3:16';
    component.showSendPanel = true;

    const first = component.sendVersePrayer();
    const second = component.sendVersePrayer();
    resolveCreate({ ok: true, prayerId: 'prayer-verse-1', verseText: 'For God so loved the world.' });
    await Promise.all([first, second]);

    expect(mockVersePrayer.createVerseMemorizationPrayer).toHaveBeenCalledTimes(1);
    expect(component.showSendNotificationDialog).toBe(true);
  });
});
