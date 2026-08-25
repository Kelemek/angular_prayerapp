/** Shared vertical rhythm for the home shell (matches header py-2 sm:py-3). */
export const HOME_SHELL_SECTION_GAP_CLASSES = "mb-2 sm:mb-3";

/** No gap between folder tabs and the connected sub-filter panel directly below. */
export const HOME_SHELL_FILTER_TAB_GAP_CLASSES = "mb-0";

/** Stack gap between home list items (prayer cards, prompts, etc.). */
export const HOME_SHELL_STACK_GAP_CLASSES = "space-y-2 sm:space-y-3";

/**
 * Row host class for prompts CDK virtual scroll items.
 * Padding: home-prayer-content.component.css. Shell mb-2 is cleared in
 * prompt-card.component.css so gap matches collapsed space-y on other tabs.
 */
export const HOME_PROMPT_VIRTUAL_SCROLL_ITEM_CLASSES =
  "home-prompt-virtual-scroll-item";
