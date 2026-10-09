/** Modal shell portals its overlay to `document.body`; use these helpers in unit tests. */
export function modalShellOverlayRoot(): HTMLElement | null {
  return document.querySelector(".modal-shell-overlay");
}

export function modalShellOverlayText(): string {
  return modalShellOverlayRoot()?.textContent ?? "";
}

export function modalShellQuery<T extends Element>(selector: string): T | null {
  const root = modalShellOverlayRoot();
  if (!root) {
    return null;
  }
  return root.querySelector(selector);
}

export function modalShellQueryAll<T extends Element>(selector: string): T[] {
  const root = modalShellOverlayRoot();
  if (!root) {
    return [];
  }
  return [...root.querySelectorAll<T>(selector)];
}
