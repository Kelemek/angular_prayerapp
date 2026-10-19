export interface HomeSubFilterChipButtonClassOptions {
  base: string;
  active: boolean;
  activeClass: string;
  inactiveClass: string;
  relative?: boolean;
  disabled?: boolean;
  /** When false, drop left padding reserved for the drag handle (pl-7 → pl-3). */
  showDragHandle?: boolean;
}

/** Shared active/inactive + cursor styling for wrap-row sub-filter chip buttons. */
export function buildHomeSubFilterChipButtonClass(
  options: HomeSubFilterChipButtonClassOptions
): string {
  const {
    base,
    active,
    activeClass,
    inactiveClass,
    relative,
    disabled,
    showDragHandle = true,
  } = options;
  return (
    base +
    (active ? ` ${activeClass}` : ` ${inactiveClass}`) +
    (relative ? " relative" : "") +
    (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer") +
    (showDragHandle ? "" : " !pl-3")
  );
}
