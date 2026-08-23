/**
 * Base URL for links in emails. Website (browser): uses current origin.
 * Native app (Capacitor): origin can be capacitor://localhost or https://localhost (Android),
 * so we use environment.appUrl when origin is localhost or non-http(s) so links always point to the real web app.
 */
export function resolveEmailBaseUrl(options: {
  origin: string;
  appUrl: string | undefined;
}): string {
  const { origin, appUrl } = options;
  const isLocalhost = origin.includes("localhost");
  const isHttpOrigin =
    origin && (origin.startsWith("http://") || origin.startsWith("https://"));
  if (isHttpOrigin && !isLocalhost) {
    return origin;
  }
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }
  return origin;
}

/** Subscriber mass-email link to home with Current or Answered tab pre-selected. */
export function buildSubscriberAppLink(
  baseUrl: string,
  prayerStatus: string
): string {
  const filter = prayerStatus === "answered" ? "answered" : "current";
  const base = baseUrl.replace(/\/$/, "");
  if (!base) {
    return `/?filter=${filter}`;
  }
  return `${base}/?filter=${filter}`;
}

export function buildAppHomeLink(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/`;
}

export function buildAdminPortalLink(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/admin`;
}

/** Deep link to Memorize tab with optional verse add/practice intent. */
export function buildMemorizeVerseAppLink(
  baseUrl: string,
  reference: string,
  translation: string
): string {
  const base = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    filter: "memorize",
    verseRef: reference.trim(),
    verseTranslation: translation.trim(),
  });
  if (!base) {
    return `/?${params.toString()}`;
  }
  return `${base}/?${params.toString()}`;
}

export function buildViewPrayerAppLink(
  baseUrl: string,
  prayerId: string
): string {
  const base = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    filter: "current",
    prayerId: prayerId.trim(),
  });
  if (!base) {
    return `/?${params.toString()}`;
  }
  return `${base}/?${params.toString()}`;
}
