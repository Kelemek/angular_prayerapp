/** Home prayer card horizontal padding (mobile tighter, sm+ unchanged). */
export const PRAYER_CARD_SHELL_PADDING_CLASSES = 'px-4 sm:px-6';

/** Negative margin for meta header bands that bleed to the card edge. */
export const PRAYER_CARD_HEADER_BLEED_CLASSES = '-mx-4 sm:-mx-6';

/** Inset padding for content aligned with the card body on sm+. */
export const PRAYER_CARD_HEADER_INSET_CLASSES = 'px-4 sm:px-6';

/**
 * Tighter actions-column inset when the card has no corner unread badge
 * (personal prayers). Keeps icons closer to the card edge than badge clearance.
 */
export const PRAYER_CARD_META_HEADER_ACTIONS_INSET_COMPACT_CLASSES =
  'px-2 sm:px-3';

/** Horizontal gap between action icons in prayer/update meta headers (gap-1 is rem and scales). */
export const PRAYER_CARD_META_ACTIONS_GAP_CLASSES = 'gap-[4px]';

/** Icon hit-area padding in meta header bands (p-1.5 / p-1 are rem and scale). */
export const PRAYER_CARD_META_HEADER_ICON_BUTTON_PADDING_CLASSES =
  'p-[6px] sm:p-[4px]';

/** Horizontal padding around center date/time in meta header bands (px-2 is rem and scales). */
export const PRAYER_CARD_META_HEADER_CENTER_PADDING_CLASSES = 'px-[8px]';

/** Meta header band min height — fixed px (not min-h-9 rem) so the band stays stable when Settings text size changes. */
export const PRAYER_CARD_META_HEADER_MIN_HEIGHT_CLASSES = 'min-h-[36px]';

/** Fixed px type for meta header bands (Tailwind text-xs/sm use rem and scale with Settings text size). */
export const PRAYER_CARD_META_HEADER_TEXT_XS_CLASSES = 'text-[12px]';
export const PRAYER_CARD_META_HEADER_TEXT_SM_CLASSES = 'text-[14px]';
/** Center date/time at md size: 12px base, 14px from md breakpoint (full class string for Tailwind). */
export const PRAYER_CARD_META_HEADER_TEXT_XS_MD_CLASSES =
  'text-[12px] md:text-[14px]';
export const PRAYER_CARD_META_HEADER_TEXT_SM_MD_CLASSES =
  'text-[14px] md:text-[16px]';
