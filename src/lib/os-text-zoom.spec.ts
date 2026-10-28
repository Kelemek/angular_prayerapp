import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OS_TEXT_ZOOM_CSS_VAR,
  applyOsTextZoom,
  measureOsTextZoom,
  resetOsTextZoomWatchForTests,
  startOsTextZoomWatch,
} from "./os-text-zoom";

describe("os-text-zoom", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetOsTextZoomWatchForTests();
    document.documentElement.style.removeProperty(OS_TEXT_ZOOM_CSS_VAR);
  });

  function stubProbeComputedFontSize(fontSizePx: string): void {
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      if (
        element instanceof HTMLSpanElement &&
        element.getAttribute("aria-hidden") === "true"
      ) {
        return { fontSize: fontSizePx } as CSSStyleDeclaration;
      }
      return window.getComputedStyle(element);
    });
  }

  it("returns 1.3 when computed probe is 130px", () => {
    stubProbeComputedFontSize("130px");
    expect(measureOsTextZoom(document)).toBe(1.3);
  });

  it("returns 1 when computed size is invalid", () => {
    stubProbeComputedFontSize("not-a-size");
    expect(measureOsTextZoom(document)).toBe(1);
  });

  it("returns 1 when ratio is below 1", () => {
    stubProbeComputedFontSize("80px");
    expect(measureOsTextZoom(document)).toBe(1);
  });

  it("clamps ratio at 3", () => {
    stubProbeComputedFontSize("400px");
    expect(measureOsTextZoom(document)).toBe(3);
  });

  it("sets --os-text-zoom on html when zoom is above threshold", () => {
    stubProbeComputedFontSize("150px");
    applyOsTextZoom(document);
    expect(
      document.documentElement.style.getPropertyValue(OS_TEXT_ZOOM_CSS_VAR)
    ).toBe("1.5");
  });

  it("removes --os-text-zoom when zoom is at or below threshold", () => {
    stubProbeComputedFontSize("100px");
    document.documentElement.style.setProperty(OS_TEXT_ZOOM_CSS_VAR, "2");
    applyOsTextZoom(document);
    expect(
      document.documentElement.style.getPropertyValue(OS_TEXT_ZOOM_CSS_VAR)
    ).toBe("");
  });

  it("re-applies on visibilitychange to visible", () => {
    stubProbeComputedFontSize("120px");
    const addSpy = vi.spyOn(document, "addEventListener");
    startOsTextZoomWatch(document);
    startOsTextZoomWatch(document);
    expect(addSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(
      document.documentElement.style.getPropertyValue(OS_TEXT_ZOOM_CSS_VAR)
    ).toBe("1.2");
  });
});
