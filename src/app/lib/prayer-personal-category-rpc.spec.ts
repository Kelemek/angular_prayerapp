import { describe, expect, it, vi } from 'vitest';
import {
  logPersonalCategoryRpcMessage,
  runPersonalCategoryMutationRpc,
} from './prayer-personal-category-rpc';

describe('prayer-personal-category-rpc', () => {
  it('runPersonalCategoryMutationRpc returns ok on empty success data', async () => {
    const result = await runPersonalCategoryMutationRpc(async () => ({
      data: [],
      error: null,
    }));
    expect(result).toEqual({ ok: true });
  });

  it('runPersonalCategoryMutationRpc requests fallback on rpc error', async () => {
    const result = await runPersonalCategoryMutationRpc(async () => ({
      data: null,
      error: new Error('rpc down'),
    }));
    expect(result).toEqual({ ok: false, shouldFallback: true });
  });

  it('runPersonalCategoryMutationRpc returns message on failed mutation row', async () => {
    const result = await runPersonalCategoryMutationRpc(async () => ({
      data: [{ success: false, message: 'invalid category' }],
      error: null,
    }));
    expect(result).toEqual({
      ok: false,
      shouldFallback: false,
      message: 'invalid category',
    });
  });

  it('logPersonalCategoryRpcMessage logs when message present', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logPersonalCategoryRpcMessage('reordered');
    expect(logSpy).toHaveBeenCalledWith('[PrayerService]', 'reordered');
    logSpy.mockRestore();
  });
});
