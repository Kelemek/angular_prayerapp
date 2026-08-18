import { escapeHtmlForPrint } from './print-html';
import { getPrintCategoryColor } from './print-category-colors';
import { buildPrintPersonalPrayerCardHtml } from './print-personal-prayer-card-html';

export function buildPrintPersonalPrayerListDocumentHtml(prayers: any[], categories?: string[]): string {
const now = new Date();
const today = now.toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

const currentTime = now.toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const categoryLabel = categories && categories.length > 0
  ? `Categories: ${categories.join(', ')}`
  : 'All Categories';

const dateRange = `${categoryLabel} (as of ${today})`;

// Group prayers by category
const prayersByCategory: { [key: string]: any[] } = {};
prayers.forEach((prayer: any) => {
  const category = prayer.category || 'Uncategorized';
  if (!prayersByCategory[category]) {
    prayersByCategory[category] = [];
  }
  prayersByCategory[category].push(prayer);
});

// Sort prayers within each category by most recent activity
const sortByRecentActivity = (a: any, b: any) => {
  const aLatestUpdate = a.updates && a.updates.length > 0
    ? Math.max(...a.updates.map((u: any) => new Date(u.created_at).getTime()))
    : 0;
  const bLatestUpdate = b.updates && b.updates.length > 0
    ? Math.max(...b.updates.map((u: any) => new Date(u.created_at).getTime()))
    : 0;

  const aLatestActivity = Math.max(new Date(a.created_at).getTime(), aLatestUpdate);
  const bLatestActivity = Math.max(new Date(b.created_at).getTime(), bLatestUpdate);

  return bLatestActivity - aLatestActivity;
};

// Sort each category's prayers
Object.keys(prayersByCategory).forEach(category => {
  prayersByCategory[category].sort(sortByRecentActivity);
});

// Sort categories for consistent display
const sortedCategories = Object.keys(prayersByCategory).sort();

let prayerSectionsHTML = '';

// Generate sections for each category
sortedCategories.forEach(category => {
  const categoryPrayers = prayersByCategory[category];
  if (categoryPrayers.length > 0) {
    const prayersHTML = categoryPrayers.map((prayer: any) => buildPrintPersonalPrayerCardHtml(prayer)).join('');
    
    // Use a color scheme for categories (similar to status colors)
    const categoryColor = getPrintCategoryColor(category);
    
    prayerSectionsHTML += `
      <div class="category-section">
        <h2 style="color: ${categoryColor}; border-bottom: 2px solid ${categoryColor}; padding-bottom: 3px; margin-bottom: 4px; margin-top: 8px; font-size: 16px;">
          ${category} (${categoryPrayers.length})
        </h2>
        <div class="columns">
          ${prayersHTML}
        </div>
      </div>
    `;
  }
});

return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personal Prayers - ${today}</title>
  <style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  line-height: 1.3;
  color: #222;
  background: white;
  padding: 8px;
  max-width: 1000px;
  margin: 0 auto;
  font-size: 12px;
}

.header {
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.header-right {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}

.header h1 {
  font-size: 16px;
  color: #1f2937;
  margin: 0;
}

.header .subtitle {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.date-range {
  font-size: 11px;
  color: #4b5563;
}

.category-section {
  margin-bottom: 4px;
}

.prayer-item {
  background: transparent;
  border: 1px solid #e6e6e6;
  padding: 4px 6px;
  margin-bottom: 4px;
  border-radius: 2px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.prayer-item.current {
  border-left: 3px solid #3b82f6;
}

.prayer-item.answered {
  border-left: 3px solid #10b981;
}

.prayer-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 3px;
  display: inline;
}

.prayer-for {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 3px;
  font-weight: 600;
}

.prayer-meta {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 3px;
  font-style: italic;
  display: flex;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
}

.prayer-description {
  font-size: 12px;
  color: #374151;
  line-height: 1.4;
  margin-bottom: 3px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Markdown HTML: * { padding: 0 } strips ul/ol indent — bullets/numbers vanish in print */
.prayer-description p,
.update-item p {
  margin: 0 0 0.35em 0;
}
.prayer-description p:last-child,
.update-item p:last-child {
  margin-bottom: 0;
}
.prayer-description ul,
.prayer-description ol,
.update-item ul,
.update-item ol {
  margin: 0.35em 0;
  padding-left: 1.5em;
}
.prayer-description ul,
.update-item ul {
  list-style-type: disc;
  list-style-position: outside;
}
.prayer-description ol,
.update-item ol {
  list-style-type: decimal;
  list-style-position: outside;
}
.prayer-description li,
.update-item li {
  display: list-item;
  margin: 0.15em 0;
}
.prayer-description ul ul,
.update-item ul ul {
  list-style-type: circle;
  margin-top: 0.15em;
}
.prayer-description blockquote,
.update-item blockquote {
  margin: 0.35em 0;
  padding: 0.2em 0 0.2em 0.75em;
  border-left: 3px solid #cbd5e1;
}

.prayer-description strong,
.update-item strong {
  font-weight: 600;
}
.prayer-description em,
.update-item em {
  font-style: italic;
}
.prayer-description u,
.update-item u {
  text-decoration: underline;
}
.prayer-description s,
.update-item s {
  text-decoration: line-through;
}

.updates-section {
  margin-top: 6px;
  padding: 6px 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  border-left: 3px solid #0ea5e9;
}

.updates-header {
  font-size: 11px;
  font-weight: 700;
  color: #0369a1;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.update-item {
  font-size: 11px;
  color: #1e3a5f;
  line-height: 1.4;
  margin-bottom: 3px;
  padding-left: 8px;
  border-left: 2px solid #7dd3fc;
}

.update-item:last-child {
  margin-bottom: 0;
}

.update-meta {
  font-weight: 700;
  color: #0369a1;
}

.columns {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prayer-item {
  width: 100%;
}

@media screen and (max-width: 768px) {
  body {
    padding: 15px;
    font-size: 16px;
  }

  .header h1 {
    font-size: 24px;
  }
}

@media print {
  body {
    padding: 0;
  }
  .columns {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .prayer-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
  </style>
</head>
<body>
  <div class="header">
<div class="header-left">
  <h1>🙏 Personal Prayers</h1>
  <span class="date-range">${dateRange}</span>
</div>
<div class="header-right">
  Generated: ${today} at ${currentTime}
</div>
  </div>

  ${prayerSectionsHTML}

  <script>
window.onload = function() {
  window.print();
};
  </script>
</body>
</html>
`.trim();
}
