/** CSS variable on `html`; locked Home nav fonts divide by this to cancel Android WebView text zoom. */
export const OS_TEXT_ZOOM_CSS_VAR = "--os-text-zoom";

const PROBE_FONT_SIZE_PX = 100;
const MIN_OS_TEXT_ZOOM = 1;
const MAX_OS_TEXT_ZOOM = 3;
/** Below this, treat as 1 and omit the variable (noise / default). */
const OS_TEXT_ZOOM_APPLY_THRESHOLD = 1.01;

let visibilityListenerAttached = false;

/** @internal Vitest only — module singleton would block a second watch in the same session. */
export function resetOsTextZoomWatchForTests(): void {
  visibilityListenerAttached = false;
}

/**
 * Measures how much the host scales text (Android WebView textZoom / text autosizing).
 * Uses a px probe so in-app `--text-scale` on `html` does not affect the reading.
 */
export function measureOsTextZoom(doc: Document): number {
  const body = doc.body;
  if (!body) {
    return MIN_OS_TEXT_ZOOM;
  }

  const probe = doc.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:absolute",
    "left:-9999px",
    "top:0",
    "visibility:hidden",
    "pointer-events:none",
    `font-size:${PROBE_FONT_SIZE_PX}px`,
    "-webkit-text-size-adjust:none",
    "text-size-adjust:none",
  ].join(";");

  body.appendChild(probe);
  const computed = parseFloat(doc.defaultView?.getComputedStyle(probe).fontSize ?? "");
  probe.remove();

  if (!Number.isFinite(computed) || computed <= 0) {
    return MIN_OS_TEXT_ZOOM;
  }

  const ratio = computed / PROBE_FONT_SIZE_PX;
  if (ratio < MIN_OS_TEXT_ZOOM) {
    return MIN_OS_TEXT_ZOOM;
  }
  if (ratio > MAX_OS_TEXT_ZOOM) {
    return MAX_OS_TEXT_ZOOM;
  }
  return ratio;
}

/** Writes {@link OS_TEXT_ZOOM_CSS_VAR} on `documentElement` when zoom &gt; 1. */
export function applyOsTextZoom(doc: Document): number {
  const zoom = measureOsTextZoom(doc);
  const root = doc.documentElement;
  if (zoom > OS_TEXT_ZOOM_APPLY_THRESHOLD) {
    root.style.setProperty(OS_TEXT_ZOOM_CSS_VAR, String(zoom));
  } else {
    root.style.removeProperty(OS_TEXT_ZOOM_CSS_VAR);
  }
  return zoom;
}

/** Re-measure when the user returns from Settings after changing OS font size. */
export function startOsTextZoomWatch(doc: Document): void {
  if (visibilityListenerAttached || typeof doc.addEventListener !== "function") {
    return;
  }
  visibilityListenerAttached = true;
  doc.addEventListener("visibilitychange", () => {
    if (doc.visibilityState === "visible") {
      applyOsTextZoom(doc);
    }
  });
}
