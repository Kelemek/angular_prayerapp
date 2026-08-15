/** Shared sizing for Home secondary filter rows (Public status, Personal, Prompt types). */
export const HOME_SUB_FILTER_CHIP_SIZE_CLASS =
  "min-h-9 px-3 py-2 rounded-lg text-xs font-medium";

/** Button styles for equal-width chips; host uses flex-1 via HomeSubFilterChipComponent.stretch. */
export const HOME_SUB_FILTER_CHIP_BASE_CLASS = [
  "whitespace-nowrap inline-flex items-center justify-center transition-all",
  HOME_SUB_FILTER_CHIP_SIZE_CLASS,
].join(" ");

/** Content-sized chip for wrapping sub-filter rows (e.g. prompt types). */
export const HOME_SUB_FILTER_CHIP_WRAP_CLASS = [
  "inline-flex items-center justify-center whitespace-nowrap transition-all",
  HOME_SUB_FILTER_CHIP_SIZE_CLASS,
].join(" ");

/** Full-width chip button inside a shared wrap row (no drag handle). */
export const HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS = [
  "relative flex w-full min-w-max items-center justify-center gap-1 text-center transition-all",
  HOME_SUB_FILTER_CHIP_SIZE_CLASS,
  "whitespace-nowrap",
].join(" ");

/** Content-sized chip with left padding for a drag handle (personal categories). */
export const HOME_SUB_FILTER_CHIP_DRAG_WRAP_CLASS = [
  "relative inline-flex items-center justify-center whitespace-nowrap transition-all pl-7 pr-3",
  "min-h-9 py-2 rounded-lg text-xs font-medium",
].join(" ");

/** Flex item: equal split up to 2/row (3 on sm+); grows to fit label or full row when needed. */
export const HOME_WRAP_FILTER_CHIP_FLEX_CLASS = [
  "relative flex min-w-max flex-[1_1_0]",
  "max-w-[min(100%,max(calc((100%-0.5rem)/2),max-content))]",
  "sm:max-w-[min(100%,max(calc((100%-1rem)/3),max-content))]",
].join(" ");

/** Solo-row flex item: full row width, no min-w-max (avoids conflicting with truncation). */
export const HOME_WRAP_FILTER_CHIP_SOLO_FLEX_CLASS =
  "relative flex min-w-0 w-full max-w-full flex-[1_1_0]";

/** @deprecated Use {@link HOME_WRAP_FILTER_CHIP_FLEX_CLASS}. */
export const HOME_PERSONAL_CATEGORY_CHIP_FLEX_CLASS =
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS;

/** @deprecated Use {@link HOME_WRAP_FILTER_CHIP_SOLO_FLEX_CLASS}. */
export const HOME_PERSONAL_CATEGORY_CHIP_SOLO_FLEX_CLASS =
  HOME_WRAP_FILTER_CHIP_SOLO_FLEX_CLASS;

/** Button inside category chip when it shares a row with others. */
export const HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS = [
  "relative flex w-full min-w-max items-center justify-center gap-1 text-center transition-all pl-7 pr-3",
  "min-h-9 py-2 rounded-lg text-xs font-medium whitespace-nowrap",
].join(" ");

/** Full-width solo-row chip button; label may truncate when constrained. */
export const HOME_SUB_FILTER_CHIP_DRAG_SOLO_STRETCH_CLASS = [
  "relative flex w-full min-w-0 items-center gap-1 overflow-hidden text-center transition-all pl-7 pr-3",
  "min-h-9 py-2 rounded-lg text-xs font-medium whitespace-nowrap",
].join(" ");

export const HOME_SUB_FILTER_CHIP_INACTIVE_CLASS =
  "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600";

/** Tailwind active/inactive pairs for public community sub-chips. */
export const HOME_PUBLIC_STATUS_CHIP_THEMES = {
  current: {
    active:
      "border !border-[#0047AB] dark:!border-[#0047AB] bg-blue-100 dark:bg-blue-950 ring ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md",
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[#0047AB] dark:hover:border-[#0047AB]",
  },
  answered: {
    active:
      "border !border-[#39704D] dark:!border-[#39704D] bg-green-100 dark:bg-green-950 ring ring-[#39704D] dark:ring-[#39704D] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md",
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[#39704D] dark:hover:border-[#39704D]",
  },
  total: {
    active:
      "border !border-[#C9A961] dark:!border-[#C9A961] bg-amber-100 dark:bg-amber-900/40 ring ring-[#C9A961] dark:ring-[#C9A961] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md",
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[#C9A961] dark:hover:border-[#C9A961]",
  },
} as const;

export const HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS =
  HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
  " hover:border-[#2F5F54] dark:hover:border-[#2F5F54]";

/** Personal sub-chips: thin tab-color border only (no ring/shadow box). */
export const HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS =
  "border !border-[#2F5F54] dark:!border-[#2F5F54] bg-slate-100 dark:bg-green-900/40 text-gray-700 dark:text-gray-300";

/** Wraps all sub-filter chips for a tab; border matches that tab's active color (2px like cards). */
export const HOME_FILTER_TAB_BORDER = {
  public: "#0047AB",
  personal: "#2F5F54",
  prompts: "#988F83",
  memorize: "#0047AB",
} as const;

export function homeSubFilterGroupClass(
  borderColor: (typeof HOME_FILTER_TAB_BORDER)[keyof typeof HOME_FILTER_TAB_BORDER]
): string {
  return `rounded-lg border-[2px] border-[${borderColor}] dark:border-[${borderColor}] p-2`;
}

export const HOME_PUBLIC_SUB_FILTER_GROUP_CLASS = homeSubFilterGroupClass(
  HOME_FILTER_TAB_BORDER.public
);
export const HOME_PERSONAL_SUB_FILTER_GROUP_CLASS = homeSubFilterGroupClass(
  HOME_FILTER_TAB_BORDER.personal
);
export const HOME_PROMPTS_SUB_FILTER_GROUP_CLASS = homeSubFilterGroupClass(
  HOME_FILTER_TAB_BORDER.prompts
);
/** Same blue border as Public — Memorize tab shares `#0047AB`. */
export const HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS =
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS;
