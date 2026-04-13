/** Hostnames allowed for tutorial iframe `src` (embed URLs only). */
const ALLOWED_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
]);

/**
 * Returns a normalized embed URL string if the input is a safe https URL on an allowlisted host.
 * Accepts watch URLs and normalizes YouTube watch links to `/embed/` form when possible.
 */
export function normalizeAdminHelpVideoEmbedUrl(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_EMBED_HOSTS.has(host)) {
    return null;
  }

  // youtube.com/watch?v=ID → embed
  if (
    (host === 'www.youtube.com' || host === 'youtube.com') &&
    url.pathname === '/watch' &&
    url.searchParams.get('v')
  ) {
    const id = url.searchParams.get('v');
    if (id && /^[\w-]{6,}$/.test(id)) {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    }
  }

  // Already embed paths
  if (host === 'www.youtube.com' || host === 'youtube.com' || host === 'www.youtube-nocookie.com') {
    if (url.pathname.startsWith('/embed/')) {
      return url.toString();
    }
    return null;
  }

  if (host === 'player.vimeo.com' && url.pathname.length > 1) {
    return url.toString();
  }

  return null;
}
