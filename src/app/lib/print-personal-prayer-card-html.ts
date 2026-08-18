import { escapeHtmlForPrint } from './print-html';
import { renderPrintMarkdown } from './print-render-markdown';

export function buildPrintPersonalPrayerCardHtml(prayer: {
  status: string;
  title: string;
  created_at: string;
  description?: string;
  updates?: Array<{ created_at: string; content: string }>;
}): string {
const createdDate = new Date(prayer.created_at).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// Sort updates by date (newest first)
const sortedUpdates = Array.isArray(prayer.updates) 
  ? [...prayer.updates].sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  : [];

// Get updates from the last week
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const recentUpdates = sortedUpdates.filter(update => 
  new Date(update.created_at).getTime() > oneWeekAgo.getTime()
);

// If there are updates less than 1 week old, show all of them
// Otherwise, show only the most recent update
const updates = recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);

// Show updates in condensed format with minimal spacing
const updatesHTML = updates.length > 0 ? `
  <div class="updates-section">
    <div class="updates-header">Updates (${updates.length}):</div>
    ${updates.map(update => {
      const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      return `<div class="update-item"><span class="update-meta">${updateDate}:</span> ${renderPrintMarkdown(update.content)}</div>`;
    }).join('')}
  </div>
` : '';

return `
  <div class="prayer-item ${prayer.status}">
    <div class="prayer-title">${escapeHtmlForPrint(prayer.title)}</div>
    <div class="prayer-meta">
      <span>${createdDate}</span>
    </div>
    ${prayer.description ? `<div class="prayer-description">${renderPrintMarkdown(prayer.description)}</div>` : ''}
    ${updatesHTML}
  </div>
`;
}
