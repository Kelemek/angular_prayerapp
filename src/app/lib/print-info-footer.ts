import { escapeHtmlForPrint } from './print-html';

/** CSS for the /info QR footer; embedded in each standalone print document. */
export function getPrintInfoFooterStyles(): string {
  return `
    .print-info-footer {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .print-info-qr {
      width: 1.1in;
      height: 1.1in;
      max-width: 120px;
      max-height: 120px;
      flex-shrink: 0;
      object-fit: contain;
      border-radius: 10px;
    }
    .print-info-text {
      flex: 1;
      min-width: 0;
    }
    .print-info-lead {
      font-size: 14px;
      line-height: 1.45;
      font-weight: 600;
      color: #374151;
      margin: 0 0 6px 0;
    }
    .print-info-copy {
      font-size: 14px;
      line-height: 1.45;
      color: #4b5563;
      margin: 0;
    }`;
}

/** QR image URL for the public `/info` page. */
export function buildInfoQrImageSrc(infoPageUrl: string): string {
  return (
    'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(infoPageUrl)
  );
}

export function resolvePrintInfoPageUrl(emailBaseUrl: string, windowOrigin: string): string {
  const base = emailBaseUrl.replace(/\/$/, '');
  const origin = windowOrigin || '';
  return `${base || origin}/info`;
}

/** Footer with QR to `/info` (website + app store links). */
export function buildPrintInfoFooterHtml(qrSrc: string): string {
  return `
  <div class="print-info-footer" role="complementary" aria-label="Church info and app links">
    <img class="print-info-qr" src="${escapeHtmlForPrint(qrSrc)}" width="200" height="200" alt="" />
    <div class="print-info-text">
      <p class="print-info-lead">Want to get the app?</p>
      <p class="print-info-copy">Scan to open the prayer app info page in your browser to get the website and app store links.</p>
    </div>
  </div>`;
}

export function getGlobalFetch(): typeof fetch | undefined {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch.bind(window);
  }
  const g = globalThis as typeof globalThis & { fetch?: typeof fetch };
  return typeof g.fetch === 'function' ? g.fetch.bind(g) : undefined;
}

/** Fetch an image URL and return a data URL for self-contained print HTML. */
export async function tryFetchImageAsDataUrl(httpUrl: string): Promise<string | null> {
  const fetchFn = getGlobalFetch();
  if (!fetchFn) {
    return null;
  }
  try {
    const res = await fetchFn(httpUrl, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) {
      return null;
    }
    const blob = await res.blob();
    if (blob.type && !blob.type.startsWith('image/')) {
      return null;
    }
    if (typeof btoa === 'undefined') {
      return null;
    }
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const mime = blob.type || 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}
