/** Max markdown characters per **split segment** before hard-splitting (one card body per segment). */
export const PRINT_BOOKLET_MARKDOWN_CHARS_PER_PANEL = 1750;

/** Card chrome: header row, border, gaps between stacked cards (tune with booklet CSS padding) */
export const PRINT_BOOKLET_CARD_FRAME_CHARS = 228;

/** First chunk of each status section carries the colored section `h2` */
export const PRINT_BOOKLET_SECTION_H2_RESERVE = 275;

/**
 * Virtual “ink” budget per half-letter chunk when greedily packing prayer cards.
 * First usable slice ≈ this − {@link PRINT_BOOKLET_SECTION_H2_RESERVE} − {@link PRINT_BOOKLET_PANEL_BOTTOM_SLACK} when `h2` is present.
 */
export const PRINT_BOOKLET_PANEL_PACK_BUDGET = 3400;

/** Markdown often expands in HTML (lists, line wraps). Weight ≈ ceil(len * factor) + frame + reserves. */
export const PRINT_BOOKLET_MARKDOWN_TO_HTML_WEIGHT = 1.25;

/**
 * Subtract from cap each chunk so totals stay below `.booklet-panel { overflow:hidden }`.
 * Tuned with panel padding and with {@link buildBookletMeasurePackScript} fit tolerance (~rounding + bottom-inset dip).
 */
export const PRINT_BOOKLET_PANEL_BOTTOM_SLACK = 220;

/**
 * Box chrome for compact booklet Updates (header “Updates (n):”, meta row, margins, bordered panel).
 * Does **not** include update body — weighed separately via compact update estimators.
 */
export const PRINT_BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS = 320;

/** Updates render in a narrow inset column; prose wraps more aggressively than descriptions */
export const PRINT_BOOKLET_UPDATES_MARKDOWN_FACTOR = 1.48;

/** Bullet / numbered Markdown lines inflate height versus running prose */
export const PRINT_BOOKLET_MARKDOWN_LIST_LINE_PREMIUM = 102;

export const PRINT_BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM = 18;

/** Upper bound stacked cards per half-letter chunk — conservative to avoid underestimated combined height. */
export const PRINT_BOOKLET_MAX_UNITS_PER_PANEL_CHUNK = 5;

/** Virtual weight for one booklet prompt type block: section `h2` + title cards (one fragment per type). */
export const PRINT_BOOKLET_PROMPT_SECTION_HEADING_WEIGHT = 220;
