import { describe, it, expect, vi } from 'vitest';
import {
  CAPACITOR_LIVE_ORIGIN,
  buildLiveRedirectUrl,
  isCapacitorBundledBootOrigin,
  isCapacitorDevWebViewOrigin,
  isOnCapacitorLiveHost,
  maybeRedirectNativeToLiveSite,
  probeLiveOriginReachable,
  shouldAttemptLiveRedirect,
} from './capacitor-live-boot';

describe('capacitor-live-boot', () => {
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
});
