import {
  HOME_INACTIVE_SURFACE_BG_CLASS,
  HOME_INACTIVE_SURFACE_BORDER_CLASS,
  HOME_PROMPTS_PANEL_CHIP_ACTIVE_FILL_CLASS,
} from "./home-sub-filter-chip-classes";

/** Outlined stone/tan chip fill shared by Prompts filters and type pills. */
export const PROMPT_TYPE_CHIP_ACTIVE_CLASS =
  `border !border-[#988F83] dark:!border-[#988F83] ${HOME_PROMPTS_PANEL_CHIP_ACTIVE_FILL_CLASS} ring ring-[#988F83] dark:ring-[#988F83] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md`;

export const PROMPT_TYPE_CHIP_INACTIVE_CLASS = [
  HOME_INACTIVE_SURFACE_BG_CLASS,
  "text-gray-700 dark:text-gray-300",
  HOME_INACTIVE_SURFACE_BORDER_CLASS,
  "hover:border-[#988F83] dark:hover:border-[#988F83]",
].join(" ");
