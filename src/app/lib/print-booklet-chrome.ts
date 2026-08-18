import { escapeHtmlForPrint } from './print-html';

export function getPrintBookletNotesHeadingHtml(): string {
return `<h2 class="booklet-notes-heading">
  <span class="booklet-notes-title-row">
    <svg class="booklet-notes-pencil" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 20h9" />
      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
    <strong>Notes:</strong>
  </span>
</h2>`;
}

export function buildPrintBookletFrontQrFooterHtml(qrSrc: string): string {
return `<section class="booklet-cover-front-bottom-section" aria-label="Download the app">
  <hr class="booklet-cover-front-hr" />
  <div class="booklet-cover-front-footer">
<div class="booklet-cover-front-footer-text">
  <p class="booklet-front-cta"><strong>Download the app</strong></p>
  <p class="booklet-front-copy">Scan for information about our prayer app.</p>
  <p class="booklet-front-copy"><strong>Join us in prayer</strong> at our weekly prayer meetings on Sundays from 6 - 6:25 PM in the overflow room.</p>
</div>
<div class="booklet-cover-front-footer-qr">
  <img class="booklet-front-qr" src="${escapeHtmlForPrint(qrSrc)}" width="180" height="180" alt="" loading="eager" decoding="sync" />
</div>
  </div>
</section>`;
}

export function buildBookletInsertPageHtml(dataUrl: string): string {
  const src = escapeHtmlForPrint(dataUrl.trim());
  return `<div class="booklet-insert-page"><img class="booklet-insert-img" src="${src}" alt="" loading="eager" decoding="sync" /></div>`;
}
