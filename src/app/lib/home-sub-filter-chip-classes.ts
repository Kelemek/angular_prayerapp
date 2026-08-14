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

/** Content-sized chip with left padding for a drag handle (personal categories). */
export const HOME_SUB_FILTER_CHIP_DRAG_WRAP_CLASS = [
  "relative inline-flex items-center justify-center whitespace-nowrap transition-all pl-7 pr-3",
  "min-h-9 py-2 rounded-lg text-xs font-medium",
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
