/** Preset swatches for the personal category color picker (shown as category pill previews). */
export const PERSONAL_CATEGORY_COLOR_PRESETS: readonly string[] = [
  '#DC2626',
  '#2563EB',
  '#059669',
  '#7C3AED',
  '#D97706',
  '#0891B2',
];

const NAMED_CATEGORY_COLORS: Readonly<Record<string, string>> = {
  Health: '#DC2626',
  Family: '#2563EB',
  Work: '#7C3AED',
  Financial: '#059669',
  Spiritual: '#7C3AED',
  Relationships: '#EC4899',
  Personal: '#0891B2',
  Other: '#6366F1',
  Answered: '#39704D',
};

/** Trim and cap category names (matches personal_prayers.category rules). */
export const sanitizePersonalCategoryName = (
  category: string | null | undefined
): string | null => {
  if (!category || typeof category !== 'string') {
    return null;
  }
  const trimmed = category.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 50) {
    return trimmed.substring(0, 50);
  }
  return trimmed;
};

/** Normalize to #RRGGBB or null when invalid. */
export const normalizePersonalCategoryHexColor = (
  color: string | null | undefined
): string | null => {
  if (!color || typeof color !== 'string') {
    return null;
  }
  const trimmed = color.trim();
  const match = trimmed.match(/^#?([0-9A-Fa-f]{6})$/);
  if (!match) {
    return null;
  }
  return `#${match[1].toUpperCase()}`;
};

/** Hash-based fallback when the user has not chosen a color. */
export const hashPersonalCategoryColor = (category: string): string => {
  if (NAMED_CATEGORY_COLORS[category]) {
    return NAMED_CATEGORY_COLORS[category];
  }

  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

/** Stored color for a category, or hash/named default. */
export const getPersonalCategoryColor = (
  category: string | null | undefined,
  storedColors: Readonly<Record<string, string>> = {}
): string => {
  const sanitized = sanitizePersonalCategoryName(category);
  if (!sanitized) {
    return '#6366F1';
  }
  const stored = storedColors[sanitized];
  const normalized = normalizePersonalCategoryHexColor(stored);
  if (normalized) {
    return normalized;
  }
  return hashPersonalCategoryColor(sanitized);
};

const DARK_PILL_SURFACE = '#1f2937';

/** CSS variables for `.personal-category-pill` (see styles.css). */
export const personalCategoryPillCssVariables = (
  color: string
): Record<string, string> => {
  const base = normalizePersonalCategoryHexColor(color) ?? color;
  const lightAccent = `color-mix(in srgb, ${base} 70%, white)`;
  return {
    '--category-pill-bg': `color-mix(in srgb, ${base} 22%, white)`,
    '--category-pill-border': `color-mix(in srgb, ${base} 50%, white)`,
    '--category-pill-text': base,
    '--category-pill-bg-dark': `color-mix(in srgb, ${base} 28%, ${DARK_PILL_SURFACE})`,
    '--category-pill-border-dark': lightAccent,
    '--category-pill-text-dark': lightAccent,
  };
};

/** @deprecated Use personalCategoryPillCssVariables with class `personal-category-pill`. */
export const personalCategoryPillStyles = personalCategoryPillCssVariables;

/** CSS variables for `.personal-category-header-band` (subtle tint + category-colored text). */
export const personalCategoryHeaderBandStyles = personalCategoryPillCssVariables;
