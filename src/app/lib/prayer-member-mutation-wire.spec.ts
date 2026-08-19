import { describe, expect, it, vi } from 'vitest';
import {
  MEMBER_PRAYER_UPDATE_TOAST,
  runMemberPrayerCacheMutation,
} from './prayer-member-mutation-wire';

describe('prayer-member-mutation-wire', () => {
  it('runMemberPrayerCacheMutation invalidates cache and reports success', async () => {
    const invalidate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();

    const ok = await runMemberPrayerCacheMutation(
      async () => undefined,
      invalidate,
      success,
      error,
      {
        success: MEMBER_PRAYER_UPDATE_TOAST.addSuccess,
        fail: MEMBER_PRAYER_UPDATE_TOAST.addFail,
      },
      'test mutation'
    );

    expect(ok).toBe(true);
    expect(invalidate).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith(MEMBER_PRAYER_UPDATE_TOAST.addSuccess);
    expect(error).not.toHaveBeenCalled();
  });

  it('runMemberPrayerCacheMutation reports failure without invalidating', async () => {
    const invalidate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();

    const ok = await runMemberPrayerCacheMutation(
      async () => {
        throw new Error('boom');
      },
      invalidate,
      success,
      error,
      {
        success: MEMBER_PRAYER_UPDATE_TOAST.updateSuccess,
        fail: MEMBER_PRAYER_UPDATE_TOAST.updateFail,
      },
      'test mutation'
    );

    expect(ok).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(MEMBER_PRAYER_UPDATE_TOAST.updateFail);
  });
});
