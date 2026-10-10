import { STALE_CHUNK_RELOAD_GUARD_KEY } from './stale-chunk-recovery';

export { STALE_CHUNK_RELOAD_GUARD_KEY };

/** Inline boot splash in `index.html`; still counts as empty until Angular mounts. */
export const BOOT_SPLASH_ELEMENT_ID = 'cp-boot-splash';

/**
 * Wait before the first empty-`app-root` reload on a cold start. Must exceed slow
 * `APP_INITIALIZER` work (branding Supabase fetch up to ~10s, admin auth up to 5s,
 * native pre-bootstrap hydrate ~1.2s).
 */
export const BOOT_WATCHDOG_INITIAL_MS = 22_000;

/**
 * After {@link BOOT_WATCHDOG_INITIAL_MS}, when `cp_chunk_reload` is already set,
 * wait this long before showing the fallback panel if `app-root` is still empty.
 */
export const BOOT_WATCHDOG_POST_GUARD_MS = 8_000;

export function bootWatchdogPanelDelayMs(): number {
  return BOOT_WATCHDOG_INITIAL_MS + BOOT_WATCHDOG_POST_GUARD_MS;
}

export type BootRecoveryAction = 'reload-once' | 'show-panel-only' | 'ignore';

export function isHashedBundleScriptSrc(src: string | null | undefined): boolean {
  if (!src) {
    return false;
  }
  const path = src.split('?')[0]?.split('#')[0] ?? '';
  const name = path.split('/').pop() ?? '';
  if (!name.endsWith('.js')) {
    return false;
  }
  return (
    name.startsWith('main-') ||
    name.startsWith('polyfills-') ||
    name.startsWith('chunk-')
  );
}

export function isAppRootEmpty(root: HTMLElement | null): boolean {
  if (!root) {
    return true;
  }
  const children = Array.from(root.children);
  if (children.length === 0) {
    return (root.textContent ?? '').trim() === '';
  }
  if (
    children.length === 1 &&
    children[0] instanceof HTMLElement &&
    children[0].id === BOOT_SPLASH_ELEMENT_ID
  ) {
    return true;
  }
  return false;
}

export function isStaleChunkReloadGuardSet(
  store: Pick<Storage, 'getItem'> | null | undefined
): boolean {
  if (!store) {
    return false;
  }
  return store.getItem(STALE_CHUNK_RELOAD_GUARD_KEY) === '1';
}

/** Returns false when storage is unavailable so callers can avoid reload loops. */
export function trySetStaleChunkReloadGuard(
  store: Pick<Storage, 'getItem' | 'setItem'> | null | undefined
): boolean {
  if (!store) {
    return false;
  }
  try {
    store.setItem(STALE_CHUNK_RELOAD_GUARD_KEY, '1');
    return store.getItem(STALE_CHUNK_RELOAD_GUARD_KEY) === '1';
  } catch {
    return false;
  }
}

export type BootReloadOnceAction = 'reload' | 'show-panel';

export function bootReloadOnceAction(
  guardWritable: boolean
): BootReloadOnceAction {
  return guardWritable ? 'reload' : 'show-panel';
}

export function scriptErrorRecoveryAction(options: {
  scriptSrc: string | null | undefined;
  guardSet: boolean;
}): BootRecoveryAction {
  if (!isHashedBundleScriptSrc(options.scriptSrc)) {
    return 'ignore';
  }
  if (options.guardSet) {
    return 'show-panel-only';
  }
  return 'reload-once';
}

export type BootWatchdogPhase = 'initial' | 'post-reload';

export function watchdogRecoveryAction(options: {
  guardSet: boolean;
  appRootEmpty: boolean;
  phase: BootWatchdogPhase;
}): BootRecoveryAction {
  if (!options.appRootEmpty) {
    return 'ignore';
  }
  if (options.phase === 'initial') {
    if (options.guardSet) {
      return 'ignore';
    }
    return 'reload-once';
  }
  if (options.guardSet) {
    return 'show-panel-only';
  }
  return 'ignore';
}

export function bootstrapFailureRecoveryAction(guardSet: boolean): BootRecoveryAction {
  if (guardSet) {
    return 'show-panel-only';
  }
  return 'reload-once';
}

export function bootRecoveryPanelBackground(isDark: boolean): string {
  return isDark ? '#2B2B2B' : '#E8E5E1';
}

export function bootRecoveryPanelHtml(isDark: boolean): string {
  const bg = bootRecoveryPanelBackground(isDark);
  const titleColor = isDark ? '#F3F4F6' : '#374151';
  const bodyColor = isDark ? '#D1D5DB' : '#6B7280';
  const buttonBg = '#3B82F6';
  return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:${bg};font-family:system-ui,-apple-system,sans-serif;padding:1.5rem;box-sizing:border-box;">
      <div style="text-align:center;max-width:20rem;padding:1.5rem;background:${isDark ? '#1F2937' : '#ffffff'};border-radius:0.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.12);">
        <h1 style="color:${titleColor};font-size:1.125rem;font-weight:600;margin:0 0 0.75rem;">Having trouble loading</h1>
        <p style="color:${bodyColor};font-size:0.875rem;margin:0 0 1.25rem;line-height:1.4;">The app did not start. Try reloading to pick up the latest version.</p>
        <button type="button" id="cp-boot-reload-btn" style="padding:0.5rem 1rem;background:${buttonBg};color:#fff;border:none;border-radius:0.375rem;font-size:0.875rem;cursor:pointer;">Reload</button>
      </div>
    </div>
  `;
}

export function renderBootRecoveryPanel(
  root: HTMLElement,
  options?: { isDark?: boolean }
): void {
  const isDark =
    options?.isDark ??
    (typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'));
  root.innerHTML = bootRecoveryPanelHtml(isDark);
  const button = root.querySelector('#cp-boot-reload-btn');
  if (button instanceof HTMLButtonElement) {
    button.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

export function cacheBustingReloadHref(
  location: Pick<Location, 'href' | 'pathname' | 'search'>
): string {
  const base = `${location.pathname}${location.search}`;
  const separator = location.search ? '&' : '?';
  return `${base}${separator}_cp_boot=${Date.now()}`;
}
