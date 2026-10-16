import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { ClientPreferencesService } from './client-preferences.service';
import { emitClientPreferencesLocalChange } from '../lib/client-preferences-notify';
import { PRESENTATION_STATUS_FILTERS_DEFAULT } from '../types/presentation';
import { persistClientPreferencesByEmail } from '../lib/client-preferences-persist';
import { getPresentationSettingsDefaults } from '../lib/presentation-settings-defaults';
import { CLIENT_PREFERENCES_LEGACY_CLAIM_KEY } from '../lib/client-preferences-local';

vi.mock('../lib/client-preferences-persist', () => ({
  persistClientPreferencesByEmail: vi.fn().mockResolvedValue(undefined),
}));

function mockSupabaseService() {
  const client = {};
  return {
    client,
    getClientWhenReady: vi.fn().mockResolvedValue(client),
  };
}

function createService(
  session$: BehaviorSubject<{
    email: string;
    fullName: string;
    isActive: boolean;
    clientPreferences?: { theme?: 'light' };
    clientPreferencesNeedsDbSeed?: boolean;
  }>
) {
  return new ClientPreferencesService(
    mockSupabaseService() as never,
    {
      userSession$: session$,
      isLoading$: new BehaviorSubject(false),
      getUserEmail: () => session$.value.email,
      getCurrentSession: () => session$.value,
      updateUserSession: vi.fn().mockResolvedValue(undefined),
    } as never,
    {
      theme$: new BehaviorSubject('light'),
      setTheme: vi.fn(),
      getTheme: () => 'light',
    } as never,
    {
      textSize$: new BehaviorSubject('normal'),
      setTextSize: vi.fn(),
      getTextSize: () => 'normal',
    } as never,
    {
      save: vi.fn(),
      saved$: new Subject<void>(),
      getDefaults: () => getPresentationSettingsDefaults(),
    } as never
  );
}

describe('ClientPreferencesService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.mocked(persistClientPreferencesByEmail).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('coalesces rapid local changes into one persist', async () => {
    const session$ = new BehaviorSubject({
      email: 'user@example.com',
      fullName: '',
      isActive: true,
      clientPreferences: {
        theme: 'light' as const,
      },
    });

    const service = createService(session$);

    localStorage.setItem('theme', 'dark');
    emitClientPreferencesLocalChange();
    localStorage.setItem('textSize', 'large');
    emitClientPreferencesLocalChange();

    await vi.advanceTimersByTimeAsync(500);

    expect(persistClientPreferencesByEmail).toHaveBeenCalledTimes(1);
    service.ngOnDestroy();
  });

  it('applies theme and text size from session when local mirrors were cleared at logout', () => {
    const setTheme = vi.fn();
    const setTextSize = vi.fn();
    const session$ = new BehaviorSubject({
      email: 'user@example.com',
      fullName: '',
      isActive: true,
      clientPreferences: {
        theme: 'dark' as const,
        textSize: 'large' as const,
      },
    });

    const service = new ClientPreferencesService(
      mockSupabaseService() as never,
      {
        userSession$: session$,
        isLoading$: new BehaviorSubject(false),
        getUserEmail: () => session$.value.email,
        getCurrentSession: () => session$.value,
        updateUserSession: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        theme$: new BehaviorSubject('system'),
        setTheme,
        getTheme: () => 'system',
      } as never,
      {
        textSize$: new BehaviorSubject('normal'),
        setTextSize,
        getTextSize: () => 'normal',
      } as never,
      {
        save: vi.fn(),
        saved$: new Subject<void>(),
        getDefaults: () => getPresentationSettingsDefaults(),
      } as never
    );

    expect(setTheme).toHaveBeenCalledWith('dark');
    expect(setTextSize).toHaveBeenCalledWith('large');
    service.ngOnDestroy();
  });

  it('persists theme and textSize from services when theme$ emits', async () => {
    const theme$ = new BehaviorSubject<'light' | 'dark' | 'system'>('light');
    const textSize$ = new BehaviorSubject<'normal' | 'large' | 'largest'>(
      'normal'
    );
    const session$ = new BehaviorSubject({
      email: 'user@example.com',
      fullName: '',
      isActive: true,
      clientPreferences: { theme: 'light' as const, textSize: 'normal' as const },
    });

    const service = new ClientPreferencesService(
      mockSupabaseService() as never,
      {
        userSession$: session$,
        isLoading$: new BehaviorSubject(false),
        getUserEmail: () => session$.value.email,
        getCurrentSession: () => session$.value,
        updateUserSession: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        theme$,
        setTheme: vi.fn(),
        getTheme: () => 'dark',
      } as never,
      {
        textSize$,
        setTextSize: vi.fn(),
        getTextSize: () => 'large',
      } as never,
      {
        save: vi.fn(),
        saved$: new Subject<void>(),
        getDefaults: () => getPresentationSettingsDefaults(),
      } as never
    );

    localStorage.setItem('theme', 'light');
    localStorage.setItem('textSize', 'normal');
    theme$.next('dark');

    await vi.advanceTimersByTimeAsync(500);

    expect(persistClientPreferencesByEmail).toHaveBeenCalledWith(
      expect.anything(),
      'user@example.com',
      expect.objectContaining({ theme: 'dark', textSize: 'large' })
    );
    service.ngOnDestroy();
  });

  it('does not persist when signed-in user changed before debounce flush', async () => {
    let email = 'first@example.com';
    const session$ = new BehaviorSubject({
      email: 'first@example.com',
      fullName: '',
      isActive: true,
      clientPreferences: { theme: 'light' as const },
    });

    const service = new ClientPreferencesService(
      mockSupabaseService() as never,
      {
        userSession$: session$,
        isLoading$: new BehaviorSubject(false),
        getUserEmail: () => email,
        getCurrentSession: () => session$.value,
        updateUserSession: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        theme$: new BehaviorSubject('light'),
        setTheme: vi.fn(),
        getTheme: () => 'light',
      } as never,
      {
        textSize$: new BehaviorSubject('normal'),
        setTextSize: vi.fn(),
        getTextSize: () => 'normal',
      } as never,
      {
        save: vi.fn(),
        saved$: new Subject<void>(),
        getDefaults: () => ({
          contentTypes: ['prayers'],
          randomize: false,
          smartMode: true,
          displayDuration: 10,
          loop: true,
          timeFilter: 'all',
          statusFilters: { ...PRESENTATION_STATUS_FILTERS_DEFAULT },
          prayerTimerMinutes: 10,
        }),
      } as never
    );

    localStorage.setItem('theme', 'dark');
    emitClientPreferencesLocalChange();
    email = 'second@example.com';
    await vi.advanceTimersByTimeAsync(500);

    expect(persistClientPreferencesByEmail).not.toHaveBeenCalled();
    service.ngOnDestroy();
  });

  it('persists initial seed when session flags needsDbSeed', async () => {
    const session$ = new BehaviorSubject({
      email: 'user@example.com',
      fullName: '',
      isActive: true,
      clientPreferences: { theme: 'dark' as const },
      clientPreferencesNeedsDbSeed: true,
    });

    const updateUserSession = vi.fn().mockResolvedValue(undefined);
    const service = new ClientPreferencesService(
      mockSupabaseService() as never,
      {
        userSession$: session$,
        isLoading$: new BehaviorSubject(false),
        getUserEmail: () => 'user@example.com',
        getCurrentSession: () => session$.value,
        updateUserSession,
      } as never,
      {
        theme$: new BehaviorSubject('light'),
        setTheme: vi.fn(),
        getTheme: () => 'light',
      } as never,
      {
        textSize$: new BehaviorSubject('normal'),
        setTextSize: vi.fn(),
        getTextSize: () => 'normal',
      } as never,
      {
        save: vi.fn(),
        saved$: new Subject<void>(),
        getDefaults: () => getPresentationSettingsDefaults(),
      } as never
    );

    await vi.waitFor(() => {
      expect(persistClientPreferencesByEmail).toHaveBeenCalled();
    });
    expect(updateUserSession).toHaveBeenCalledWith({
      clientPreferencesNeedsDbSeed: false,
    });
    service.ngOnDestroy();
  });

  it('does not persist hard-coded defaults on shared device without session prefs', async () => {
    localStorage.setItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY, 'first@example.com');
    const session$ = new BehaviorSubject({
      email: 'second@example.com',
      fullName: '',
      isActive: true,
      clientPreferences: undefined,
    });

    const updateUserSession = vi.fn().mockResolvedValue(undefined);
    const service = new ClientPreferencesService(
      mockSupabaseService() as never,
      {
        userSession$: session$,
        isLoading$: new BehaviorSubject(false),
        getUserEmail: () => 'second@example.com',
        getCurrentSession: () => session$.value,
        updateUserSession,
      } as never,
      {
        theme$: new BehaviorSubject('light'),
        setTheme: vi.fn(),
        getTheme: () => 'light',
      } as never,
      {
        textSize$: new BehaviorSubject('normal'),
        setTextSize: vi.fn(),
        getTextSize: () => 'normal',
      } as never,
      {
        save: vi.fn(),
        saved$: new Subject<void>(),
        getDefaults: () => getPresentationSettingsDefaults(),
      } as never
    );

    emitClientPreferencesLocalChange();
    await vi.advanceTimersByTimeAsync(500);

    expect(updateUserSession).not.toHaveBeenCalled();
    expect(persistClientPreferencesByEmail).not.toHaveBeenCalled();
    service.ngOnDestroy();
  });
});
