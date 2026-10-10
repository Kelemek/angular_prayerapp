import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  CAPACITOR_LIVE_ORIGIN,
  buildLiveRedirectUrl,
  getBundledLiveRedirectAttemptsForTesting,
  isCapacitorBundledBootOrigin,
  isCapacitorDevWebViewOrigin,
  isOnCapacitorLiveHost,
  maybeRedirectNativeToLiveSite,
  maybeReloadNativeLiveWebIfStale,
  probeLiveOriginReachable,
  resetCapacitorLiveBootStateForTesting,
  shouldAttemptLiveRedirect,
  startCapacitorLiveBootWatch,
} from './capacitor-live-boot';
import { WEB_REVISION_CHECK_AT_KEY } from './web-revision-reload';

describe('capacitor-live-boot', () => {
  afterEach(() => {
    resetCapacitorLiveBootStateForTesting();
  });
  it('detects bundled Capacitor boot origins', () => {
    expect(isCapacitorBundledBootOrigin('capacitor://localhost', 'localhost')).toBe(
      true
    );
    expect(isCapacitorBundledBootOrigin('https://localhost', 'localhost')).toBe(
      true
    );
    expect(
      isCapacitorBundledBootOrigin(
        'https://cpprayer.cp-church.org',
        'cpprayer.cp-church.org'
      )
    ).toBe(false);
  });

  it('detects live production host', () => {
    expect(isOnCapacitorLiveHost('cpprayer.cp-church.org')).toBe(true);
    expect(isOnCapacitorLiveHost('other.cp-church.org')).toBe(true);
    expect(isOnCapacitorLiveHost('localhost')).toBe(false);
  });

  it('treats dev ng serve origins as non-bundled', () => {
    expect(isCapacitorDevWebViewOrigin('http://localhost:4200')).toBe(true);
    expect(
      isCapacitorBundledBootOrigin('http://localhost:4200', 'localhost')
    ).toBe(false);
    expect(
      shouldAttemptLiveRedirect({
        isNative: true,
        origin: 'http://localhost:4200',
        hostname: 'localhost',
      })
    ).toBe(false);
    expect(
      isCapacitorBundledBootOrigin('https://localhost', 'localhost')
    ).toBe(true);
  });

  it('shouldAttemptLiveRedirect only on native bundled boot', () => {
    expect(
      shouldAttemptLiveRedirect({
        isNative: false,
        origin: 'https://localhost',
        hostname: 'localhost',
      })
    ).toBe(false);
    expect(
      shouldAttemptLiveRedirect({
        isNative: true,
        origin: 'https://cpprayer.cp-church.org',
        hostname: 'cpprayer.cp-church.org',
      })
    ).toBe(false);
    expect(
      shouldAttemptLiveRedirect({
        isNative: true,
        origin: 'https://localhost',
        hostname: 'localhost',
      })
    ).toBe(true);
  });

  it('buildLiveRedirectUrl preserves path and query', () => {
    expect(
      buildLiveRedirectUrl(CAPACITOR_LIVE_ORIGIN, {
        pathname: '/info',
        search: '?x=1',
        hash: '#top',
      })
    ).toBe('https://cpprayer.cp-church.org/info?x=1#top');
  });

  it('probeLiveOriginReachable returns true on ok GET', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, type: 'basic' });
    await expect(
      probeLiveOriginReachable({
        liveOrigin: CAPACITOR_LIVE_ORIGIN,
        fetchFn,
        timeoutMs: 1000,
      })
    ).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://cpprayer.cp-church.org/',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('maybeRedirectNativeToLiveSite replaces location when reachable', async () => {
    const replace = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const redirected = await maybeRedirectNativeToLiveSite({
      isNative: true,
      origin: 'https://localhost',
      hostname: 'localhost',
      location: {
        pathname: '/',
        search: '',
        hash: '',
        replace,
      } as Location,
      liveOrigin: CAPACITOR_LIVE_ORIGIN,
      fetchFn,
      timeoutMs: 1000,
    });
    expect(redirected).toBe(true);
    expect(replace).toHaveBeenCalledWith('https://cpprayer.cp-church.org/');
  });

  it('maybeRedirectNativeToLiveSite does not increment attempts when redirect is in flight', async () => {
    const fetchFn = vi.fn().mockImplementation(() => new Promise(() => {}));
    const location = {
      pathname: '/',
      search: '',
      hash: '',
      replace: vi.fn(),
    } as Location;
    const opts = {
      isNative: true,
      origin: 'https://localhost',
      hostname: 'localhost',
      location,
      liveOrigin: CAPACITOR_LIVE_ORIGIN,
      fetchFn,
      timeoutMs: 1000,
    };
    void maybeRedirectNativeToLiveSite(opts);
    const second = await maybeRedirectNativeToLiveSite(opts);
    expect(second).toBe(false);
    expect(getBundledLiveRedirectAttemptsForTesting()).toBe(1);
  });

  it('maybeRedirectNativeToLiveSite skips reachability probe on second attempt when online', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const replace = vi.fn();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, type: 'basic' })
      .mockResolvedValueOnce({ ok: false, type: 'opaque' });
    const location = {
      pathname: '/',
      search: '',
      hash: '',
      replace,
    } as Location;
    const opts = {
      isNative: true,
      origin: 'https://localhost',
      hostname: 'localhost',
      location,
      liveOrigin: CAPACITOR_LIVE_ORIGIN,
      fetchFn,
      timeoutMs: 1000,
    };
    await maybeRedirectNativeToLiveSite(opts);
    expect(fetchFn).toHaveBeenCalled();
    fetchFn.mockClear();
    await maybeRedirectNativeToLiveSite({
      ...opts,
      location: { ...location, replace: vi.fn() },
    });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(getBundledLiveRedirectAttemptsForTesting()).toBe(2);
    vi.unstubAllGlobals();
  });

  it('maybeRedirectNativeToLiveSite can skip reachability probe when requested', async () => {
    const replace = vi.fn();
    const fetchFn = vi.fn();
    const redirected = await maybeRedirectNativeToLiveSite({
      isNative: true,
      origin: 'https://localhost',
      hostname: 'localhost',
      location: {
        pathname: '/',
        search: '',
        hash: '',
        replace,
      } as Location,
      liveOrigin: CAPACITOR_LIVE_ORIGIN,
      fetchFn,
      timeoutMs: 1000,
      skipReachabilityProbe: true,
    });
    expect(redirected).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('https://cpprayer.cp-church.org/');
  });

  it('maybeReloadNativeLiveWebIfStale reloads when remote revision differs', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    sessionStorage.clear();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1\n',
    });
    const reloaded = await maybeReloadNativeLiveWebIfStale({
      liveOrigin: CAPACITOR_LIVE_ORIGIN,
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
    });
    expect(reloaded).toBe(true);
    expect(reload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('reloads a stale live bundle when the app becomes active inside the throttle window', async () => {
    sessionStorage.clear();
    sessionStorage.setItem(WEB_REVISION_CHECK_AT_KEY, String(Date.now()));
    const reload = vi.fn();
    vi.stubGlobal('location', {
      hostname: 'cpprayer.cp-church.org',
      origin: 'https://cpprayer.cp-church.org',
      pathname: '/',
      search: '',
      hash: '',
      reload,
      replace: vi.fn(),
    });
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1\n',
    });
    startCapacitorLiveBootWatch({
      isNative: true,
      liveOrigin: CAPACITOR_LIVE_ORIGIN,
      fetchFn,
      timeoutMs: 1000,
    });
    window.dispatchEvent(new CustomEvent('app-became-visible'));
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(fetchFn).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
