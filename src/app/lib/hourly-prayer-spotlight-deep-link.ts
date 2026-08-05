/** Maps hourly spotlight internal key (`c:{id}` / `p:{id}`) to a Home `?prayerId=` value. */
export function spotlightKeyToPrayerId(key: string | null | undefined): string | null {
  if (!key) return null;
  const colon = key.indexOf(':');
  if (colon < 1) return null;
  const kind = key.slice(0, colon);
  const id = key.slice(colon + 1).trim();
  if (!id) return null;
  if (kind === 'c' || kind === 'p') return id;
  return null;
}

/** Builds email/push app link for hourly prayer spotlight (home, or deep link to the prayer). */
export function buildPrayerSpotlightAppLink(
  appUrl: string,
  spotlightKey: string | null | undefined
): string {
  const base = appUrl.replace(/\/$/, '');
  const prayerId = spotlightKeyToPrayerId(spotlightKey);
  if (!prayerId) return `${base}/`;
  return `${base}/?prayerId=${encodeURIComponent(prayerId)}`;
}
