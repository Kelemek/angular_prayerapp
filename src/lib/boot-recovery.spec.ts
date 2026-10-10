import { afterEach, describe, expect, it } from 'vitest';
import {
  BOOT_SPLASH_ELEMENT_ID,
  BOOT_WATCHDOG_INITIAL_MS,
  BOOT_WATCHDOG_POST_GUARD_MS,
  bootstrapFailureRecoveryAction,
  bootRecoveryPanelHtml,
  bootWatchdogPanelDelayMs,
  cacheBustingReloadHref,
  isAppRootEmpty,
  isHashedBundleScriptSrc,
  bootReloadOnceAction,
  renderBootRecoveryPanel,
  scriptErrorRecoveryAction,
  trySetStaleChunkReloadGuard,
  watchdogRecoveryAction,
} from './boot-recovery';
import { STALE_CHUNK_RELOAD_GUARD_KEY } from './stale-chunk-recovery';

describe('boot-recovery', () => {
  afterEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  describe('isHashedBundleScriptSrc', () => {
    it('matches main, polyfills, and chunk bundles', () => {
      expect(isHashedBundleScriptSrc('/main-ABC123.js')).toBe(true);
      expect(isHashedBundleScriptSrc('/polyfills-RV3JTMEC.js')).toBe(true);
      expect(isHashedBundleScriptSrc('https://x/chunk-DxM1GV2Q.js?v=1')).toBe(
        true
      );
    });

    it('ignores unrelated scripts', () => {
      expect(isHashedBundleScriptSrc('/boot-recovery.js')).toBe(false);
      expect(isHashedBundleScriptSrc('/vendor.js')).toBe(false);
      expect(isHashedBundleScriptSrc('')).toBe(false);
    });
  });

  describe('isAppRootEmpty', () => {
    it('is true when root is missing or has no children', () => {
      expect(isAppRootEmpty(null)).toBe(true);
      const root = document.createElement('app-root');
      expect(isAppRootEmpty(root)).toBe(true);
    });

    it('is false when root has content', () => {
      const root = document.createElement('app-root');
      root.appendChild(document.createElement('div'));
      expect(isAppRootEmpty(root)).toBe(false);
    });

    it('treats boot splash only as still loading', () => {
      const root = document.createElement('app-root');
      const splash = document.createElement('div');
      splash.id = BOOT_SPLASH_ELEMENT_ID;
      root.appendChild(splash);
      expect(isAppRootEmpty(root)).toBe(true);
    });
  });

  describe('scriptErrorRecoveryAction', () => {
    it('reloads once for hashed bundle script errors', () => {
      expect(
        scriptErrorRecoveryAction({
          scriptSrc: '/main-O7QAIG7A.js',
          guardSet: false,
        })
      ).toBe('reload-once');
    });

    it('shows panel only when guard is set', () => {
      expect(
        scriptErrorRecoveryAction({
          scriptSrc: '/chunk-OLD.js',
          guardSet: true,
        })
      ).toBe('show-panel-only');
    });

    it('ignores unrelated script errors', () => {
      expect(
        scriptErrorRecoveryAction({
          scriptSrc: '/boot-recovery.js',
          guardSet: false,
        })
      ).toBe('ignore');
    });
  });

  describe('watchdogRecoveryAction', () => {
    it('reloads once on initial tick when app-root is still empty', () => {
      expect(
        watchdogRecoveryAction({
          guardSet: false,
          appRootEmpty: true,
          phase: 'initial',
        })
      ).toBe('reload-once');
    });

    it('waits on initial tick when guard is set (bootstrap may still be running)', () => {
      expect(
        watchdogRecoveryAction({
          guardSet: true,
          appRootEmpty: true,
          phase: 'initial',
        })
      ).toBe('ignore');
    });

    it('shows panel on post-reload tick when guard is set and root is empty', () => {
      expect(
        watchdogRecoveryAction({
          guardSet: true,
          appRootEmpty: true,
          phase: 'post-reload',
        })
      ).toBe('show-panel-only');
    });

    it('ignores post-reload tick when guard is not set', () => {
      expect(
        watchdogRecoveryAction({
          guardSet: false,
          appRootEmpty: true,
          phase: 'post-reload',
        })
      ).toBe('ignore');
    });

    it('ignores when app mounted', () => {
      expect(
        watchdogRecoveryAction({
          guardSet: false,
          appRootEmpty: false,
          phase: 'initial',
        })
      ).toBe('ignore');
    });
  });

  describe('bootstrapFailureRecoveryAction', () => {
    it('reloads once on first bootstrap failure', () => {
      expect(bootstrapFailureRecoveryAction(false)).toBe('reload-once');
    });

    it('shows panel only when guard already set', () => {
      expect(bootstrapFailureRecoveryAction(true)).toBe('show-panel-only');
    });
  });

  describe('renderBootRecoveryPanel', () => {
    it('renders reload UI into app-root', () => {
      const root = document.createElement('app-root');
      document.body.appendChild(root);
      renderBootRecoveryPanel(root);
      expect(root.querySelector('#cp-boot-reload-btn')).not.toBeNull();
      expect(root.textContent).toContain('Having trouble loading');
    });
  });

  describe('bootRecoveryPanelHtml', () => {
    it('uses light and dark backgrounds', () => {
      expect(bootRecoveryPanelHtml(false)).toContain('#E8E5E1');
      expect(bootRecoveryPanelHtml(true)).toContain('#2B2B2B');
    });
  });

  describe('cacheBustingReloadHref', () => {
    it('appends cache-bust query param', () => {
      const href = cacheBustingReloadHref({
        href: 'https://x/',
        pathname: '/',
        search: '',
      });
      expect(href).toMatch(/^\/?\?_cp_boot=\d+$/);
    });
  });

  it('exports watchdog timing constants', () => {
    expect(BOOT_WATCHDOG_INITIAL_MS).toBe(22_000);
    expect(BOOT_WATCHDOG_POST_GUARD_MS).toBe(8_000);
    expect(bootWatchdogPanelDelayMs()).toBe(30_000);
  });

  it('shares stale chunk guard key', () => {
    expect(STALE_CHUNK_RELOAD_GUARD_KEY).toBe('cp_chunk_reload');
  });

  describe('trySetStaleChunkReloadGuard', () => {
    it('sets the guard when storage works', () => {
      expect(trySetStaleChunkReloadGuard(sessionStorage)).toBe(true);
      expect(sessionStorage.getItem(STALE_CHUNK_RELOAD_GUARD_KEY)).toBe('1');
    });

    it('returns false when storage is missing', () => {
      expect(trySetStaleChunkReloadGuard(null)).toBe(false);
    });
  });

  describe('bootReloadOnceAction', () => {
    it('reloads only when the guard can be written', () => {
      expect(bootReloadOnceAction(true)).toBe('reload');
      expect(bootReloadOnceAction(false)).toBe('show-panel');
    });
  });
});
