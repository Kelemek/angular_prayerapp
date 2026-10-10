/**
 * Unhashed boot guard — runs before Angular module scripts.
 * Logic mirrors src/lib/boot-recovery.ts (unit-tested there).
 */
(function () {
  var GUARD_KEY = 'cp_chunk_reload';
  var BOOT_SPLASH_ID = 'cp-boot-splash';
  /** Cold start: wait for APP_INITIALIZER before empty-root reload (mirrors boot-recovery.ts). */
  var WATCHDOG_INITIAL_MS = 22000;
  /** After guard is set, extra wait before showing the panel. */
  var WATCHDOG_POST_GUARD_MS = 8000;

  function guardSet() {
    try {
      return sessionStorage.getItem(GUARD_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setGuard() {
    try {
      sessionStorage.setItem(GUARD_KEY, '1');
    } catch (e) {
      /* ignore */
    }
  }

  function isHashedBundleScriptSrc(src) {
    if (!src) {
      return false;
    }
    var path = src.split('?')[0].split('#')[0];
    var name = path.split('/').pop() || '';
    if (!name.endsWith('.js')) {
      return false;
    }
    return (
      name.indexOf('main-') === 0 ||
      name.indexOf('polyfills-') === 0 ||
      name.indexOf('chunk-') === 0
    );
  }

  function isAppRootEmpty() {
    var root = document.querySelector('app-root');
    if (!root) {
      return true;
    }
    if (root.childElementCount === 0) {
      return !(root.textContent || '').trim();
    }
    if (
      root.childElementCount === 1 &&
      root.children[0] &&
      root.children[0].id === BOOT_SPLASH_ID
    ) {
      return true;
    }
    return false;
  }

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function panelHtml() {
    var dark = isDark();
    var bg = dark ? '#2B2B2B' : '#E8E5E1';
    var titleColor = dark ? '#F3F4F6' : '#374151';
    var bodyColor = dark ? '#D1D5DB' : '#6B7280';
    var cardBg = dark ? '#1F2937' : '#ffffff';
    return (
      '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:' +
      bg +
      ';font-family:system-ui,-apple-system,sans-serif;padding:1.5rem;box-sizing:border-box;">' +
      '<div style="text-align:center;max-width:20rem;padding:1.5rem;background:' +
      cardBg +
      ';border-radius:0.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.12);">' +
      '<h1 style="color:' +
      titleColor +
      ';font-size:1.125rem;font-weight:600;margin:0 0 0.75rem;">Having trouble loading</h1>' +
      '<p style="color:' +
      bodyColor +
      ';font-size:0.875rem;margin:0 0 1.25rem;line-height:1.4;">The app did not start. Try reloading to pick up the latest version.</p>' +
      '<button type="button" id="cp-boot-reload-btn" style="padding:0.5rem 1rem;background:#3B82F6;color:#fff;border:none;border-radius:0.375rem;font-size:0.875rem;cursor:pointer;">Reload</button>' +
      '</div></div>'
    );
  }

  function showPanel() {
    var root = document.querySelector('app-root');
    if (!root) {
      return;
    }
    root.innerHTML = panelHtml();
    var btn = root.querySelector('#cp-boot-reload-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        window.location.reload();
      });
    }
  }

  function cacheBustingReload() {
    var base = window.location.pathname + window.location.search;
    var sep = window.location.search ? '&' : '?';
    window.location.href = base + sep + '_cp_boot=' + Date.now();
  }

  function reloadOnce() {
    try {
      sessionStorage.setItem(GUARD_KEY, '1');
      if (sessionStorage.getItem(GUARD_KEY) !== '1') {
        showPanel();
        return;
      }
    } catch (e) {
      showPanel();
      return;
    }
    cacheBustingReload();
  }

  function onScriptError(event) {
    var target = event.target;
    if (!target || target.tagName !== 'SCRIPT') {
      return;
    }
    var src = target.src || target.getAttribute('src') || '';
    if (!isHashedBundleScriptSrc(src)) {
      return;
    }
    if (guardSet()) {
      showPanel();
      return;
    }
    reloadOnce();
  }

  window.addEventListener('error', onScriptError, true);

  window.setTimeout(function () {
    if (!isAppRootEmpty()) {
      return;
    }
    if (guardSet()) {
      return;
    }
    reloadOnce();
  }, WATCHDOG_INITIAL_MS);

  window.setTimeout(function () {
    if (!isAppRootEmpty()) {
      return;
    }
    if (guardSet()) {
      showPanel();
    }
  }, WATCHDOG_INITIAL_MS + WATCHDOG_POST_GUARD_MS);
})();
