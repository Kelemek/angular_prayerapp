/** Section heading color for personal prayer categories in printable HTML. */
export function getPrintCategoryColor(category: string): string {
// Define a set of colors for categories
const colors: { [key: string]: string } = {
  'Health': '#DC2626',
  'Family': '#2563EB',
  'Work': '#7C3AED',
  'Financial': '#059669',
  'Spiritual': '#7C3AED',
  'Relationships': '#EC4899',
  'Personal': '#0891B2',
  'Other': '#6366F1',
  'Answered': '#39704D'
};

// Return the color for the category, or use a hash-based color if not predefined
if (colors[category]) {
  return colors[category];
}

// Generate a consistent color based on category name hash
let hash = 0;
for (let i = 0; i < category.length; i++) {
  hash = category.charCodeAt(i) + ((hash << 5) - hash);
}

const hue = Math.abs(hash % 360);
return `hsl(${hue}, 70%, 50%)`;
}
