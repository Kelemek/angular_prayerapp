import { describe, expect, it, vi } from 'vitest';
import {
  emitClientPreferencesLocalChange,
  runApplyingClientPreferencesFromSession,
  setClientPreferencesChangeListener,
} from './client-preferences-notify';

describe('client-preferences-notify', () => {
  it('suppresses emits while applying session preferences', () => {
    const listener = vi.fn();
    setClientPreferencesChangeListener(listener);

    runApplyingClientPreferencesFromSession(() => {
      emitClientPreferencesLocalChange();
    });
    expect(listener).not.toHaveBeenCalled();

    emitClientPreferencesLocalChange();
    expect(listener).toHaveBeenCalledTimes(1);

    setClientPreferencesChangeListener(null);
  });
});
