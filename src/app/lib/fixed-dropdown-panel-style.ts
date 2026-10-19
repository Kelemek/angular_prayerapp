/** Positions a fixed dropdown panel under (or above) its trigger within the viewport. */
export function buildFixedDropdownPanelStyle(
  trigger: HTMLElement,
  maxHeight = 240,
): Record<string, string> {
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const viewportPad = 8;
  const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
  const spaceAbove = rect.top - gap - viewportPad;
  const openUp = spaceBelow < Math.min(maxHeight, 160) && spaceAbove > spaceBelow;
  const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
  const height = Math.min(maxHeight, available);
  const top = openUp
    ? Math.max(viewportPad, rect.top - gap - height)
    : rect.bottom + gap;

  return {
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${height}px`,
  };
}
