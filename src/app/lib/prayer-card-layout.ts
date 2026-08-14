import { HOME_SHELL_SECTION_GAP_CLASSES } from './home-shell-spacing';

/** Home prayer card horizontal padding (mobile tighter, sm+ unchanged). */
export const PRAYER_CARD_SHELL_PADDING_CLASSES = 'px-4 sm:px-6';

/** Negative margin for meta header bands that bleed to the card edge. */
export const PRAYER_CARD_HEADER_BLEED_CLASSES = '-mx-4 sm:-mx-6';

/** Presentation slide cards — tighter on mobile, p-8 from md up for projector slides. */
export const PRESENTATION_CARD_SHELL_PADDING_CLASSES =
  'px-4 sm:px-6 md:px-8';
export const PRESENTATION_CARD_HEADER_BLEED_CLASSES =
  '-mx-4 sm:-mx-6 md:-mx-8';
export const PRESENTATION_CARD_HEADER_INSET_CLASSES =
  'px-4 sm:px-6 md:px-8';

/** Inset padding for content aligned with the card body on sm+. */
export const PRAYER_CARD_HEADER_INSET_CLASSES = 'px-4 sm:px-6';

/**
 * Tighter actions-column inset when the card has no corner unread badge
 * (personal prayers). Keeps icons closer to the card edge than badge clearance.
 */
export const PRAYER_CARD_META_HEADER_ACTIONS_INSET_COMPACT_CLASSES =
  'px-1 sm:px-3';

/** Personal category label in meta header — compact right edge, slightly more left inset. */
export const PRAYER_CARD_PERSONAL_CATEGORY_HEADER_INSET_CLASSES =
  'pl-2 pr-1 sm:px-3';

/** Uniform meta-header icon box (16px) so flex gaps look even between glyphs. */
export const PRAYER_CARD_META_HEADER_ICON_SIZE_CLASSES = 'block size-[16px] shrink-0';

/** Shared flex centering for meta-header icon hit targets. */
export const PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES =
  'inline-flex items-center justify-center shrink-0';

/** Horizontal gap between action icons in prayer/update meta headers. */
export const PRAYER_CARD_META_ACTIONS_GAP_CLASSES = 'gap-[2px] sm:gap-[4px]';

/** Tighter mobile gap when a card shows four personal header actions. */
export const PRAYER_CARD_META_ACTIONS_GAP_COMPACT_CLASSES = 'gap-[1px] sm:gap-[4px]';

/** Icon hit-area padding in meta header bands (fixed px; does not scale with text size). */
export const PRAYER_CARD_META_HEADER_ICON_BUTTON_PADDING_CLASSES = 'p-[4px]';

/** Horizontal padding around center date/time in meta header bands (px-2 is rem and scales). */
export const PRAYER_CARD_META_HEADER_CENTER_PADDING_CLASSES = 'px-[8px]';

/** Meta header band min height — fixed px (not min-h-9 rem) so the band stays stable when Settings text size changes. */
export const PRAYER_CARD_META_HEADER_MIN_HEIGHT_CLASSES = 'min-h-[36px]';

/** Fixed px type for meta header bands (Tailwind text-xs/sm use rem and scale with Settings text size). */
export const PRAYER_CARD_META_HEADER_TEXT_XS_CLASSES = 'text-[12px]';
export const PRAYER_CARD_META_HEADER_TEXT_SM_CLASSES = 'text-[14px]';

export type MetaHeaderBandSize = 'sm';

export interface MetaHeaderBandLayoutClasses {
  minHeightClasses: string;
  textSmClasses: string;
  textXsClasses: string;
  centerTextClasses: string;
  iconSizeClasses: string;
  iconButtonPaddingClasses: string;
  centerPaddingClasses: string;
  actionsGapClasses: string;
  actionsGapCompactClasses: string;
  bandMarginClasses: string;
}

const META_HEADER_BAND_LAYOUT: MetaHeaderBandLayoutClasses = {
  minHeightClasses: PRAYER_CARD_META_HEADER_MIN_HEIGHT_CLASSES,
  textSmClasses: PRAYER_CARD_META_HEADER_TEXT_SM_CLASSES,
  textXsClasses: PRAYER_CARD_META_HEADER_TEXT_XS_CLASSES,
  centerTextClasses: PRAYER_CARD_META_HEADER_TEXT_XS_CLASSES,
  iconSizeClasses: PRAYER_CARD_META_HEADER_ICON_SIZE_CLASSES,
  iconButtonPaddingClasses: PRAYER_CARD_META_HEADER_ICON_BUTTON_PADDING_CLASSES,
  centerPaddingClasses: PRAYER_CARD_META_HEADER_CENTER_PADDING_CLASSES,
  actionsGapClasses: PRAYER_CARD_META_ACTIONS_GAP_CLASSES,
  actionsGapCompactClasses: PRAYER_CARD_META_ACTIONS_GAP_COMPACT_CLASSES,
  bandMarginClasses: 'mb-4',
};

export function getMetaHeaderBandLayoutClasses(
  _size: MetaHeaderBandSize = 'sm'
): MetaHeaderBandLayoutClasses {
  return META_HEADER_BAND_LAYOUT;
}

export type PrayerCardVariant = 'home' | 'presentation';

interface CardVariantChrome {
  bandSize: MetaHeaderBandSize;
  shellPaddingClasses: string;
  headerBleedClasses: string;
  headerInsetClasses: string;
  usePresentationWrapper: boolean;
  presentationScrollClasses: string;
  actionRowGap: string;
  actionButtonClasses: string;
  prayedForBadgeClasses: string;
  showUnreadBadges: boolean;
}

const HOME_CARD_CHROME: CardVariantChrome = {
  bandSize: 'sm',
  shellPaddingClasses: PRAYER_CARD_SHELL_PADDING_CLASSES,
  headerBleedClasses: PRAYER_CARD_HEADER_BLEED_CLASSES,
  headerInsetClasses: PRAYER_CARD_HEADER_INSET_CLASSES,
  usePresentationWrapper: false,
  presentationScrollClasses: '',
  actionRowGap: 'gap-1',
  actionButtonClasses:
    'flex-shrink-0 px-2 py-1 text-xs font-medium whitespace-nowrap',
  prayedForBadgeClasses:
    'flex-shrink-0 px-1.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-600 dark:border-blue-500 whitespace-nowrap',
  showUnreadBadges: true,
};

const PRESENTATION_CARD_CHROME: CardVariantChrome = {
  bandSize: 'sm',
  shellPaddingClasses: PRESENTATION_CARD_SHELL_PADDING_CLASSES,
  headerBleedClasses: PRESENTATION_CARD_HEADER_BLEED_CLASSES,
  headerInsetClasses: PRESENTATION_CARD_HEADER_INSET_CLASSES,
  usePresentationWrapper: true,
  presentationScrollClasses: 'presentation-card-elevation w-full max-h-full rounded-3xl',
  actionRowGap: 'gap-2 sm:gap-3',
  actionButtonClasses:
    'px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base md:text-lg font-medium whitespace-nowrap',
  prayedForBadgeClasses:
    'px-2 py-1.5 text-sm sm:px-3 sm:py-2 sm:text-base md:text-lg font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-600 dark:border-blue-500 whitespace-nowrap',
  showUnreadBadges: false,
};

export interface PrayerCardVariantLayout extends CardVariantChrome {
  shellBaseClasses: string;
  shellTopPaddingWhenMetaHeader: string;
  shellTopPaddingWithoutMetaHeader: string;
  shellBottomPadding: string;
  shellOuterMargin: string;
  titleClasses: string;
  requesterClasses: string;
  descriptionClasses: string;
  headerRowMargin: string;
  titleRowGap: string;
  avatarClasses: string;
  updateRowSize: MetaHeaderBandSize;
  updateShellClass: string;
  updateContentClass: string;
  updateSectionSpacing: string;
  updateToggleButtonClasses: string;
  showTourAnchors: boolean;
}

const HOME_PRAYER_CARD_VARIANT_LAYOUT: PrayerCardVariantLayout = {
  ...HOME_CARD_CHROME,
  shellBaseClasses:
    'bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] transition-colors relative',
  shellTopPaddingWhenMetaHeader: 'pt-0',
  shellTopPaddingWithoutMetaHeader: 'pt-6',
  shellBottomPadding: 'pb-4',
  shellOuterMargin: HOME_SHELL_SECTION_GAP_CLASSES,
  titleClasses: 'text-lg font-semibold text-gray-800 dark:text-gray-100 mb-0 inline',
  requesterClasses: 'text-sm text-gray-600 dark:text-gray-400',
  descriptionClasses: 'block text-gray-600 dark:text-gray-300 mb-4',
  headerRowMargin: 'mb-4',
  titleRowGap: 'gap-3',
  avatarClasses:
    'w-20 h-20 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0',
  updateRowSize: 'sm',
  updateShellClass: 'rounded-lg',
  updateContentClass: 'block text-sm text-gray-700 dark:text-gray-300',
  updateSectionSpacing: 'space-y-3',
  updateToggleButtonClasses:
    'text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1',
  showTourAnchors: true,
};

const PRESENTATION_PRAYER_CARD_VARIANT_LAYOUT: PrayerCardVariantLayout = {
  ...PRESENTATION_CARD_CHROME,
  shellBaseClasses:
    'bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto presentation-card-scroll transition-colors relative',
  shellTopPaddingWhenMetaHeader: 'pt-0',
  shellTopPaddingWithoutMetaHeader:
    'px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8',
  shellBottomPadding: 'pb-4 sm:pb-6 md:pb-8',
  shellOuterMargin: '',
  titleClasses:
    'text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100 mb-0 inline',
  requesterClasses:
    'text-xs sm:text-sm md:text-base lg:text-xl text-gray-600 dark:text-gray-400',
  descriptionClasses:
    'block text-base sm:text-lg md:text-2xl lg:text-3xl leading-relaxed text-gray-800 dark:text-gray-100 mb-4 sm:mb-6',
  headerRowMargin: 'mb-4 md:mb-6',
  titleRowGap: 'gap-3 md:gap-6',
  avatarClasses:
    'w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900 shadow-xl flex-shrink-0',
  updateRowSize: 'sm',
  updateShellClass: 'rounded-xl',
  updateContentClass:
    'block text-base md:text-lg lg:text-xl text-gray-800 dark:text-gray-200',
  updateSectionSpacing: 'space-y-4',
  updateToggleButtonClasses:
    'text-sm md:text-base text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1',
  showTourAnchors: false,
};

export function getPrayerCardVariantLayout(
  variant: PrayerCardVariant
): PrayerCardVariantLayout {
  switch (variant) {
    case 'presentation':
      return PRESENTATION_PRAYER_CARD_VARIANT_LAYOUT;
    case 'home':
      return HOME_PRAYER_CARD_VARIANT_LAYOUT;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export interface PromptCardVariantLayout extends CardVariantChrome {
  shellBaseClasses: string;
  shellOuterMargin: string;
  typeHeaderClasses: string;
  titleClasses: string;
  descriptionClasses: string;
  titleRowMargin: string;
  descriptionMargin: string;
  typeHeaderInteractive: boolean;
}

const HOME_PROMPT_CARD_VARIANT_LAYOUT: PromptCardVariantLayout = {
  ...HOME_CARD_CHROME,
  shellBaseClasses:
    'prompt-card bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] !border-[#988F83] dark:!border-[#988F83] pt-0 pb-4 transition-colors relative',
  shellOuterMargin: HOME_SHELL_SECTION_GAP_CLASSES,
  typeHeaderClasses: '',
  titleClasses: 'text-lg font-semibold text-gray-700 dark:text-gray-300',
  descriptionClasses:
    'text-gray-600 dark:text-gray-300 whitespace-pre-wrap',
  titleRowMargin: 'mb-4',
  descriptionMargin: 'mb-4',
  typeHeaderInteractive: true,
};

const PRESENTATION_PROMPT_CARD_VARIANT_LAYOUT: PromptCardVariantLayout = {
  ...PRESENTATION_CARD_CHROME,
  shellBaseClasses:
    'bg-white dark:bg-gray-800 rounded-3xl pt-0 pb-4 sm:pb-6 md:pb-8 border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto presentation-card-scroll transition-colors relative',
  shellOuterMargin: '',
  typeHeaderClasses: 'text-[#988F83] dark:text-[#988F83]',
  titleClasses:
    'text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100',
  descriptionClasses:
    'text-base sm:text-lg md:text-2xl lg:text-3xl leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap',
  titleRowMargin: 'mb-4 md:mb-6',
  descriptionMargin: 'mb-4 md:mb-6',
  typeHeaderInteractive: false,
};

export function getPromptCardVariantLayout(
  variant: PrayerCardVariant
): PromptCardVariantLayout {
  switch (variant) {
    case 'presentation':
      return PRESENTATION_PROMPT_CARD_VARIANT_LAYOUT;
    case 'home':
      return HOME_PROMPT_CARD_VARIANT_LAYOUT;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
