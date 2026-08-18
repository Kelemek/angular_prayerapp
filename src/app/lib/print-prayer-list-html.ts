import { buildPrintInfoFooterHtml, getPrintInfoFooterStyles } from './print-info-footer';
import { escapeHtmlForPrint } from './print-html';
import { buildPrintPrayerCardHtml } from './print-prayer-card-html';
import { setPrintStartDateForTimeRange } from './print-time-range';
import type { Prayer, TimeRange } from './print-types';

export function buildPrintPrayerListDocumentHtml(
  prayers: Prayer[],
  timeRange: TimeRange = 'month',
  infoQrImageSrc: string,
): string {
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

// Calculate start date based on time range
const startDate = new Date();

setPrintStartDateForTimeRange(startDate, now, timeRange);

const dateRange = timeRange === 'all' 
  ? `All Prayers (as of ${today})`
  : `${startDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })} - ${today}`;

// Group prayers by status
const prayersByStatus = {
  current: prayers.filter(p => p.status === 'current'),
  answered: prayers.filter(p => p.status === 'answered')
};

// Sort prayers within each status by most recent activity
const sortByRecentActivity = (a: Prayer, b: Prayer) => {
  const aLatestUpdate = a.prayer_updates && a.prayer_updates.length > 0
    ? Math.max(...a.prayer_updates.map(u => new Date(u.created_at).getTime()))
    : 0;
  const bLatestUpdate = b.prayer_updates && b.prayer_updates.length > 0
    ? Math.max(...b.prayer_updates.map(u => new Date(u.created_at).getTime()))
    : 0;

  const aLatestActivity = Math.max(new Date(a.created_at).getTime(), aLatestUpdate);
  const bLatestActivity = Math.max(new Date(b.created_at).getTime(), bLatestUpdate);

  return bLatestActivity - aLatestActivity;
};

prayersByStatus.current.sort(sortByRecentActivity);
prayersByStatus.answered.sort(sortByRecentActivity);

const statusLabels = {
  current: 'Current Prayer Requests',
  answered: 'Answered Prayers'
};

const statusColors = {
  current: '#0047AB',
  answered: '#39704D'
};

let prayerSectionsHTML = '';

// Generate sections for each status
(['current', 'answered'] as const).forEach(status => {
  const statusPrayers = prayersByStatus[status];
  if (statusPrayers.length > 0) {
    const prayersHTML = statusPrayers.map(prayer => buildPrintPrayerCardHtml(prayer)).join('');
    
    prayerSectionsHTML += `
      <div class="status-section">
        <h2 style="color: ${statusColors[status]}; border-bottom: 2px solid ${statusColors[status]}; padding-bottom: 3px; margin-bottom: 4px; margin-top: 8px; font-size: 16px;">
          ${statusLabels[status]} (${statusPrayers.length})
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
  <title>Prayer List - ${today}</title>
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

.status-section {
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

.prayer-item.archived {
  border-left: 3px solid #6b7280;
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
${getPrintInfoFooterStyles()}

@media screen and (max-width: 768px) {
  body {
    padding: 15px;
    font-size: 16px;
  }

  .header h1 {
    font-size: 24px;
  }

  .prayer-title {
    font-size: 16px;
  }

  .prayer-item {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

@media print {
  body {
    padding: 0;
  }

  .no-print {
    display: none !important;
  }

  .prayer-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  h2 {
    page-break-after: avoid;
    break-after: avoid;
    margin-top: 4px;
  }

  .print-info-footer {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}

@page {
  margin: 0.5in;
  size: letter;
}
  </style>
</head>
<body>
  <div class="header">
<div class="header-left">
  <h1>🙏 Church Prayer List</h1>
  <span class="date-range">${dateRange}</span>
</div>
<div class="header-right">
  Generated: ${today} at ${currentTime}
</div>
  </div>
  ${prayerSectionsHTML}
  ${buildPrintInfoFooterHtml(infoQrImageSrc)}

  <script>
window.onload = function() {
  window.print();
};
  </script>
</body>
</html>
`.trim();
}
