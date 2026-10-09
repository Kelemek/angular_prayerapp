/** sessionStorage key: one full reload per page lifetime for stale hashed chunks after deploy. */
export const STALE_CHUNK_RELOAD_GUARD_KEY = 'cp_chunk_reload';

const STALE_CHUNK_PATTERNS = [
  'failed to fetch dynamically imported module',
  'loading chunk',
  'chunkloaderror',
  'is not a valid javascript mime type for module script',
] as const;

function collectErrorTexts(candidate: unknown, depth = 0): string[] {
  if (depth > 3 || candidate == null) {
    return [];
  }

  const texts: string[] = [];

  if (typeof candidate === 'string') {
    texts.push(candidate);
    return texts;
  }

  if (candidate instanceof Error) {
    texts.push(candidate.name, candidate.message);
    return texts;
  }

  if (typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>;
    if (typeof record['name'] === 'string') {
      texts.push(record['name']);
    }
    if (typeof record['message'] === 'string') {
      texts.push(record['message']);
    }
    if ('reason' in record) {
      texts.push(...collectErrorTexts(record['reason'], depth + 1));
    }
    if ('error' in record) {
      texts.push(...collectErrorTexts(record['error'], depth + 1));
    }
    if ('ngOriginalError' in record) {
      texts.push(...collectErrorTexts(record['ngOriginalError'], depth + 1));
    }
  }

  return texts;
}

function normalizedHaystack(candidates: unknown[]): string {
  return candidates
    .flatMap((c) => collectErrorTexts(c))
    .join('\n')
    .toLowerCase();
}

/**
 * True when the failure is a stale hashed JS chunk after deploy (MIME module script
 * or dynamic import / chunk load errors).
 */
export function isStaleChunkFailure(...candidates: unknown[]): boolean {
  const haystack = normalizedHaystack(candidates);
  if (!haystack) {
    return false;
  }

  if (STALE_CHUNK_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    return true;
  }

  return haystack.includes('mime type') && haystack.includes('module script');
}

/** Call after Angular bootstrap succeeds so a later deploy in the same tab can recover again. */
export function clearStaleChunkReloadGuard(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(STALE_CHUNK_RELOAD_GUARD_KEY);
}

function isReloadGuardSet(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(STALE_CHUNK_RELOAD_GUARD_KEY) === '1';
}

/**
 * If the error looks like a stale chunk failure, reload once per page lifetime.
 * Returns true when a reload was scheduled.
 */
export function maybeReloadForStaleChunk(...candidates: unknown[]): boolean {
  if (typeof window === 'undefined' || !isStaleChunkFailure(...candidates)) {
    return false;
  }

  if (isReloadGuardSet()) {
    return false;
  }

  sessionStorage.setItem(STALE_CHUNK_RELOAD_GUARD_KEY, '1');
  window.location.reload();
  return true;
}
