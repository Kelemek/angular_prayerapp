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

/** Inline styles for a category pill (light/dark friendly tints). */
export const personalCategoryPillStyles = (
  color: string
): Record<string, string> => {
  const hex = normalizePersonalCategoryHexColor(color);
  if (hex) {
    return {
      backgroundColor: `color-mix(in srgb, ${hex} 18%, transparent)`,
      borderColor: `color-mix(in srgb, ${hex} 45%, transparent)`,
      color: hex,
    };
  }

  return {
    backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
    color: color,
  };
};
