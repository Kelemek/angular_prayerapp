import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MEMORIZATION_SESSION_SELECTOR,
  WEB_REVISION_CHECK_AT_KEY,
  WEB_REVISION_CHECK_THROTTLE_MS,
  WEB_REVISION_RELOADED_FOR_KEY,
  isMemorizationSessionActive,
  liveBuildRevisionUrl,
  maybeReloadIfWebRevisionStale,
  shouldDeferWebRevisionReload,
  shouldSkipWebRevisionCheck,
  startWebRevisionWatch,
  stopWebRevisionWatchForTesting,
} from './web-revision-reload';

describe('web-revision-reload', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    stopWebRevisionWatchForTesting();
    vi.unstubAllGlobals();
    document.querySelectorAll(MEMORIZATION_SESSION_SELECTOR).forEach((el) => el.remove());
    document.querySelectorAll('textarea').forEach((el) => el.remove());
  });

  it('builds the revision URL without a double slash', () => {
    expect(liveBuildRevisionUrl('https://cpprayer.cp-church.org/')).toBe(
      'https://cpprayer.cp-church.org/build-revision.txt'
    );
  });

  it('skips localhost and local revisions', () => {
    expect(
      shouldSkipWebRevisionCheck({
        hostname: 'localhost',
        currentRevision: 'abc1234',
      })
    ).toBe(true);
    expect(
      shouldSkipWebRevisionCheck({
        hostname: 'cpprayer.cp-church.org',
        currentRevision: 'local',
      })
    ).toBe(true);
    expect(
      shouldSkipWebRevisionCheck({
        hostname: 'cpprayer.cp-church.org',
        currentRevision: 'abc1234',
      })
    ).toBe(false);
    expect(
      shouldSkipWebRevisionCheck({
        hostname: '',
        currentRevision: 'abc1234',
      })
    ).toBe(true);
  });

  it('reloads when remote revision differs', async () => {
    const reload = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1\n',
    });
    const reloaded = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 1_000,
    });
    expect(reloaded).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(WEB_REVISION_RELOADED_FOR_KEY)).toBe('newsha1');
  });

  it('does not reload when revisions match and clears the loop guard', async () => {
    sessionStorage.setItem(WEB_REVISION_RELOADED_FOR_KEY, 'abc1234');
    const reload = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'abc1234',
    });
    const reloaded = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'abc1234',
      reload,
      nowMs: 1_000,
    });
    expect(reloaded).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(WEB_REVISION_RELOADED_FOR_KEY)).toBeNull();
  });

  it('does not reload twice for the same remote SHA', async () => {
    const reload = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1',
    });
    const first = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 1_000,
    });
    const second = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 120_000,
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not throttle the first check when no prior timestamp exists', async () => {
    const reload = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1',
    });
    const reloaded = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 1_000,
    });
    expect(reloaded).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('bypasses the 60s throttle when the app becomes active', async () => {
    sessionStorage.setItem(WEB_REVISION_CHECK_AT_KEY, '100000');
    const reload = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1',
    });
    const reloaded = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 130_000,
      bypassThrottle: true,
    });
    expect(reloaded).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('throttles checks within 60s', async () => {
    const reload = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1',
    });
    sessionStorage.setItem(WEB_REVISION_CHECK_AT_KEY, '100000');
    const reloaded = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 130_000,
    });
    expect(reloaded).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('defers reload while editing and flushes once idle', async () => {
    const reload = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1',
    });
    const deferred = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 1_000,
      defer: true,
    });
    expect(deferred).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(WEB_REVISION_RELOADED_FOR_KEY)).toBeNull();

    const flushed = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 2_000,
      defer: false,
    });
    expect(flushed).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(WEB_REVISION_RELOADED_FOR_KEY)).toBe('newsha1');
  });

  it('defers reload during a memorization session', async () => {
    document.body.appendChild(
      document.createElement('app-memorization-practice-session')
    );
    const reload = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'newsha1',
    });
    const reloaded = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 1_000,
    });
    expect(reloaded).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(WEB_REVISION_RELOADED_FOR_KEY)).toBeNull();
  });

  it('defers while a text field is focused', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    expect(shouldDeferWebRevisionReload()).toBe(true);
    textarea.remove();
  });

  it('detects an open memorization practice session', () => {
    expect(isMemorizationSessionActive()).toBe(false);
    const session = document.createElement('app-memorization-practice-session');
    document.body.appendChild(session);
    expect(isMemorizationSessionActive()).toBe(true);
    expect(shouldDeferWebRevisionReload()).toBe(true);
    session.remove();
    expect(shouldDeferWebRevisionReload()).toBe(false);
    expect(MEMORIZATION_SESSION_SELECTOR).toBe('app-memorization-practice-session');
  });

  it('does not reload if the tab hides while the revision fetch is in flight', async () => {
    const reload = vi.fn();
    let hidden = false;
    const fetchFn = vi.fn().mockImplementation(async () => {
      hidden = true;
      return {
        ok: true,
        text: async () => 'newsha1',
      };
    });
    const reloaded = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 1_000,
      isHidden: () => hidden,
      defer: false,
    });
    expect(reloaded).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(WEB_REVISION_RELOADED_FOR_KEY)).toBeNull();

    hidden = false;
    const flushed = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      nowMs: 2_000,
      isHidden: () => hidden,
      defer: false,
    });
    expect(flushed).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not reload while the document is hidden', async () => {
    const reload = vi.fn();
    const fetchFn = vi.fn();
    const reloaded = await maybeReloadIfWebRevisionStale({
      revisionUrl: 'https://example.com/build-revision.txt',
      fetchFn,
      timeoutMs: 1000,
      currentRevision: 'oldsha1',
      reload,
      hidden: true,
    });
    expect(reloaded).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('reloads on window focus inside the throttle window', async () => {
    sessionStorage.setItem(WEB_REVISION_CHECK_AT_KEY, String(Date.now()));
    const reload = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'deployed1',
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', {
      hostname: 'cpprayer.cp-church.org',
      origin: 'https://cpprayer.cp-church.org',
      reload,
    });
    startWebRevisionWatch();
    expect(fetchMock).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('checks on the next tap after the throttle window without waiting two minutes', async () => {
    sessionStorage.setItem(WEB_REVISION_CHECK_AT_KEY, String(Date.now()));
    const reload = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'deployed1',
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', {
      hostname: 'cpprayer.cp-church.org',
      origin: 'https://cpprayer.cp-church.org',
      reload,
    });
    startWebRevisionWatch();
    document.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();

    sessionStorage.setItem(
      WEB_REVISION_CHECK_AT_KEY,
      String(Date.now() - WEB_REVISION_CHECK_THROTTLE_MS - 1)
    );
    document.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
