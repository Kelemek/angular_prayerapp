import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  STALE_CHUNK_RELOAD_GUARD_KEY,
  clearStaleChunkReloadGuard,
  isStaleChunkFailure,
  maybeReloadForStaleChunk,
} from './stale-chunk-recovery';

describe('stale-chunk-recovery', () => {
  const reload = vi.fn();

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    reload.mockClear();
  });

  function stubReload(): void {
    vi.stubGlobal('location', { reload });
  }

  describe('isStaleChunkFailure', () => {
    it('matches dynamic import TypeError', () => {
      const err = new TypeError('Failed to fetch dynamically imported module: https://x/chunk-ABC.js');
      expect(isStaleChunkFailure(err)).toBe(true);
    });

    it('matches MIME module script TypeError', () => {
      const err = new TypeError(
        "'text/html' is not a valid JavaScript MIME type for module script 'https://x/chunk-ABC.js'"
      );
      expect(isStaleChunkFailure(err)).toBe(true);
    });

    it('matches Loading chunk message', () => {
      expect(isStaleChunkFailure(new Error('Loading chunk 42 failed'))).toBe(true);
    });

    it('matches ChunkLoadError name', () => {
      const err = new Error('timeout');
      err.name = 'ChunkLoadError';
      expect(isStaleChunkFailure(err)).toBe(true);
    });

    it('matches MIME + module script in error event message only', () => {
      expect(
        isStaleChunkFailure({
          message:
            "TypeError: 'text/html' is not a valid JavaScript MIME type for module script",
          error: null,
        })
      ).toBe(true);
    });

    it('does not match unrelated errors', () => {
      expect(isStaleChunkFailure(new Error('Network request failed'))).toBe(false);
      expect(isStaleChunkFailure(null)).toBe(false);
    });
  });

  describe('maybeReloadForStaleChunk', () => {
    it('reloads once and sets guard', () => {
      stubReload();
      const err = new TypeError('Failed to fetch dynamically imported module');

      expect(maybeReloadForStaleChunk(err)).toBe(true);
      expect(reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(STALE_CHUNK_RELOAD_GUARD_KEY)).toBe('1');
    });

    it('does not reload when guard is already set', () => {
      stubReload();
      sessionStorage.setItem(STALE_CHUNK_RELOAD_GUARD_KEY, '1');
      const err = new TypeError('Failed to fetch dynamically imported module');

      expect(maybeReloadForStaleChunk(err)).toBe(false);
      expect(reload).not.toHaveBeenCalled();
    });

    it('keeps guard across a reload until bootstrap clears it', () => {
      stubReload();
      const err = new TypeError('Failed to fetch dynamically imported module');

      maybeReloadForStaleChunk(err);
      reload.mockClear();

      expect(maybeReloadForStaleChunk(err)).toBe(false);
      clearStaleChunkReloadGuard();
      expect(maybeReloadForStaleChunk(err)).toBe(true);
    });

    it('does not reload for non-chunk errors', () => {
      stubReload();
      expect(maybeReloadForStaleChunk(new Error('other'))).toBe(false);
      expect(reload).not.toHaveBeenCalled();
    });

    it('can reload again after guard is cleared', () => {
      stubReload();
      const err = new TypeError('Failed to fetch dynamically imported module');

      expect(maybeReloadForStaleChunk(err)).toBe(true);
      reload.mockClear();
      clearStaleChunkReloadGuard();

      expect(maybeReloadForStaleChunk(err)).toBe(true);
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearStaleChunkReloadGuard', () => {
    it('removes the guard key', () => {
      sessionStorage.setItem(STALE_CHUNK_RELOAD_GUARD_KEY, '1');
      clearStaleChunkReloadGuard();
      expect(sessionStorage.getItem(STALE_CHUNK_RELOAD_GUARD_KEY)).toBeNull();
    });
  });
});
