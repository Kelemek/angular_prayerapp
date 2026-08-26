/** Primary in-app scroll container on the home page; absent on routes that use document scroll. */
export const APP_SCROLL_CONTAINER_SELECTOR = ".safe-area-viewport";

const DEEP_LINK_SCROLL_QUERY_KEYS = [
  "prayerId",
  "promptId",
  "verseRef",
  "verseTranslation",
] as const;

export function extractNavigationPath(url: string): string {
  return url.split("?")[0]?.split("#")[0] ?? "";
}

export function hasDeepLinkScrollQueryParams(url: string): boolean {
  const query = url.split("?")[1]?.split("#")[0];
  if (!query) {
    return false;
  }
  const params = new URLSearchParams(query);
  return DEEP_LINK_SCROLL_QUERY_KEYS.some((key) => params.has(key));
}

/** Skip scroll reset when Home deep links or query-only navigations should preserve position. */
export function shouldSkipAppScrollResetOnNavigation(
  urlAfterRedirects: string,
  previousPath: string | null
): boolean {
  if (hasDeepLinkScrollQueryParams(urlAfterRedirects)) {
    return true;
  }
  const path = extractNavigationPath(urlAfterRedirects);
  return previousPath !== null && path === previousPath;
}

export function findAppScrollContainer(): HTMLElement | null {
  return document.querySelector(APP_SCROLL_CONTAINER_SELECTOR);
}

export function readAppScrollTop(container: HTMLElement | null): number {
  if (container) {
    return container.scrollTop;
  }
  return (
    window.scrollY ||
    document.documentElement?.scrollTop ||
    document.body?.scrollTop ||
    0
  );
}

export function scrollAppContainerToTop(
  container: HTMLElement | null,
  behavior: ScrollBehavior = "smooth"
): void {
  if (container) {
    container.scrollTo({ top: 0, behavior });
    return;
  }
  window.scrollTo({ top: 0, left: 0, behavior });
  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body) {
    document.body.scrollTop = 0;
  }
}
