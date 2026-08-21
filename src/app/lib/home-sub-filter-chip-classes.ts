/** Folder-tab chrome shared by Home and the Info filter mock (label typography included). */
export const HOME_FILTER_TAB_BASE_CLASS =
  "flex-1 min-w-0 px-2 py-1.5 sm:px-3 sm:py-2 text-center text-sm sm:text-base font-semibold leading-tight text-gray-700 dark:text-gray-300 transition-all duration-200 cursor-pointer relative flex flex-col items-center justify-center";

/** Slightly tinted off-white for inactive tabs/chips (not pure white on cream canvas). */
export const HOME_INACTIVE_SURFACE_BG_CLASS =
  "bg-church-surface-inactive dark:bg-gray-800";

export const HOME_INACTIVE_SURFACE_HOVER_BG_CLASS =
  "hover:bg-church-surface-inactive-hover dark:hover:bg-gray-700";

/** Slightly darker than gray-300 so borders read on tinted inactive fills. */
export const HOME_INACTIVE_SURFACE_BORDER_CLASS =
  "border border-church-surface-inactive-border dark:border-gray-600";

export const HOME_FILTER_TAB_INACTIVE_BORDER_CLASS =
  "border border-church-surface-inactive-tab-border dark:border-gray-700";

export const HOME_FILTER_TAB_INACTIVE_CLASS = [
  HOME_INACTIVE_SURFACE_BG_CLASS,
  HOME_FILTER_TAB_INACTIVE_BORDER_CLASS,
  HOME_INACTIVE_SURFACE_HOVER_BG_CLASS,
].join(" ");

/** Church green medium edge on Home shell chrome (header bottom / native footer top). */
export const HOME_SHELL_CHROME_BORDER_COLOR_CLASS =
  "border-[#2F5F54] dark:border-[#2F5F54]";

export const HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS = `border-b ${HOME_SHELL_CHROME_BORDER_COLOR_CLASS}`;

export const HOME_SHELL_FOOTER_BORDER_TOP_CLASS = `border-t ${HOME_SHELL_CHROME_BORDER_COLOR_CLASS}`;

/** Shared CSS class for modal panel outer edge (see `.modal-panel-edge` in styles.css). */
export const MODAL_PANEL_EDGE_CLASS = "modal-panel-edge";

/** 1px church green edge on memorize cards, home search, and similar shells. */
export const CHURCH_GREEN_SHELL_BORDER_CLASS =
  "border border-church-surface-inactive-tab-border dark:border-[#2F5F54]";

/** @deprecated Use {@link CHURCH_GREEN_SHELL_BORDER_CLASS}. */
export const MEMORIZE_CARD_SHELL_BORDER_CLASS = CHURCH_GREEN_SHELL_BORDER_CLASS;

/** Modal / settings dialog header and footer edges (same church green medium). */
export const MODAL_CHROME_BORDER_BOTTOM_CLASS = HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS;
export const MODAL_CHROME_BORDER_TOP_CLASS = HOME_SHELL_FOOTER_BORDER_TOP_CLASS;

export type HomeFilterTabAccent =
  | "public"
  | "personal"
  | "prompts"
  | "memorize"
  | "members";

/** Light-mode Personal tab/panel fill — church sage (`church-green-tint` in styles.css). */
export const HOME_PERSONAL_FILL_LIGHT_CLASS =
  "bg-church-green-tint dark:bg-green-900/40";

/**
 * Fill + accent color only. Width is applied in {@link homeFilterTabClass}:
 * `border-[2px]` on a connected tab overrides `border-b-0` in the generated CSS.
 */
export const HOME_FILTER_TAB_ACTIVE_FILL = {
  public: "bg-blue-200 dark:bg-blue-950 border-[#0047AB] dark:border-[#0047AB]",
  personal:
    `${HOME_PERSONAL_FILL_LIGHT_CLASS} border-[#2F5F54] dark:border-[#2F5F54]`,
  prompts:
    "bg-stone-300 dark:bg-stone-900/40 border-[#988F83] dark:border-[#988F83]",
  memorize: "bg-blue-200 dark:bg-blue-950 border-[#0047AB] dark:border-[#0047AB]",
  members:
    "bg-slate-200 dark:bg-blue-900/40 border-[#0047AB] dark:border-[#0047AB]",
} as const;

/** Top + sides only so the tab joins the folder panel (no bottom stroke). */
export const HOME_FILTER_TAB_CONNECTED_BORDER_CLASS =
  "border-t-[2px] border-x-[2px] border-b-0 z-10";

export function homeFilterTabClass(options: {
  accent: HomeFilterTabAccent;
  active: boolean;
  hasSubRow: boolean;
}): string {
  const { accent, active, hasSubRow } = options;
  const shape = hasSubRow ? "rounded-t-lg" : "rounded-lg";
  if (!active) {
    return `${HOME_FILTER_TAB_BASE_CLASS} ${shape} ${HOME_FILTER_TAB_INACTIVE_CLASS}`;
  }
  const fill = HOME_FILTER_TAB_ACTIVE_FILL[accent];
  const border = hasSubRow
    ? HOME_FILTER_TAB_CONNECTED_BORDER_CLASS
    : "border-[2px]";
  return `${HOME_FILTER_TAB_BASE_CLASS} ${shape} ${fill} ${border}`;
}

/** Shared sizing for Home secondary filter chips (Public status, Personal, Prompt types). */
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

/** Chip row inside a folder-tab panel. */
export const HOME_SUB_FILTER_CHIP_ROW_CLASS =
  "flex w-full flex-wrap items-center gap-2";

export const HOME_SUB_FILTER_CHIP_INACTIVE_CLASS = [
  HOME_INACTIVE_SURFACE_BG_CLASS,
  "text-gray-700 dark:text-gray-300",
  HOME_INACTIVE_SURFACE_BORDER_CLASS,
].join(" ");

/** Selected chip fills — lighter than matching folder panel background. */
export const HOME_PUBLIC_PANEL_CHIP_ACTIVE_FILL_CLASS =
  "bg-home-panel-blue-chip-active dark:bg-home-panel-blue-chip-active-dark";

export const HOME_PERSONAL_PANEL_CHIP_ACTIVE_FILL_CLASS =
  "bg-home-panel-personal-chip-active dark:bg-home-panel-personal-chip-active-dark";

export const HOME_PROMPTS_PANEL_CHIP_ACTIVE_FILL_CLASS =
  "bg-home-panel-stone-chip-active dark:bg-home-panel-stone-chip-active-dark";

const HOME_GREEN_STATUS_CHIP_ACTIVE_FILL_CLASS =
  "bg-home-panel-green-status-chip-active dark:bg-home-panel-green-status-chip-active-dark";

const HOME_AMBER_STATUS_CHIP_ACTIVE_FILL_CLASS =
  "bg-home-panel-amber-status-chip-active dark:bg-home-panel-amber-status-chip-active-dark";

const HOME_GRAY_STATUS_CHIP_ACTIVE_FILL_CLASS =
  "bg-home-panel-gray-status-chip-active dark:bg-home-panel-gray-status-chip-active-dark";

/** Tailwind active/inactive pairs for public community sub-chips. */
export const HOME_PUBLIC_STATUS_CHIP_THEMES = {
  current: {
    active:
      `border !border-[#0047AB] dark:!border-[#0047AB] ${HOME_PUBLIC_PANEL_CHIP_ACTIVE_FILL_CLASS} ring ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md`,
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[#0047AB] dark:hover:border-[#0047AB]",
  },
  answered: {
    active:
      `border !border-[#39704D] dark:!border-[#39704D] ${HOME_GREEN_STATUS_CHIP_ACTIVE_FILL_CLASS} ring ring-[#39704D] dark:ring-[#39704D] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md`,
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[#39704D] dark:hover:border-[#39704D]",
  },
  archived: {
    active:
      `border !border-[#C9A961] dark:!border-[#C9A961] ${HOME_AMBER_STATUS_CHIP_ACTIVE_FILL_CLASS} ring ring-[#C9A961] dark:ring-[#C9A961] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md`,
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[#C9A961] dark:hover:border-[#C9A961]",
  },
  total: {
    active:
      `border !border-gray-500 dark:!border-gray-400 ${HOME_GRAY_STATUS_CHIP_ACTIVE_FILL_CLASS} ring ring-gray-500 dark:ring-gray-400 ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md`,
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-gray-500 dark:hover:border-gray-400",
  },
  members: {
    active:
      `border !border-[#0047AB] dark:!border-[#0047AB] ${HOME_PUBLIC_PANEL_CHIP_ACTIVE_FILL_CLASS} ring ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md`,
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[#0047AB] dark:hover:border-[#0047AB]",
  },
} as const;

export const HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS =
  HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
  " hover:border-[#2F5F54] dark:hover:border-[#2F5F54]";

/** Personal sub-filters: selected chip (matches Personal tab accent). */
export const HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS =
  `border !border-[#2F5F54] dark:!border-[#2F5F54] ${HOME_PERSONAL_PANEL_CHIP_ACTIVE_FILL_CLASS} ring ring-[#2F5F54] dark:ring-[#2F5F54] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md`;

/** Tab accent hex values (documented; panel fills use full literals below for Tailwind). */
export const HOME_FILTER_TAB_BORDER = {
  public: "#0047AB",
  personal: "#2F5F54",
  prompts: "#988F83",
  memorize: "#0047AB",
} as const;

/** Folder-tab body: fill + side/bottom accent; no top border so it joins the selected tab. */
export const HOME_PUBLIC_SUB_FILTER_GROUP_CLASS =
  "rounded-b-lg bg-blue-200 dark:bg-blue-950 border-x-[2px] border-b-[2px] border-t-0 border-[#0047AB] dark:border-[#0047AB] px-3 py-2";
export const HOME_PERSONAL_SUB_FILTER_GROUP_CLASS =
  `rounded-b-lg ${HOME_PERSONAL_FILL_LIGHT_CLASS} border-x-[2px] border-b-[2px] border-t-0 border-[#2F5F54] dark:border-[#2F5F54] px-3 py-2`;
export const HOME_PROMPTS_SUB_FILTER_GROUP_CLASS =
  "rounded-b-lg bg-stone-300 dark:bg-stone-900/40 border-x-[2px] border-b-[2px] border-t-0 border-[#988F83] dark:border-[#988F83] px-3 py-2";
/** Same blue fill as Public — Memorize tab shares `#0047AB`. */
export const HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS =
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS;
