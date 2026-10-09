import { WEB_BUILD_REVISION } from './web-build-info';

/** Throttle key: last time `/build-revision.txt` was fetched. */
export const WEB_REVISION_CHECK_AT_KEY = 'cp_web_revision_check_at';

/** Remote SHA we already reloaded for, so a lagging CDN cannot loop. */
export const WEB_REVISION_RELOADED_FOR_KEY = 'cp_web_revision_reloaded_for';

export const WEB_REVISION_CHECK_THROTTLE_MS = 60_000;

export const WEB_REVISION_WATCH_INTERVAL_MS = 120_000;

/** Mounted only while a memorize practice session is open. */
export const MEMORIZATION_SESSION_SELECTOR = 'app-memorization-practice-session';

const TEXT_ENTRY_INPUT_TYPES = new Set([
  'text',
  'email',
  'password',
  'search',
  'tel',
  'url',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
]);

export function liveBuildRevisionUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/build-revision.txt`;
}

export function shouldSkipWebRevisionCheck(options: {
  hostname?: string | null;
  currentRevision: string;
}): boolean {
  const host = (options.hostname ?? '').toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return true;
  }
  if (!options.currentRevision || options.currentRevision === 'local') {
    return true;
  }
  return false;
}

export function isTextEntryControl(el: Element | null): boolean {
  if (!el) {
    return false;
  }
  const html = el as HTMLElement;
  const tag = html.tagName;
  if (tag === 'TEXTAREA') {
    return !(el as HTMLTextAreaElement).disabled && !(el as HTMLTextAreaElement).readOnly;
  }
  if (tag === 'INPUT') {
    const input = el as HTMLInputElement;
    if (input.disabled || input.readOnly) {
      return false;
    }
    const type = (input.type || 'text').toLowerCase();
    return TEXT_ENTRY_INPUT_TYPES.has(type);
  }
  if (html.isContentEditable) {
    return true;
  }
  return html.getAttribute('role') === 'textbox';
}

export function isElementVisible(el: Element): boolean {
  const html = el as HTMLElement;
  if (!html.isConnected || html.hidden) {
    return false;
  }
  if (typeof html.getClientRects === 'function' && html.getClientRects().length > 0) {
    return true;
  }
  return (html.offsetHeight ?? 0) > 0 || (html.offsetWidth ?? 0) > 0;
}

function controlHasValue(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value.trim().length > 0;
  }
  const html = el as HTMLElement;
  if (html.isContentEditable) {
    return (html.innerText ?? '').trim().length > 0;
  }
  return false;
}

export function isMemorizationSessionActive(
  root: ParentNode = document
): boolean {
  return root.querySelector(MEMORIZATION_SESSION_SELECTOR) != null;
}

/**
 * True while the user is typing in a field, still inside a form/dialog, or has
 * unsaved text in a visible textarea / contenteditable.
 */
export function isActivelyEditingForm(
  root: Document = document
): boolean {
  const focused = root.activeElement;
  if (focused && focused !== root.body && focused !== root.documentElement) {
    if (isTextEntryControl(focused)) {
      return true;
    }
    if (focused.closest('form, [role="dialog"]')) {
      return true;
    }
  }
  const fields = root.querySelectorAll('textarea, [contenteditable="true"]');
  for (const field of fields) {
    if (isElementVisible(field) && controlHasValue(field)) {
      return true;
    }
  }
  return false;
}

export function shouldDeferWebRevisionReload(
  root: Document | null = typeof document === 'undefined' ? null : document
): boolean {
  if (!root) {
    return false;
  }
  return isActivelyEditingForm(root) || isMemorizationSessionActive(root);
}

function readSessionStore(): Storage | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage;
}

let pendingRemoteRevision: string | null = null;

function readHidden(options: {
  hidden?: boolean;
  isHidden?: () => boolean;
}): boolean {
  if (options.isHidden) {
    return options.isHidden();
  }
  if (options.hidden === true) {
    return true;
  }
  return typeof document !== 'undefined' && document.hidden;
}

function readBusy(options: { defer?: boolean }): boolean {
  if (options.defer !== undefined) {
    return options.defer;
  }
  return shouldDeferWebRevisionReload();
}

function performRevisionReload(options: {
  remoteRevision: string;
  store: Storage | null;
  reload?: () => void;
}): boolean {
  if (options.store?.getItem(WEB_REVISION_RELOADED_FOR_KEY) === options.remoteRevision) {
    pendingRemoteRevision = null;
    return false;
  }
  options.store?.setItem(WEB_REVISION_RELOADED_FOR_KEY, options.remoteRevision);
  pendingRemoteRevision = null;
  const reload = options.reload ?? (() => window.location.reload());
  reload();
  return true;
}

function reloadOrDeferPending(options: {
  remoteRevision: string;
  store: Storage | null;
  reload?: () => void;
  hidden?: boolean;
  isHidden?: () => boolean;
  defer?: boolean;
}): boolean {
  if (readHidden(options) || readBusy(options)) {
    pendingRemoteRevision = options.remoteRevision;
    return false;
  }
  return performRevisionReload(options);
}

/**
 * Reload once when the deployed `/build-revision.txt` no longer matches this
 * JS bundle. Throttled, and the same remote SHA cannot trigger a second reload.
 * Defers while a form is being edited or a memorize session is open; the next
 * idle check (blur, resume, or two-minute tick) reloads without looping.
 */
export async function maybeReloadIfWebRevisionStale(options: {
  revisionUrl: string;
  fetchFn: typeof fetch;
  timeoutMs: number;
  currentRevision?: string;
  reload?: () => void;
  nowMs?: number;
  sessionStore?: Storage | null;
  hidden?: boolean;
  isHidden?: () => boolean;
  defer?: boolean;
}): Promise<boolean> {
  if (readHidden(options)) {
    return false;
  }

  const store = options.sessionStore === undefined ? readSessionStore() : options.sessionStore;

  if (pendingRemoteRevision) {
    return reloadOrDeferPending({
      remoteRevision: pendingRemoteRevision,
      store,
      reload: options.reload,
      hidden: options.hidden,
      isHidden: options.isHidden,
      defer: options.defer,
    });
  }

  const now = options.nowMs ?? Date.now();
  if (store) {
    const lastCheck = Number(store.getItem(WEB_REVISION_CHECK_AT_KEY) || 0);
    if (lastCheck > 0 && now - lastCheck < WEB_REVISION_CHECK_THROTTLE_MS) {
      return false;
    }
    store.setItem(WEB_REVISION_CHECK_AT_KEY, String(now));
  }

  const currentRevision = options.currentRevision ?? WEB_BUILD_REVISION;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetchFn(options.revisionUrl, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      return false;
    }
    const remoteRevision = (await response.text()).trim();
    if (
      !remoteRevision ||
      remoteRevision === 'local' ||
      remoteRevision === currentRevision
    ) {
      pendingRemoteRevision = null;
      store?.removeItem(WEB_REVISION_RELOADED_FOR_KEY);
      return false;
    }
    return reloadOrDeferPending({
      remoteRevision,
      store,
      reload: options.reload,
      hidden: options.hidden,
      isHidden: options.isHidden,
      defer: options.defer,
    });
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

let webRevisionWatchStarted = false;
let webRevisionWatchIntervalId: ReturnType<typeof setInterval> | null = null;
let focusOutFlushTimer: ReturnType<typeof setTimeout> | null = null;
let documentFocusOutBound = false;

function onDocumentFocusOut(): void {
  if (focusOutFlushTimer != null) {
    clearTimeout(focusOutFlushTimer);
  }
  focusOutFlushTimer = setTimeout(() => {
    focusOutFlushTimer = null;
    checkCurrentOriginRevision();
  }, 0);
}

export function stopWebRevisionWatchForTesting(): void {
  webRevisionWatchStarted = false;
  pendingRemoteRevision = null;
  if (webRevisionWatchIntervalId != null) {
    clearInterval(webRevisionWatchIntervalId);
    webRevisionWatchIntervalId = null;
  }
  if (focusOutFlushTimer != null) {
    clearTimeout(focusOutFlushTimer);
    focusOutFlushTimer = null;
  }
  if (documentFocusOutBound && typeof document !== 'undefined') {
    document.removeEventListener('focusout', onDocumentFocusOut, true);
    documentFocusOutBound = false;
  }
}

function checkCurrentOriginRevision(): void {
  if (typeof window === 'undefined' || document.hidden) {
    return;
  }
  if (
    shouldSkipWebRevisionCheck({
      hostname: window.location.hostname,
      currentRevision: WEB_BUILD_REVISION,
    })
  ) {
    return;
  }
  void maybeReloadIfWebRevisionStale({
    revisionUrl: liveBuildRevisionUrl(window.location.origin),
    fetchFn: fetch,
    timeoutMs: 4000,
    hidden: document.hidden,
  });
}

/**
 * When a tab stays open across a Vercel deploy, compare `/build-revision.txt`
 * on resume and every two minutes while visible.
 */
export function startWebRevisionWatch(): void {
  if (webRevisionWatchStarted || typeof window === 'undefined') {
    return;
  }
  if (
    shouldSkipWebRevisionCheck({
      hostname: window.location.hostname,
      currentRevision: WEB_BUILD_REVISION,
    })
  ) {
    return;
  }
  webRevisionWatchStarted = true;
  if (!documentFocusOutBound) {
    document.addEventListener('focusout', onDocumentFocusOut, true);
    documentFocusOutBound = true;
  }
  checkCurrentOriginRevision();
  webRevisionWatchIntervalId = setInterval(() => {
    checkCurrentOriginRevision();
  }, WEB_REVISION_WATCH_INTERVAL_MS);
}
