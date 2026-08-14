export interface HomeSubFilterChipButtonClassOptions {
  base: string;
  active: boolean;
  activeClass: string;
  inactiveClass: string;
  relative?: boolean;
  disabled?: boolean;
}

/** Shared active/inactive + cursor styling for wrap-row sub-filter chip buttons. */
export function buildHomeSubFilterChipButtonClass(
  options: HomeSubFilterChipButtonClassOptions
): string {
  const { base, active, activeClass, inactiveClass, relative, disabled } =
    options;
  return (
    base +
    (active ? ` ${activeClass}` : ` ${inactiveClass}`) +
    (relative ? " relative" : "") +
    (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
  );
}
