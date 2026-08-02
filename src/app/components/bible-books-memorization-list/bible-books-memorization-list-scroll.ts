/** Nearest ancestor that can scroll vertically (used when parent panel scrolls). */
export function getNearestVerticalScrollParent(
  element: HTMLElement | null
): HTMLElement | null {
  let current = element?.parentElement ?? null;
  while (current) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function resetBibleBooksListScroll(
  listElement: HTMLElement | null,
  innerScroll: boolean
): void {
  if (!listElement) {
    return;
  }
  if (innerScroll) {
    listElement.scrollTop = 0;
    return;
  }
  const scrollParent = getNearestVerticalScrollParent(listElement);
  if (scrollParent) {
    scrollParent.scrollTop = 0;
  }
}
