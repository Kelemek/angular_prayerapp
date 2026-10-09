export const APP_BECAME_VISIBLE_EVENT = 'app-became-visible';

export const BLANK_RESUME_RELOAD_GUARD_KEY = 'cp_blank_resume_reload';

export const RESUME_PAINT_CLASS = 'cp-resume-paint';

export const ROUTED_PAGE_SELECTOR = [
  'app-home',
  'app-login',
  'app-admin',
  'app-info',
  'app-privacy',
  'app-support',
  'app-presentation',
].join(', ');

export const ROUTER_OUTLET_SELECTOR = 'router-outlet';

export function isAppShellAttached(root: ParentNode = document): boolean {
  return root.querySelector(ROUTER_OUTLET_SELECTOR) != null;
}

export function dispatchAppBecameVisible(): void {
  window.dispatchEvent(new CustomEvent(APP_BECAME_VISIBLE_EVENT));
}

export function isRoutedPagePainted(root: ParentNode = document): boolean {
  const page = root.querySelector(ROUTED_PAGE_SELECTOR);
  if (!page) {
    return false;
  }
  const el = page as HTMLElement;
  if (typeof el.getBoundingClientRect === 'function') {
    const rect = el.getBoundingClientRect();
    if (rect.height > 8) {
      return true;
    }
  }
  return (el.scrollHeight ?? 0) > 8;
}

export function applyResumePaintHint(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.add(RESUME_PAINT_CLASS);
  void document.body?.offsetHeight;
  document.documentElement.classList.remove(RESUME_PAINT_CLASS);
}

export function clearBlankResumeReloadGuard(
  store: Storage | null = typeof sessionStorage === 'undefined' ? null : sessionStorage
): void {
  store?.removeItem(BLANK_RESUME_RELOAD_GUARD_KEY);
}

/**
 * One full reload when resume still has no routed page painted.
 * Guard survives reload so a persistently empty shell cannot loop.
 */
export function maybeReloadBlankVisiblePage(options: {
  hidden: boolean;
  painted: boolean;
  /** False until this document has shown a routed page — avoids reloading during auth/lazy boot. */
  previouslyPainted?: boolean;
  /** True while Angular still has a `router-outlet` — skip reload during lazy route swaps. */
  shellAttached?: boolean;
  reload?: () => void;
  sessionStore?: Storage | null;
}): boolean {
  if (options.painted) {
    clearBlankResumeReloadGuard(options.sessionStore);
    return false;
  }
  if (
    options.hidden ||
    options.previouslyPainted === false ||
    options.shellAttached === true
  ) {
    return false;
  }
  const store =
    options.sessionStore === undefined
      ? typeof sessionStorage === 'undefined'
        ? null
        : sessionStorage
      : options.sessionStore;
  if (store?.getItem(BLANK_RESUME_RELOAD_GUARD_KEY) === '1') {
    return false;
  }
  store?.setItem(BLANK_RESUME_RELOAD_GUARD_KEY, '1');
  const reload = options.reload ?? (() => window.location.reload());
  reload();
  return true;
}
