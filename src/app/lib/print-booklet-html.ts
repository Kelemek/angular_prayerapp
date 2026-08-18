import { buildBookletMeasurePackScript } from './booklet-measure-inline';
import {
  PRINT_BOOKLET_PANEL_BOTTOM_SLACK,
  PRINT_BOOKLET_PANEL_PACK_BUDGET,
  PRINT_BOOKLET_SECTION_H2_RESERVE,
} from './print-booklet-constants';
import { padToMultipleOfFourWithBackCoverLast, saddleStitchImpose } from './print-booklet-imposition';
import {
  buildBookletInsertPageHtml,
  buildPrintBookletFrontQrFooterHtml,
  getPrintBookletNotesHeadingHtml,
} from './print-booklet-chrome';
import { buildBookletPromptBatchHtml } from './print-booklet-prompt-batch';
import {
  encodePrintUtf8Base64,
  estimateBookletUnitWeight,
  getBookletDescriptionSegmentMaxChars,
  getBookletSortedFirstUpdateMarkdown,
  packBookletUnitsIntoPageChunks,
  splitBookletMarkdownIntoPanelParts,
} from './print-booklet-pack';
import { escapeHtmlForPrint } from './print-html';
import { buildPrintPrayerCardHtml } from './print-prayer-card-html';
import { estimateBookletPromptBatchWeight } from './print-prompt-layout';
import { setPrintStartDateForTimeRange } from './print-time-range';
import type { BookletInsertPage } from '../types/booklet-insert-page';
import type { BookletPackUnit, BookletTimeRange, Prayer } from './print-types';
import { getPrintablePromptBlockStyles } from './print-prompt-layout';

export function buildSaddleStitchBookletHtml(
  prayers: Prayer[],
  timeRange: BookletTimeRange,
  coverLogoUrl: string,
  embeddedQrDataUrl: string | null = null,
  embeddedAppIconDataUrl: string | null = null,
  embeddedBackLogoDataUrl: string | null = null,
  bookletPromptSections: Array<{ typeName: string; prompts: Array<{ title: string }> }> = [],
  bookletInsertPages: BookletInsertPage[] = [],
  infoQrImageSrc: string,
  appIconUrl: string,
): string {
const now = new Date();
const today = now.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
const startDate = new Date();
setPrintStartDateForTimeRange(startDate, now, timeRange);
const dateRange = `${startDate.toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric'
})} - ${today}`;

const prayersByStatus = {
  current: prayers.filter(p => p.status === 'current'),
  answered: prayers.filter(p => p.status === 'answered')
};
const sortByRecentActivity = (a: Prayer, b: Prayer) => {
  const aLatestUpdate =
    a.prayer_updates && a.prayer_updates.length > 0
      ? Math.max(...a.prayer_updates.map(u => new Date(u.created_at).getTime()))
      : 0;
  const bLatestUpdate =
    b.prayer_updates && b.prayer_updates.length > 0
      ? Math.max(...b.prayer_updates.map(u => new Date(u.created_at).getTime()))
      : 0;
  return (
    Math.max(new Date(b.created_at).getTime(), bLatestUpdate) -
    Math.max(new Date(a.created_at).getTime(), aLatestUpdate)
  );
};
prayersByStatus.current.sort(sortByRecentActivity);
prayersByStatus.answered.sort(sortByRecentActivity);

const statusLabels = { current: 'Current Prayer Requests', answered: 'Answered Prayers' } as const;
const contentPageInners: string[] = [];
const sectionsForMeasure: Array<{
  h2: string;
  fragments: string[];
  /** Booklet prompt batches only: parallel to fragments for inline measure script (`buildBookletMeasurePackScript`). */
  promptBatchMeta?: Array<{ t: string; b: number } | null>;
  packMode?: 'default' | 'onePerPage';
}> = [];

(['current', 'answered'] as const).forEach(status => {
  const list = prayersByStatus[status];
  if (list.length === 0) {
    return;
  }
  const title = `${statusLabels[status]} (${list.length})`;
  const h2 = `<h2 class="booklet-h2">${escapeHtmlForPrint(title)}</h2>`;

  const units: { html: string; weight: number }[] = [];
  for (const prayer of list) {
    const hasUpdates =
      Array.isArray(prayer.prayer_updates) && prayer.prayer_updates.length > 0;
    const firstUpdateMarkdown = hasUpdates ? getBookletSortedFirstUpdateMarkdown(prayer) : null;
    const descSegmentMax = getBookletDescriptionSegmentMaxChars(firstUpdateMarkdown);
    const descParts = splitBookletMarkdownIntoPanelParts(
      prayer.description,
      descSegmentMax
    );
    descParts.forEach((partMarkdown, pi) => {
      const slice = {
        descriptionMarkdown: partMarkdown,
        partIndex: pi,
        partCount: descParts.length,
        includeUpdates: pi === descParts.length - 1
      };
      const includeUpdateBlock = !!(slice.includeUpdates && hasUpdates && firstUpdateMarkdown);
      units.push({
        html: buildPrintPrayerCardHtml(prayer, true, slice),
        weight: estimateBookletUnitWeight(
          partMarkdown,
          includeUpdateBlock ? firstUpdateMarkdown! : null
        )
      });
    });
  }

  sectionsForMeasure.push({
    h2,
    fragments: units.map(u => u.html)
  });

  const packed = packBookletUnitsIntoPageChunks(
    units,
    h2,
    PRINT_BOOKLET_PANEL_PACK_BUDGET,
    PRINT_BOOKLET_SECTION_H2_RESERVE,
    PRINT_BOOKLET_PANEL_BOTTOM_SLACK
  );
  contentPageInners.push(...packed);
});

if (bookletInsertPages.length > 0) {
  const insertFragments = bookletInsertPages.map(p =>
    buildBookletInsertPageHtml(p.image_data)
  );
  sectionsForMeasure.push({
    h2: '',
    fragments: insertFragments,
    packMode: 'onePerPage',
  });
  for (const html of insertFragments) {
    contentPageInners.push(`<div class="booklet-chunk">${html}</div>`);
  }
}

/** One fragment per prompt type (display_order); scroll-height packing splits panels — no server-side batching within a type. */
const bookletPromptUnits: BookletPackUnit[] = [];
for (const sec of bookletPromptSections) {
  if (!sec.prompts?.length) {
    continue;
  }
  const batch = sec.prompts;
  bookletPromptUnits.push({
    html: buildBookletPromptBatchHtml(sec.typeName, batch, {
      continued: false,
      totalCountInType: sec.prompts.length
    }),
    weight: estimateBookletPromptBatchWeight(batch),
    bookletPromptMeta: {
      typeName: sec.typeName,
      batchIndex: 0,
      batchPrompts: batch,
      totalCountInType: sec.prompts.length
    }
  });
}

if (bookletPromptUnits.length > 0) {
  sectionsForMeasure.push({
    h2: '',
    fragments: bookletPromptUnits.map(u => u.html),
    promptBatchMeta: bookletPromptUnits.map(u =>
      u.bookletPromptMeta
        ? { t: u.bookletPromptMeta.typeName, b: u.bookletPromptMeta.batchIndex }
        : null
    )
  });

  const packedPrompts = packBookletUnitsIntoPageChunks(
    bookletPromptUnits.map(({ html, weight }) => ({ html, weight })),
    '',
    PRINT_BOOKLET_PANEL_PACK_BUDGET,
    0,
    PRINT_BOOKLET_PANEL_BOTTOM_SLACK
  );
  contentPageInners.push(...packedPrompts);
}

const backLogoSrc =
  coverLogoUrl.trim().length === 0
    ? ''
    : embeddedBackLogoDataUrl && embeddedBackLogoDataUrl.startsWith('data:')
      ? embeddedBackLogoDataUrl
      : coverLogoUrl;
const backLogoBlock =
  backLogoSrc.trim().length > 0
    ? `<div class="booklet-back-cover-logo-bottom"><img class="booklet-logo" src="${escapeHtmlForPrint(
        backLogoSrc
      )}" alt="" width="160" height="60" loading="eager" decoding="sync" /></div>`
    : '';
const qrSrcForCover =
  embeddedQrDataUrl && embeddedQrDataUrl.startsWith('data:')
    ? embeddedQrDataUrl
    : infoQrImageSrc;
const bookletFrontQrFooter = buildPrintBookletFrontQrFooterHtml(qrSrcForCover);
const appIconSrc =
  embeddedAppIconDataUrl && embeddedAppIconDataUrl.startsWith('data:')
    ? embeddedAppIconDataUrl
    : appIconUrl;
const appIconBlock = `<div class="booklet-cover-app-icon-wrap"><img class="booklet-app-icon" src="${escapeHtmlForPrint(
  appIconSrc
)}" alt="" width="512" height="512" loading="eager" decoding="sync" /></div>`;
const coverFrontInner = `
  <div class="booklet-cover">
    <div class="booklet-cover-main">
      ${appIconBlock}
      <h1 class="booklet-title">Prayer List</h1>
      <p class="booklet-subtitle">${escapeHtmlForPrint(dateRange)}</p>
    </div>
    ${bookletFrontQrFooter}
  </div>`;
const coverBackInner = `
<div class="booklet-back-cover">
  ${getPrintBookletNotesHeadingHtml()}
  <div class="booklet-back-cover-ruled" aria-hidden="true"></div>
  ${backLogoBlock}
</div>`.trim();

const blankInner = `
<div class="booklet-notes-page">
  ${getPrintBookletNotesHeadingHtml()}
  <div class="booklet-notes-ruled" aria-hidden="true"></div>
</div>`.trim();
const pagesBeforeBack = [coverFrontInner, ...contentPageInners];
const padded = padToMultipleOfFourWithBackCoverLast(pagesBeforeBack, () => blankInner, coverBackInner);
const panels = saddleStitchImpose(padded);

const pageSurfacesHeuristic = panels
  .map(
    side => `
  <div class="booklet-print-surface">
<div class="booklet-panel">${side.left}</div>
<div class="booklet-panel">${side.right}</div>
  </div>`
  )
  .join('\n');

const bookletPackB64 = encodePrintUtf8Base64(
  JSON.stringify({
    sections: sectionsForMeasure,
    covers: {
      coverFront: coverFrontInner,
      coverBack: coverBackInner,
      blankInner
    }
  })
);

return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prayer list booklet — ${today}</title>
  <style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #111; background: #e5e7eb; }
.no-print { font-size: 13px; padding: 12px 16px; background: #eff6ff; border-bottom: 1px solid #93c5fd; }
@media print {
  .no-print { display: none !important; }
  body { background: #fff; }
  img.booklet-front-qr,
  img.booklet-app-icon,
  img.booklet-logo {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
@page { size: letter landscape; margin: 0; }
.booklet-print-surface {
  display: flex;
  flex-direction: row;
  width: 11in;
  height: 8.5in;
  overflow: hidden;
  page-break-after: always;
}
.booklet-panel {
  width: 5.5in;
  height: 8.5in;
  /* Half-letter content inset: outer edges + spine/gutter (halved for more text per page). */
  padding: 0.21in 0.225in 0.375in 0.225in;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.45;
  border-left: 1px solid #d1d5db;
  box-sizing: border-box;
}
.booklet-panel:first-child { border-left: none; }
.booklet-h2 {
  color: #1d4ed8;
  font-size: 16.5px;
  font-weight: 700;
  border-bottom: 1px solid #93c5fd;
  margin: 0 0 10px;
  padding: 0 0 5px;
  line-height: 1.25;
  page-break-after: avoid;
  break-after: avoid;
}
.booklet-chunk { display: flex; flex-direction: column; gap: 11px; }
.booklet-insert-page {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 7.5in;
  box-sizing: border-box;
}
.booklet-insert-img {
  max-width: 100%;
  max-height: 7.5in;
  width: auto;
  height: auto;
  object-fit: contain;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
/* Prayer cards: match generatePrintableHTML(); long prayers continue via extra reader slots, not CSS break */
.prayer-item {
  background: transparent;
  border: 1px solid #e6e6e6;
  padding: 8px 10px;
  margin-bottom: 0;
  border-radius: 3px;
  page-break-inside: avoid;
  break-inside: avoid;
  width: 100%;
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
.booklet-prayer-top {
  font-size: 13.5px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 5px;
  line-height: 1.35;
}
.booklet-prayer-top-meta {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  font-style: italic;
}
.booklet-prayer-top-continued {
  margin-left: 4px;
  font-weight: 600;
  font-style: normal;
  color: #1d4ed8;
  font-size: 12px;
}
.prayer-for {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 3px;
  font-weight: 600;
  line-height: 1.3;
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
  line-height: 1.35;
}
.prayer-description {
  font-size: 13px;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 4px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
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
  margin-top: 8px;
  padding: 8px 10px;
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
.booklet-cover {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: calc(8.5in - 0.4in);
  padding: 0.1in;
}
.booklet-cover-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 100%;
  min-height: 0;
}
.booklet-cover-front-bottom-section {
  flex: 0 0 auto;
  width: 100%;
  margin-top: auto;
  padding-top: 10px;
}
.booklet-cover-front-hr {
  width: 100%;
  margin: 0 0 10px;
  padding: 0;
  border: none;
  border-top: 1px solid #d1d5db;
  height: 0;
  box-sizing: border-box;
}
.booklet-cover-front-footer {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
}
.booklet-cover-front-footer-text {
  flex: 1;
  min-width: 0;
  text-align: left;
  align-self: flex-end;
  padding-right: 4px;
}
.booklet-front-cta {
  font-size: 17px;
  line-height: 1.35;
  margin: 0 0 6px;
  color: #111827;
}
.booklet-front-copy {
  font-size: 14px;
  line-height: 1.45;
  color: #374151;
  margin: 0;
}
.booklet-cover-front-footer-text .booklet-front-copy + .booklet-front-copy {
  margin-top: 5px;
}
.booklet-cover-front-footer-qr {
  flex-shrink: 0;
  line-height: 0;
  align-self: flex-end;
  margin-left: auto;
}
.booklet-front-qr {
  width: 1.2in;
  height: 1.2in;
  max-width: 135px;
  max-height: 135px;
  display: block;
  border: none;
  outline: none;
  object-fit: contain;
  border-radius: 10px;
}
.booklet-title { font-size: 32px; line-height: 1.2; color: #111827; margin-bottom: 10px; }
.booklet-subtitle { font-size: 15px; color: #4b5563; margin-bottom: 8px; }
.booklet-cover-app-icon-wrap {
  display: flex;
  justify-content: center;
  margin: 0 0 16px;
  flex-shrink: 0;
  line-height: 0;
  background: transparent;
}
.booklet-app-icon {
  width: 2.35in;
  height: 2.35in;
  max-width: min(100%, 2.75in);
  max-height: 2.75in;
  object-fit: contain;
  display: block;
  border: none;
  outline: none;
  box-shadow: none;
  border-radius: 22%;
}
@media print {
  .booklet-cover-app-icon-wrap {
    border: none;
    outline: none;
    box-shadow: none;
  }
  .booklet-app-icon {
    border: none;
    outline: none;
    box-shadow: none;
  }
}
.booklet-panel:has(.booklet-notes-page),
.booklet-panel:has(.booklet-back-cover) {
  display: flex;
  flex-direction: column;
}
.booklet-notes-page {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}
.booklet-notes-page,
.booklet-back-cover {
  --booklet-notes-line-interval: 0.42in;
}
.booklet-notes-heading {
  flex: 0 0 auto;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  color: #1d4ed8;
  font-size: 16.5px;
  font-weight: 400;
  border-bottom: 1px solid #93c5fd;
  /* Match clearance after header underline to clearance between successive ruled lines (grid period minus rule thickness). */
  margin: 0 0 calc(var(--booklet-notes-line-interval) - 1px);
  padding: 0 0 6px;
  line-height: 1.25;
  page-break-after: avoid;
  break-after: avoid;
}
.booklet-notes-title-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.booklet-notes-pencil {
  flex-shrink: 0;
  display: block;
  color: inherit;
}
/* Ruled lines shared by padding Notes pages and outer back cover above logo */
.booklet-notes-ruled,
.booklet-back-cover-ruled {
  background-image: repeating-linear-gradient(
    to bottom,
    #d1d5db 0,
    #d1d5db 1px,
    transparent 1px,
    transparent var(--booklet-notes-line-interval, 0.42in)
  );
  background-color: transparent;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.booklet-notes-ruled {
  flex: 1 1 auto;
  min-height: 3in;
  width: 100%;
}
.booklet-back-cover-ruled {
  flex: 1 1 auto;
  min-height: 2in;
  width: 100%;
}
/* Back cover column centers the logo row; stretch header + ruled block so underline and rules span the panel width. */
.booklet-back-cover > .booklet-notes-heading,
.booklet-back-cover > .booklet-back-cover-ruled {
  align-self: stretch;
  width: 100%;
  box-sizing: border-box;
}
.booklet-back-cover {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
}
.booklet-back-cover-logo-bottom {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-top: 8px;
}
.booklet-back-cover-logo-bottom .booklet-logo {
  display: block;
  max-height: 0.52in;
  width: auto;
  max-width: min(100%, 2.25in);
  object-fit: contain;
}
${getPrintablePromptBlockStyles({ scopedRoot: '.booklet-prompt-print-root' })}
  </style>
</head>
<body>
  <div class="no-print">
<strong>Print tips:</strong> Use <strong>double-sided</strong> printing, <strong>flip on short edge</strong>, on US Letter. Then fold each sheet in half and staple at the fold. Prayer cards are packed top-to-bottom until the next card would pass the bottom of the printable panel (with a small tolerance into the bottom inset); layout reflows before printing. Long descriptions still split with <strong>(continued)</strong>.
  </div>
  <div id="__book_meas_host" aria-hidden="true" style="position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;width:5.5in;z-index:-1;">
<div id="__book_meas_panel" class="booklet-panel"></div>
  </div>
  <div id="booklet-dynamic-root">
  ${pageSurfacesHeuristic}
  </div>
  <script type="application/x-booklet-b64" id="booklet-pack-b64">${bookletPackB64}</script>
  <script>${buildBookletMeasurePackScript()}</script>
</body>
</html>`;
}
