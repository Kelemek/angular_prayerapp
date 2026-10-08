import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { whenAuthLoadingFinishes } from './auth-loading-gate';

describe('whenAuthLoadingFinishes', () => {
  it('does not throw when loading is already false at subscribe time', async () => {
    const onReady = vi.fn();
    const onTimeout = vi.fn();
    await whenAuthLoadingFinishes(new BehaviorSubject(false), {
      timeoutMs: 5000,
      onReady,
      onTimeout,
    });
    expect(onReady).toHaveBeenCalledOnce();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('resolves when loading later becomes false', async () => {
    const loading$ = new BehaviorSubject(true);
    const onReady = vi.fn();
    const pending = whenAuthLoadingFinishes(loading$, {
      timeoutMs: 5000,
      onReady,
      onTimeout: () => {},
    });
    loading$.next(false);
    await pending;
    expect(onReady).toHaveBeenCalledOnce();
  });
});
