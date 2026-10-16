import { describe, expect, it, vi, afterEach } from 'vitest';
import type { UserSettingsFacade } from './user-settings-facade';
import {
  clearUserSettingsSuccessTimers,
  showUserSettingsTextSizeSaved,
  showUserSettingsThemeSaved,
} from './user-settings-timed-success';

function createHost(): UserSettingsFacade {
  return {
    successTheme: null,
    successTextSize: null,
    markForCheck: vi.fn(),
  } as unknown as UserSettingsFacade;
}

describe('user-settings-timed-success', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows theme success and clears after timeout', () => {
    vi.useFakeTimers();
    const host = createHost();

    showUserSettingsThemeSaved(host, 'dark');

    expect(host.successTheme).toBe('✅ Theme set to Dark');
    expect(host.markForCheck).toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(host.successTheme).toBeNull();
    expect(host.markForCheck).toHaveBeenCalledTimes(2);
  });

  it('shows text size success', () => {
    const host = createHost();

    showUserSettingsTextSizeSaved(host, 'large');

    expect(host.successTextSize).toBe('✅ Text size set to Larger');
  });

  it('clears pending dismiss timers on destroy', () => {
    vi.useFakeTimers();
    const host = createHost();

    showUserSettingsThemeSaved(host, 'light');
    clearUserSettingsSuccessTimers(host);
    vi.advanceTimersByTime(3000);

    expect(host.successTheme).toBe('✅ Theme set to Light');
  });
});
