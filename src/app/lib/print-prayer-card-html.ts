import type { Prayer } from './print-types';
import { escapeHtmlForPrint } from './print-html';
import { renderPrintMarkdown } from './print-render-markdown';

export type PrintPrayerBookletSlice = {
  descriptionMarkdown: string;
  partIndex: number;
  partCount: number;
  includeUpdates: boolean;
};

export function buildPrintPrayerCardHtml(
  prayer: Prayer,
  compactBooklet = false,
  bookletSlice?: PrintPrayerBookletSlice,
): string {
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

const createdDate = compactBooklet
  ? shortDate(prayer.created_at)
  : new Date(prayer.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

const answeredDate = prayer.date_answered
  ? compactBooklet
    ? shortDate(prayer.date_answered)
    : new Date(prayer.date_answered).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
  : null;

// Sort updates by date (newest first)
const sortedUpdates = Array.isArray(prayer.prayer_updates)
  ? [...prayer.prayer_updates].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  : [];

let updates: typeof sortedUpdates;
if (compactBooklet) {
  updates = sortedUpdates.slice(0, 1);
} else {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentUpdates = sortedUpdates.filter(
    update => new Date(update.created_at).getTime() > oneWeekAgo.getTime()
  );
  updates = recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);
}

const descMarkdown = bookletSlice?.descriptionMarkdown ?? prayer.description;

const shouldRenderUpdates =
  updates.length > 0 &&
  (!compactBooklet || !(bookletSlice && !bookletSlice.includeUpdates));

const updatesHTML = shouldRenderUpdates
  ? compactBooklet
    ? (() => {
        const u = updates[0]!;
        const uDate = shortDate(u.created_at);
        const authorName = (u as { is_anonymous?: boolean }).is_anonymous
          ? 'Anonymous'
          : u.author || 'Anonymous';
        return `
  <div class="updates-section">
    <div class="updates-header">Updates (${updates.length}):</div>
    <div class="update-item">
      <span class="update-meta">${escapeHtmlForPrint(authorName)} · ${uDate}</span>
      ${renderPrintMarkdown(u.content)}
    </div>
  </div>`;
      })()
    : `
  <div class="updates-section">
    <div class="updates-header">Updates (${updates.length}):</div>
    ${updates
      .map(update => {
        const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        const authorName = (update as { is_anonymous?: boolean }).is_anonymous
          ? 'Anonymous'
          : update.author || 'Anonymous';
        return `<div class="update-item"><span class="update-meta">Updated by: ${escapeHtmlForPrint(authorName)} • ${updateDate}:</span> ${renderPrintMarkdown(update.content)}</div>`;
      })
      .join('')}
  </div>
`
  : '';

const requesterDisplay = prayer.is_anonymous ? 'Anonymous' : prayer.requester || 'Anonymous';
const requesterText = `Requested by ${escapeHtmlForPrint(requesterDisplay)}`;
const rightMeta = answeredDate ? (compactBooklet ? `Ans. ${answeredDate}` : `Answered on ${answeredDate}`) : '';

if (!compactBooklet) {
  return `
  <div class="prayer-item ${prayer.status}">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <div class="prayer-for"><strong>Prayer For:</strong> ${escapeHtmlForPrint(prayer.prayer_for)}</div>
    </div>
    <div class="prayer-meta">
      <span>${requesterText} • ${createdDate}</span>
      <span>${rightMeta}</span>
    </div>
    <div class="prayer-description">${renderPrintMarkdown(prayer.description)}</div>
    ${updatesHTML}
  </div>
`;
}

const topMeta = `${escapeHtmlForPrint(requesterDisplay)} · ${createdDate}${rightMeta ? ` · ${rightMeta}` : ''}`;
const showContinued = !!(bookletSlice && bookletSlice.partCount > 1 && bookletSlice.partIndex > 0);
return `
  <div class="prayer-item ${prayer.status}">
    <div class="booklet-prayer-top">
      <strong>Prayer For:</strong> ${escapeHtmlForPrint(prayer.prayer_for)}
      ${showContinued ? '<span class="booklet-prayer-top-continued">(continued)</span>' : ''}
      <span class="booklet-prayer-top-meta"> · ${topMeta}</span>
    </div>
    <div class="prayer-description">${renderPrintMarkdown(descMarkdown)}</div>
    ${updatesHTML}
  </div>
`;
}
