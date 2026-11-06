/** Below `sm`, fixed px typography in styles.css (Home main tabs only). */
export const HOME_NAV_TAB_TEXT_LOCK_CLASS = "home-nav-tab-text-lock";

/** Below `sm`, fixed px typography in styles.css (Home sub-filter + peer chips). */
export const HOME_NAV_CHIP_TEXT_LOCK_CLASS = "home-nav-chip-text-lock";

/** Below `sm`, fixed chip box + label size in styles.css (Home header toolbar). */
export const HOME_HEADER_CHIP_SIZE_LOCK_CLASS = "home-header-chip-size-lock";

/** Folder-tab chrome shared by Home and the Info filter mock (label typography included). */
export const HOME_FILTER_TAB_BASE_CLASS =
  "flex-1 min-w-0 px-3 py-2 text-center text-base font-semibold leading-tight text-gray-700 dark:text-gray-300 transition-all duration-200 cursor-pointer relative flex flex-col items-center justify-center";

/** Slightly tinted off-white for inactive chips (not pure white on cream canvas). */
export const HOME_INACTIVE_SURFACE_BG_CLASS =
  "bg-church-surface-inactive dark:bg-gray-800";

/** Rest + hover fill for unselected folder tabs (see bg-home-filter-tab-inactive). */
export const HOME_FILTER_TAB_INACTIVE_BG_CLASS = "bg-home-filter-tab-inactive";

/** Slightly darker than gray-300 so borders read on tinted inactive fills. */
export const HOME_INACTIVE_SURFACE_BORDER_CLASS =
  "border border-church-surface-inactive-border dark:border-gray-600";

export const HOME_FILTER_TAB_INACTIVE_BORDER_CLASS =
  "border border-church-surface-inactive-tab-border dark:border-gray-700";

export const HOME_FILTER_TAB_INACTIVE_CLASS = [
  HOME_FILTER_TAB_INACTIVE_BG_CLASS,
  HOME_FILTER_TAB_INACTIVE_BORDER_CLASS,
].join(" ");

/** Church green medium edge on Home header bottom and shared modal/toolbar borders. */
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
  | "members"
  | "groups";

type HomeTabCssAccent =
  | "public"
  | "groups"
  | "members"
  | "personal"
  | "memorize"
  | "prompts";

/** CSS variable names for tab/panel accents (see `--home-tab-*` in styles.css). */
export const HOME_TAB_CSS_VAR = {
  public: {
    bg: "--home-tab-public-bg",
    bgDark: "--home-tab-public-bg-dark",
    border: "--home-tab-public-border",
    inactiveBg: "--home-tab-public-inactive-bg",
    inactiveBgDark: "--home-tab-public-inactive-bg-dark",
    inactiveBorder: "--home-tab-public-inactive-border",
    inactiveBorderDark: "--home-tab-public-inactive-border-dark",
  },
  groups: {
    bg: "--home-tab-groups-bg",
    bgDark: "--home-tab-groups-bg-dark",
    border: "--home-tab-groups-border",
    inactiveBg: "--home-tab-groups-inactive-bg",
    inactiveBgDark: "--home-tab-groups-inactive-bg-dark",
    inactiveBorder: "--home-tab-groups-inactive-border",
    inactiveBorderDark: "--home-tab-groups-inactive-border-dark",
  },
  members: {
    bg: "--home-tab-members-bg",
    bgDark: "--home-tab-members-bg-dark",
    border: "--home-tab-members-border",
    inactiveBg: "--home-tab-members-inactive-bg",
    inactiveBgDark: "--home-tab-members-inactive-bg-dark",
    inactiveBorder: "--home-tab-members-inactive-border",
    inactiveBorderDark: "--home-tab-members-inactive-border-dark",
  },
  personal: {
    bg: "--home-tab-personal-bg",
    bgDark: "--home-tab-personal-bg-dark",
    border: "--home-tab-personal-border",
    inactiveBg: "--home-tab-personal-inactive-bg",
    inactiveBgDark: "--home-tab-personal-inactive-bg-dark",
    inactiveBorder: "--home-tab-personal-inactive-border",
    inactiveBorderDark: "--home-tab-personal-inactive-border-dark",
  },
  memorize: {
    bg: "--home-tab-memorize-bg",
    bgDark: "--home-tab-memorize-bg-dark",
    border: "--home-tab-memorize-border",
    inactiveBg: "--home-tab-memorize-inactive-bg",
    inactiveBgDark: "--home-tab-memorize-inactive-bg-dark",
    inactiveBorder: "--home-tab-memorize-inactive-border",
    inactiveBorderDark: "--home-tab-memorize-inactive-border-dark",
  },
  prompts: {
    bg: "--home-tab-prompts-bg",
    bgDark: "--home-tab-prompts-bg-dark",
    border: "--home-tab-prompts-border",
    inactiveBg: "--home-tab-prompts-inactive-bg",
    inactiveBgDark: "--home-tab-prompts-inactive-bg-dark",
    inactiveBorder: "--home-tab-prompts-inactive-border",
    inactiveBorderDark: "--home-tab-prompts-inactive-border-dark",
  },
} as const;

/** Static literals so Tailwind content-scan emits `bg-[var(--home-tab-*)]` utilities. */
export const HOME_TAB_PUBLIC_ACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-public-bg)] dark:bg-[var(--home-tab-public-bg-dark)] border-[var(--home-tab-public-border)] dark:border-[var(--home-tab-public-border)]";
export const HOME_TAB_GROUPS_ACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-groups-bg)] dark:bg-[var(--home-tab-groups-bg-dark)] border-[var(--home-tab-groups-border)] dark:border-[var(--home-tab-groups-border)]";
export const HOME_TAB_MEMBERS_ACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-members-bg)] dark:bg-[var(--home-tab-members-bg-dark)] border-[var(--home-tab-members-border)] dark:border-[var(--home-tab-members-border)]";
export const HOME_TAB_PERSONAL_ACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-personal-bg)] dark:bg-[var(--home-tab-personal-bg-dark)] border-[var(--home-tab-personal-border)] dark:border-[var(--home-tab-personal-border)]";
export const HOME_TAB_MEMORIZE_ACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-memorize-bg)] dark:bg-[var(--home-tab-memorize-bg-dark)] border-[var(--home-tab-memorize-border)] dark:border-[var(--home-tab-memorize-border)]";
export const HOME_TAB_PROMPTS_ACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-prompts-bg)] dark:bg-[var(--home-tab-prompts-bg-dark)] border-[var(--home-tab-prompts-border)] dark:border-[var(--home-tab-prompts-border)]";

export const HOME_TAB_PUBLIC_INACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-public-inactive-bg)] dark:bg-[var(--home-tab-public-inactive-bg-dark)] border-2 border-[var(--home-tab-public-inactive-border)] dark:border-[var(--home-tab-public-inactive-border-dark)] home-filter-tab-inactive-chrome";
export const HOME_TAB_GROUPS_INACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-groups-inactive-bg)] dark:bg-[var(--home-tab-groups-inactive-bg-dark)] border-2 border-[var(--home-tab-groups-inactive-border)] dark:border-[var(--home-tab-groups-inactive-border-dark)] home-filter-tab-inactive-chrome";
export const HOME_TAB_MEMBERS_INACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-members-inactive-bg)] dark:bg-[var(--home-tab-members-inactive-bg-dark)] border-2 border-[var(--home-tab-members-inactive-border)] dark:border-[var(--home-tab-members-inactive-border-dark)] home-filter-tab-inactive-chrome";
export const HOME_TAB_PERSONAL_INACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-personal-inactive-bg)] dark:bg-[var(--home-tab-personal-inactive-bg-dark)] border-2 border-[var(--home-tab-personal-inactive-border)] dark:border-[var(--home-tab-personal-inactive-border-dark)] home-filter-tab-inactive-chrome";
export const HOME_TAB_MEMORIZE_INACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-memorize-inactive-bg)] dark:bg-[var(--home-tab-memorize-inactive-bg-dark)] border-2 border-[var(--home-tab-memorize-inactive-border)] dark:border-[var(--home-tab-memorize-inactive-border-dark)] home-filter-tab-inactive-chrome";
export const HOME_TAB_PROMPTS_INACTIVE_FILL_CLASS =
  "bg-[var(--home-tab-prompts-inactive-bg)] dark:bg-[var(--home-tab-prompts-inactive-bg-dark)] border-2 border-[var(--home-tab-prompts-inactive-border)] dark:border-[var(--home-tab-prompts-inactive-border-dark)] home-filter-tab-inactive-chrome";

export const HOME_PUBLIC_SUB_FILTER_GROUP_CLASS =
  "rounded-b-lg bg-[var(--home-tab-public-bg)] dark:bg-[var(--home-tab-public-bg-dark)] border-x-[2px] border-b-[2px] border-t-0 border-[var(--home-tab-public-border)] dark:border-[var(--home-tab-public-border)] px-3 py-2";
export const HOME_GROUPS_SUB_FILTER_GROUP_CLASS =
  "rounded-b-lg bg-[var(--home-tab-groups-bg)] dark:bg-[var(--home-tab-groups-bg-dark)] border-x-[2px] border-b-[2px] border-t-0 border-[var(--home-tab-groups-border)] dark:border-[var(--home-tab-groups-border)] px-3 py-2";
export const HOME_PERSONAL_SUB_FILTER_GROUP_CLASS =
  "rounded-b-lg bg-[var(--home-tab-personal-bg)] dark:bg-[var(--home-tab-personal-bg-dark)] border-x-[2px] border-b-[2px] border-t-0 border-[var(--home-tab-personal-border)] dark:border-[var(--home-tab-personal-border)] px-3 py-2";
export const HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS =
  "rounded-b-lg bg-[var(--home-tab-memorize-bg)] dark:bg-[var(--home-tab-memorize-bg-dark)] border-x-[2px] border-b-[2px] border-t-0 border-[var(--home-tab-memorize-border)] dark:border-[var(--home-tab-memorize-border)] px-3 py-2";
export const HOME_PROMPTS_SUB_FILTER_GROUP_CLASS =
  "rounded-b-lg bg-[var(--home-tab-prompts-bg)] dark:bg-[var(--home-tab-prompts-bg-dark)] border-x-[2px] border-b-[2px] border-t-0 border-[var(--home-tab-prompts-border)] dark:border-[var(--home-tab-prompts-border)] px-3 py-2";

/** Light-mode Personal tab/panel fill — driven by `--home-tab-personal-*`. */
export const HOME_PERSONAL_FILL_LIGHT_CLASS =
  "bg-[var(--home-tab-personal-bg)] dark:bg-[var(--home-tab-personal-bg-dark)]";

export const HOME_FILTER_TAB_INACTIVE_FILL = {
  public: HOME_TAB_PUBLIC_INACTIVE_FILL_CLASS,
  personal: HOME_TAB_PERSONAL_INACTIVE_FILL_CLASS,
  prompts: HOME_TAB_PROMPTS_INACTIVE_FILL_CLASS,
  memorize: HOME_TAB_MEMORIZE_INACTIVE_FILL_CLASS,
  members: HOME_TAB_MEMBERS_INACTIVE_FILL_CLASS,
  groups: HOME_TAB_GROUPS_INACTIVE_FILL_CLASS,
} as const;

/**
 * Fill + accent color only. Width is applied in {@link homeFilterTabClass}:
 * `border-[2px]` on a connected tab overrides `border-b-0` in the generated CSS.
 */
export const HOME_FILTER_TAB_ACTIVE_FILL = {
  public: HOME_TAB_PUBLIC_ACTIVE_FILL_CLASS,
  personal: HOME_TAB_PERSONAL_ACTIVE_FILL_CLASS,
  prompts: HOME_TAB_PROMPTS_ACTIVE_FILL_CLASS,
  memorize: HOME_TAB_MEMORIZE_ACTIVE_FILL_CLASS,
  members: HOME_TAB_MEMBERS_ACTIVE_FILL_CLASS,
  groups: HOME_TAB_GROUPS_ACTIVE_FILL_CLASS,
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
    return `${HOME_FILTER_TAB_BASE_CLASS} ${shape} ${HOME_FILTER_TAB_INACTIVE_FILL[accent]}`;
  }
  const fill = HOME_FILTER_TAB_ACTIVE_FILL[accent];
  const border = hasSubRow
    ? HOME_FILTER_TAB_CONNECTED_BORDER_CLASS
    : "border-[2px]";
  return `${HOME_FILTER_TAB_BASE_CLASS} ${shape} ${fill} ${border}`;
}

/** Shared sizing for Home secondary filter chips (Public status, Personal, Prompt types). */
export const HOME_SUB_FILTER_CHIP_SIZE_CLASS =
  "h-9 px-3 rounded-lg text-xs font-medium leading-none";

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
  "relative inline-flex h-9 items-center justify-center whitespace-nowrap transition-all pl-7 pr-3",
  "rounded-lg text-xs font-medium leading-none",
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
  "relative flex h-9 w-full min-w-max items-center justify-center gap-1 text-center transition-all pl-7 pr-3",
  "rounded-lg text-xs font-medium leading-none whitespace-nowrap",
].join(" ");

/** Full-width solo-row chip button; label may truncate when constrained. */
export const HOME_SUB_FILTER_CHIP_DRAG_SOLO_STRETCH_CLASS = [
  "relative flex h-9 w-full min-w-0 items-center gap-1 overflow-hidden text-center transition-all pl-7 pr-3",
  "rounded-lg text-xs font-medium leading-none whitespace-nowrap",
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

const HOME_TAB_PUBLIC_CHIP_ACTIVE_CLASS =
  "border !border-[var(--home-tab-public-border)] dark:!border-[var(--home-tab-public-border)] bg-home-panel-blue-chip-active dark:bg-home-panel-blue-chip-active-dark ring ring-[var(--home-tab-public-border)] dark:ring-[var(--home-tab-public-border)] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md";
const HOME_TAB_GROUPS_CHIP_ACTIVE_CLASS =
  "border !border-[var(--home-tab-groups-border)] dark:!border-[var(--home-tab-groups-border)] bg-home-panel-blue-chip-active dark:bg-home-panel-blue-chip-active-dark ring ring-[var(--home-tab-groups-border)] dark:ring-[var(--home-tab-groups-border)] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md";
const HOME_TAB_MEMBERS_CHIP_ACTIVE_CLASS =
  "border !border-[var(--home-tab-members-border)] dark:!border-[var(--home-tab-members-border)] bg-home-panel-blue-chip-active dark:bg-home-panel-blue-chip-active-dark ring ring-[var(--home-tab-members-border)] dark:ring-[var(--home-tab-members-border)] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md";
const HOME_TAB_PROMPTS_CHIP_ACTIVE_CLASS =
  "border !border-[var(--home-tab-prompts-border)] dark:!border-[var(--home-tab-prompts-border)] bg-home-panel-stone-chip-active dark:bg-home-panel-stone-chip-active-dark ring ring-[var(--home-tab-prompts-border)] dark:ring-[var(--home-tab-prompts-border)] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md";
const HOME_TAB_MEMORIZE_CHIP_ACTIVE_CLASS =
  "border !border-[var(--home-tab-memorize-border)] dark:!border-[var(--home-tab-memorize-border)] bg-home-panel-blue-chip-active dark:bg-home-panel-blue-chip-active-dark ring ring-[var(--home-tab-memorize-border)] dark:ring-[var(--home-tab-memorize-border)] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md";

/** Tailwind active/inactive pairs for public community sub-chips. */
export const HOME_PUBLIC_STATUS_CHIP_THEMES = {
  current: {
    active: HOME_TAB_PUBLIC_CHIP_ACTIVE_CLASS,
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[var(--home-tab-public-border)] dark:hover:border-[var(--home-tab-public-border)]",
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
  prompts: {
    active: HOME_TAB_PROMPTS_CHIP_ACTIVE_CLASS,
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[var(--home-tab-prompts-border)] dark:hover:border-[var(--home-tab-prompts-border)]",
  },
  members: {
    active: HOME_TAB_MEMBERS_CHIP_ACTIVE_CLASS,
    inactive:
      HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
      " hover:border-[var(--home-tab-members-border)] dark:hover:border-[var(--home-tab-members-border)]",
  },
} as const;

/** Memorize action row chips (same accent as Memorize tab). */
export const HOME_MEMORIZE_PANEL_CHIP_THEMES = {
  active: HOME_TAB_MEMORIZE_CHIP_ACTIVE_CLASS,
  inactive:
    HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
    " hover:border-[var(--home-tab-memorize-border)] dark:hover:border-[var(--home-tab-memorize-border)]",
} as const;

/** Groups tab status / group chips (Group tab accent). */
export const HOME_GROUPS_PANEL_CHIP_THEMES = {
  active: HOME_TAB_GROUPS_CHIP_ACTIVE_CLASS,
  inactive:
    HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
    " hover:border-[var(--home-tab-groups-border)] dark:hover:border-[var(--home-tab-groups-border)]",
} as const;

export const HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS =
  HOME_SUB_FILTER_CHIP_INACTIVE_CLASS +
  " hover:border-[var(--home-tab-personal-border)] dark:hover:border-[var(--home-tab-personal-border)]";

/** Personal sub-filters: selected chip (matches Personal tab accent). */
export const HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS =
  `border !border-[var(--home-tab-personal-border)] dark:!border-[var(--home-tab-personal-border)] ${HOME_PERSONAL_PANEL_CHIP_ACTIVE_FILL_CLASS} ring ring-[var(--home-tab-personal-border)] dark:ring-[var(--home-tab-personal-border)] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md`;

/**
 * Concatenated scan anchor — every home-tab arbitrary utility must appear as a static literal above.
 * Referenced by regression spec; do not build tab/panel classes via template strings only.
 */
export const HOME_TAB_TAILWIND_SCAN_ANCHOR = [
  HOME_TAB_PUBLIC_ACTIVE_FILL_CLASS,
  HOME_TAB_GROUPS_ACTIVE_FILL_CLASS,
  HOME_TAB_MEMBERS_ACTIVE_FILL_CLASS,
  HOME_TAB_PERSONAL_ACTIVE_FILL_CLASS,
  HOME_TAB_MEMORIZE_ACTIVE_FILL_CLASS,
  HOME_TAB_PROMPTS_ACTIVE_FILL_CLASS,
  HOME_TAB_PUBLIC_INACTIVE_FILL_CLASS,
  HOME_TAB_GROUPS_INACTIVE_FILL_CLASS,
  HOME_TAB_MEMBERS_INACTIVE_FILL_CLASS,
  HOME_TAB_PERSONAL_INACTIVE_FILL_CLASS,
  HOME_TAB_MEMORIZE_INACTIVE_FILL_CLASS,
  HOME_TAB_PROMPTS_INACTIVE_FILL_CLASS,
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS,
  HOME_GROUPS_SUB_FILTER_GROUP_CLASS,
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS,
  HOME_PROMPTS_SUB_FILTER_GROUP_CLASS,
  HOME_PERSONAL_FILL_LIGHT_CLASS,
  HOME_TAB_PUBLIC_CHIP_ACTIVE_CLASS,
  HOME_TAB_GROUPS_CHIP_ACTIVE_CLASS,
  HOME_TAB_MEMBERS_CHIP_ACTIVE_CLASS,
  HOME_TAB_PROMPTS_CHIP_ACTIVE_CLASS,
  HOME_TAB_MEMORIZE_CHIP_ACTIVE_CLASS,
  HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS,
  "hover:border-[var(--home-tab-public-border)]",
  "hover:border-[var(--home-tab-groups-border)]",
  "hover:border-[var(--home-tab-members-border)]",
  "hover:border-[var(--home-tab-personal-border)]",
  "hover:border-[var(--home-tab-memorize-border)]",
  "hover:border-[var(--home-tab-prompts-border)]",
].join(" ");

/** Default tab accent borders (CSS variables resolve per theme on html). */
export const HOME_FILTER_TAB_BORDER = {
  public: "var(--home-tab-public-border)",
  personal: "var(--home-tab-personal-border)",
  prompts: "var(--home-tab-prompts-border)",
  memorize: "var(--home-tab-memorize-border)",
} as const;
