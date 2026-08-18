/** Ensure print HTML can load images (absolute http(s) or same-origin path). */
export function resolvePrintAssetUrl(url: string): string {
const t = url.trim();
if (!t) {
  return '';
}
if (/^https?:\/\//i.test(t) || t.startsWith('data:')) {
  return t;
}
if (typeof window !== 'undefined' && window.location?.origin && t.startsWith('/')) {
  return `${window.location.origin}${t}`;
}
return t;
}

/** PWA app icon for booklet cover. */
export function getPrintBookletAppIconUrl(): string {
  return resolvePrintAssetUrl('/icons/icon-512.png');
}
