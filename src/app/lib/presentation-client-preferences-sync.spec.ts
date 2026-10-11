import { describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { wirePresentationClientPreferencesSync } from './presentation-client-preferences-sync';
import { PRESENTATION_STATUS_FILTERS_DEFAULT } from '../types/presentation';

const baseSettings = {
  contentTypes: ['prayers'] as const,
  randomize: false,
  smartMode: true,
  displayDuration: 10,
  loop: true,
  timeFilter: 'all' as const,
  statusFilters: { ...PRESENTATION_STATUS_FILTERS_DEFAULT },
  prayerTimerMinutes: 10,
};

describe('wirePresentationClientPreferencesSync', () => {
  it('reloads content when remote settings change the page', () => {
    const session$ = new BehaviorSubject({
      email: 'user@example.com',
      clientPreferences: {
        presentationSettings: { ...baseSettings, loop: false },
      },
    });
    const destroy$ = new Subject<void>();
    const page = {
      ...baseSettings,
      contentTypes: [...baseSettings.contentTypes],
      statusFilters: { ...baseSettings.statusFilters },
      loop: true,
    };
    const afterRemoteSettingsApplied = vi.fn();

    wirePresentationClientPreferencesSync({
      userSession$: session$,
      destroy$,
      page,
      getHandoffActive: () => false,
      getEditedThisVisit: () => false,
      markForCheck: vi.fn(),
      snapshotPageSettings: () => ({
        ...baseSettings,
        contentTypes: [...baseSettings.contentTypes],
        statusFilters: { ...baseSettings.statusFilters },
        loop: page.loop,
      }),
      afterRemoteSettingsApplied,
    });

    expect(page.loop).toBe(false);
    expect(afterRemoteSettingsApplied).toHaveBeenCalledTimes(1);
  });

  it('does not reload when user edited settings this visit', () => {
    const session$ = new BehaviorSubject({
      email: 'user@example.com',
      clientPreferences: {
        presentationSettings: { ...baseSettings, loop: false },
      },
    });
    const destroy$ = new Subject<void>();
    const page = {
      ...baseSettings,
      contentTypes: [...baseSettings.contentTypes],
      statusFilters: { ...baseSettings.statusFilters },
      loop: true,
    };
    const afterRemoteSettingsApplied = vi.fn();

    wirePresentationClientPreferencesSync({
      userSession$: session$,
      destroy$,
      page,
      getHandoffActive: () => false,
      getEditedThisVisit: () => true,
      markForCheck: vi.fn(),
      snapshotPageSettings: () => ({
        ...baseSettings,
        contentTypes: [...baseSettings.contentTypes],
        statusFilters: { ...baseSettings.statusFilters },
        loop: page.loop,
      }),
      afterRemoteSettingsApplied,
    });

    expect(page.loop).toBe(true);
    expect(afterRemoteSettingsApplied).not.toHaveBeenCalled();
  });
});
