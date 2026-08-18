import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { AdminPrayerEditorDialogsComponent } from './admin-prayer-editor-dialogs.component';

describe('AdminPrayerEditorDialogsComponent', () => {
  let component: AdminPrayerEditorDialogsComponent;
  let mockAdminData: {
    sendBroadcastNotificationForNewPrayer: ReturnType<typeof vi.fn>;
    sendBroadcastNotificationForNewUpdate: ReturnType<typeof vi.fn>;
  };
  let mockToast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAdminData = {
      sendBroadcastNotificationForNewPrayer: vi.fn().mockResolvedValue(undefined),
      sendBroadcastNotificationForNewUpdate: vi.fn().mockResolvedValue(undefined),
    };
    mockToast = { success: vi.fn(), error: vi.fn() };
    mockCdr = { markForCheck: vi.fn() };

    component = new AdminPrayerEditorDialogsComponent(
      mockAdminData as never,
      mockToast as never,
      mockCdr as unknown as ChangeDetectorRef,
    );
  });

  it('opens delete confirmation and emits on confirm', () => {
    const confirmed = vi.fn();
    component.confirmationConfirmed.subscribe(confirmed);

    component.openDeletePrayerConfirmation({
      id: 'p1',
      title: 'Pray',
      requester: 'J',
      email: null,
      status: 'current',
      created_at: '2024-01-01',
    });

    expect(component.showConfirmationDialog).toBe(true);
    expect(component.confirmationPrayerId).toBe('p1');

    component.onConfirmDelete();
    expect(confirmed).toHaveBeenCalledWith({ kind: 'deleteOne', prayerId: 'p1' });
    expect(component.showConfirmationDialog).toBe(false);
  });

  it('opens delete update confirmation and emits on confirm', () => {
    const confirmed = vi.fn();
    component.confirmationConfirmed.subscribe(confirmed);

    component.openDeleteUpdateConfirmation('p1', 'u1', 'Update body text');

    expect(component.showConfirmationDialog).toBe(true);
    expect(component.isDeleteUpdateConfirmation).toBe(true);

    component.onConfirmDelete();
    expect(confirmed).toHaveBeenCalledWith({
      kind: 'deleteUpdate',
      prayerId: 'p1',
      updateId: 'u1',
    });
  });

  it('sends prayer notification broadcast on confirm', async () => {
    component.openSendNotificationForPrayer('p-1', 'Title');
    await component.onConfirmSendNotification();

    expect(mockAdminData.sendBroadcastNotificationForNewPrayer).toHaveBeenCalledWith('p-1');
    expect(mockToast.success).toHaveBeenCalled();
    expect(component.showSendNotificationDialog).toBe(false);
  });
});
