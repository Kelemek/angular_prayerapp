/** Maps hourly spotlight internal key (`c:{id}` / `p:{id}` / `g:{id}`) to navigation. */

export function parseHourlySpotlightKey(
  key: string | null | undefined,
): { prefix: 'c' | 'p' | 'g'; id: string } | null {
  if (!key) return null;
  const colon = key.indexOf(':');
  if (colon < 1) return null;
  const prefix = key.slice(0, colon);
  const id = key.slice(colon + 1).trim();
  if (!id) return null;
  if (prefix === 'c' || prefix === 'p' || prefix === 'g') {
    return { prefix, id };
  }
  return null;
}

/** Maps hourly spotlight internal key to a Home `?prayerId=` value (all kinds). */
export function spotlightKeyToPrayerId(key: string | null | undefined): string | null {
  const parsed = parseHourlySpotlightKey(key);
  return parsed?.id ?? null;
}

/** Push `data.prayerKind` for hourly spotlight taps (see churchPushTarget). */
export function spotlightKeyToPushPrayerKind(
  key: string | null | undefined,
): 'group' | 'personal' | null {
  const parsed = parseHourlySpotlightKey(key);
  if (!parsed) return null;
  if (parsed.prefix === 'g') return 'group';
  if (parsed.prefix === 'p') return 'personal';
  return null;
}

/** Builds email/push app link for hourly prayer spotlight. */
export function buildPrayerSpotlightAppLink(
  appUrl: string,
  spotlightKey: string | null | undefined,
): string {
  const base = appUrl.replace(/\/$/, '');
  const parsed = parseHourlySpotlightKey(spotlightKey);
  if (!parsed) return `${base}/`;
  if (parsed.prefix === 'g') {
    return `${base}/?filter=groups&prayerId=${encodeURIComponent(parsed.id)}`;
  }
  return `${base}/?prayerId=${encodeURIComponent(parsed.id)}`;
}
