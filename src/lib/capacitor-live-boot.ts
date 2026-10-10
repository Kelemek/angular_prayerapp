import { PRODUCTION_APP_ORIGIN } from './production-app-origin';
import {
  liveBuildRevisionUrl,
  maybeReloadIfWebRevisionStale,
} from './web-revision-reload';

/** Production web app loaded when the native shell is online (hybrid boot). */
export const CAPACITOR_LIVE_ORIGIN = PRODUCTION_APP_ORIGIN;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Dev `ng serve` / CAPACITOR_SERVER_URL — must not redirect to production. */
export function isCapacitorDevWebViewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:') {
      return true;
    }
    const host = url.hostname.toLowerCase();
    if (!LOOPBACK_HOSTS.has(host)) {
      return false;
    }
    if (url.port && url.port !== '443') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** True when the WebView booted from bundled assets (not dev server.url or live site). */
export function isCapacitorBundledBootOrigin(
  origin: string,
  hostname: string
): boolean {
  if (isCapacitorDevWebViewOrigin(origin)) {
    return false;
  }
  if (origin.startsWith('capacitor://')) {
    return true;
  }
  return LOOPBACK_HOSTS.has(hostname.toLowerCase()) && origin.startsWith('https:');
}

export function isOnCapacitorLiveHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'cpprayer.cp-church.org' || host.endsWith('.cp-church.org');
}

export function shouldAttemptLiveRedirect(options: {
  isNative: boolean;
  origin: string;
  hostname: string;
}): boolean {
  if (!options.isNative) {
    return false;
  }
  if (isOnCapacitorLiveHost(options.hostname)) {
    return false;
  }
  return isCapacitorBundledBootOrigin(options.origin, options.hostname);
}

export function buildLiveRedirectUrl(
  liveOrigin: string,
  location: Pick<Location, 'pathname' | 'search' | 'hash'>
): string {
  const base = liveOrigin.replace(/\/$/, '');
  const path = location.pathname || '/';
  return `${base}${path}${location.search}${location.hash}`;
}

function liveOriginProbeUrl(liveOrigin: string): string {
  return `${liveOrigin.replace(/\/$/, '')}/`;
}

/** WKWebView often fails CORS HEAD from capacitor://localhost even when the site is up. */
export async function probeLiveOriginReachable(options: {
  liveOrigin: string;
  fetchFn: typeof fetch;
  timeoutMs: number;
}): Promise<boolean> {
  const url = liveOriginProbeUrl(options.liveOrigin);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const init = {
    cache: 'no-store' as const,
    signal: controller.signal,
  };
  try {
    try {
      const response = await options.fetchFn(url, { ...init, method: 'GET' });
      if (response.ok || response.type === 'opaque') {
        return true;
      }
    } catch {
      // Fall through to a no-cors probe.
    }
    try {
      const opaque = await options.fetchFn(url, {
        ...init,
        method: 'GET',
        mode: 'no-cors',
      });
      return opaque.ok || opaque.type === 'opaque';
    } catch {
      return false;
    }
  } finally {
    clearTimeout(timeout);
  }
}

/** Let the Capacitor WebView finish its first paint before cross-origin navigation. */
export async function waitForCapacitorWebViewReady(): Promise<void> {
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    await new Promise<void>((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(), {
        once: true,
      });
    });
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export type CapacitorLiveRedirectOptions = {
  isNative: boolean;
  origin: string;
  hostname: string;
  location: Location;
  liveOrigin: string;
  fetchFn: typeof fetch;
  timeoutMs: number;
  beforeRedirect?: () => Promise<void>;
  skipReachabilityProbe?: boolean;
};

let bundledLiveRedirectInFlight = false;
let bundledLiveRedirectAttempts = 0;

/** Resets module state between Vitest cases. */
export function resetCapacitorLiveBootStateForTesting(): void {
  bundledLiveRedirectInFlight = false;
  bundledLiveRedirectAttempts = 0;
  stopCapacitorLiveBootWatchForTesting();
}

export function getBundledLiveRedirectAttemptsForTesting(): number {
  return bundledLiveRedirectAttempts;
}

export async function maybeRedirectNativeToLiveSite(
  options: CapacitorLiveRedirectOptions
): Promise<boolean> {
  if (
    !shouldAttemptLiveRedirect({
      isNative: options.isNative,
      origin: options.origin,
      hostname: options.hostname,
    })
  ) {
    return false;
  }

  if (bundledLiveRedirectInFlight) {
    return false;
  }
  bundledLiveRedirectInFlight = true;
  bundledLiveRedirectAttempts += 1;

  const skipReachabilityProbe =
    options.skipReachabilityProbe ??
    (bundledLiveRedirectAttempts >= 2 &&
      typeof navigator !== 'undefined' &&
      navigator.onLine);

  try {
    await waitForCapacitorWebViewReady();

    if (!skipReachabilityProbe) {
      const reachable = await probeLiveOriginReachable({
        liveOrigin: options.liveOrigin,
        fetchFn: options.fetchFn,
        timeoutMs: options.timeoutMs,
      });
      if (!reachable) {
        return false;
      }
    } else if (
      typeof navigator !== 'undefined' &&
      navigator.onLine === false
    ) {
      return false;
    }

    if (options.beforeRedirect) {
      await options.beforeRedirect();
    }

    const target = buildLiveRedirectUrl(options.liveOrigin, options.location);
    try {
      options.location.replace(target);
    } catch (error) {
      console.error('[CapacitorLiveBoot] location.replace failed:', error);
      options.location.href = target;
    }
    return true;
  } finally {
    bundledLiveRedirectInFlight = false;
  }
}

/** When already on production, reload if the deployed web revision moved ahead of this bundle. */
export async function maybeReloadNativeLiveWebIfStale(options: {
  liveOrigin: string;
  fetchFn: typeof fetch;
  timeoutMs: number;
  currentRevision?: string;
  bypassThrottle?: boolean;
}): Promise<boolean> {
  return maybeReloadIfWebRevisionStale({
    revisionUrl: liveBuildRevisionUrl(options.liveOrigin),
    fetchFn: options.fetchFn,
    timeoutMs: options.timeoutMs,
    currentRevision: options.currentRevision,
    bypassThrottle: options.bypassThrottle,
  });
}

let liveBootForegroundHandler: (() => void) | null = null;

/** Retry bundled → live redirect and stale live reload when the app returns to foreground. */
export function startCapacitorLiveBootWatch(
  options: Omit<
    CapacitorLiveRedirectOptions,
    'origin' | 'hostname' | 'location' | 'skipReachabilityProbe'
  >
): void {
  if (!options.isNative || typeof window === 'undefined') {
    return;
  }

  const onForeground = (): void => {
    const origin = window.location.origin;
    const hostname = window.location.hostname;

    if (shouldAttemptLiveRedirect({ isNative: true, origin, hostname })) {
      void maybeRedirectNativeToLiveSite({
        ...options,
        origin,
        hostname,
        location: window.location,
      });
      return;
    }

    if (isOnCapacitorLiveHost(hostname)) {
      void maybeReloadNativeLiveWebIfStale({
        liveOrigin: options.liveOrigin,
        fetchFn: options.fetchFn,
        timeoutMs: options.timeoutMs,
        bypassThrottle: true,
      });
    }
  };

  if (liveBootForegroundHandler) {
    return;
  }
  liveBootForegroundHandler = onForeground;
  window.addEventListener('app-became-visible', onForeground);
}

/** Removes the foreground listener between Vitest cases. */
export function stopCapacitorLiveBootWatchForTesting(): void {
  if (liveBootForegroundHandler && typeof window !== 'undefined') {
    window.removeEventListener('app-became-visible', liveBootForegroundHandler);
  }
  liveBootForegroundHandler = null;
}
