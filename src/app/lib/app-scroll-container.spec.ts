import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  findAppScrollContainer,
  readAppScrollTop,
  scrollAppContainerToTop,
  shouldSkipAppScrollResetOnNavigation,
  hasDeepLinkScrollQueryParams,
  extractNavigationPath,
} from "./app-scroll-container";

describe("app-scroll-container", () => {
  let viewport: HTMLDivElement;

  beforeEach(() => {
    viewport = document.createElement("div");
    viewport.className = "safe-area-viewport";
    Object.defineProperty(viewport, "scrollTop", {
      value: 0,
      writable: true,
      configurable: true,
    });
    viewport.scrollTo = (options?: ScrollToOptions | number) => {
      if (typeof options === "number") {
        viewport.scrollTop = options;
        return;
      }
      if (options?.top != null) {
        viewport.scrollTop = options.top;
      }
    };
    document.body.appendChild(viewport);
  });

  afterEach(() => {
    viewport.remove();
  });

  it("findAppScrollContainer returns the safe-area viewport", () => {
    expect(findAppScrollContainer()).toBe(viewport);
  });

  it("readAppScrollTop reads container scrollTop when present", () => {
    viewport.scrollTop = 240;
    expect(readAppScrollTop(viewport)).toBe(240);
  });

  it("readAppScrollTop falls back to window scroll when container is null", () => {
    Object.defineProperty(window, "scrollY", {
      value: 88,
      configurable: true,
    });
    expect(readAppScrollTop(null)).toBe(88);
  });

  it("scrollAppContainerToTop scrolls the container", () => {
    viewport.scrollTop = 500;
    scrollAppContainerToTop(viewport);
    expect(viewport.scrollTop).toBe(0);
  });

  it("scrollAppContainerToTop scrolls the window when container is null", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    scrollAppContainerToTop(null, "smooth");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });
  });

  it("scrollAppContainerToTop resets document scroll offsets when container is null", () => {
    document.documentElement.scrollTop = 120;
    document.body.scrollTop = 80;
    scrollAppContainerToTop(null, "instant");
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  describe("shouldSkipAppScrollResetOnNavigation", () => {
    it("skips when deep-link query params are present", () => {
      expect(
        shouldSkipAppScrollResetOnNavigation("/?prayerId=abc", null)
      ).toBe(true);
      expect(
        shouldSkipAppScrollResetOnNavigation("/?promptId=xyz", "/")
      ).toBe(true);
    });

    it("skips query-only navigations on the same path", () => {
      expect(
        shouldSkipAppScrollResetOnNavigation("/?filter=memorize", "/")
      ).toBe(true);
      expect(shouldSkipAppScrollResetOnNavigation("/", "/")).toBe(true);
    });

    it("does not skip when the path changes", () => {
      expect(shouldSkipAppScrollResetOnNavigation("/admin", "/")).toBe(false);
      expect(shouldSkipAppScrollResetOnNavigation("/", null)).toBe(false);
    });
  });

  describe("hasDeepLinkScrollQueryParams", () => {
    it("detects prayer, prompt, and verse deep-link params", () => {
      expect(hasDeepLinkScrollQueryParams("/?prayerId=1")).toBe(true);
      expect(hasDeepLinkScrollQueryParams("/?verseRef=John%203:16")).toBe(true);
      expect(hasDeepLinkScrollQueryParams("/?filter=current")).toBe(false);
    });
  });

  describe("extractNavigationPath", () => {
    it("strips query and hash", () => {
      expect(extractNavigationPath("/admin?tab=users#section")).toBe("/admin");
    });
  });
});
