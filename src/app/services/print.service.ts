import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { PrayerService } from './prayer.service';
import { EmailNotificationService } from './email-notification.service';
import { Printer } from '@capgo/capacitor-printer';
import { markdownToSafeHtml } from '../../utils/markdown';
import { padToMultipleOfFourWithBackCoverLast, saddleStitchImpose } from '../lib/print-booklet-imposition';
import { buildBookletMeasurePackScript } from '../lib/booklet-measure-inline';
import { BrandingService } from './branding.service';
import { ToastService } from './toast.service';

export interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  /** When true, the printable list must not reveal the submitter's name */
  is_anonymous?: boolean;
  status: string;
  created_at: string;
  date_answered?: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    is_anonymous?: boolean;
  }>;
}

export type TimeRange = 'week' | 'twoweeks' | 'month' | 'twomonths' | 'year' | 'all';

/** Time ranges for the admin saddle-stitch booklet print only. */
export type BookletTimeRange = 'week' | 'twoweeks' | 'month' | 'twomonths';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  constructor(
    private supabase: SupabaseService,
    private prayerService: PrayerService,
    private emailNotificationService: EmailNotificationService,
    private brandingService: BrandingService,
    private toast: ToastService
  ) {}

  /**
   * Max markdown characters per **split segment** before hard-splitting (one card body per segment).
   * Kept below what fits in a half-letter column so segments + updates rarely clip under `overflow:hidden`.
   */
  static readonly BOOKLET_MARKDOWN_CHARS_PER_PANEL = 1750;

  /** Card chrome: header row, border, gaps between stacked cards (tune with booklet CSS padding) */
  private static readonly BOOKLET_CARD_FRAME_CHARS = 228;
  /** First chunk of each status section carries the colored section `h2` */
  private static readonly BOOKLET_SECTION_H2_RESERVE = 275;
  /**
   * Virtual “ink” budget per half-letter chunk when greedily packing prayer cards.
   * First usable slice ≈ this − {@link BOOKLET_SECTION_H2_RESERVE} − {@link BOOKLET_PANEL_BOTTOM_SLACK} when `h2` is present.
   */
  private static readonly BOOKLET_PANEL_PACK_BUDGET = 3400;
  /**
   * Markdown often expands in HTML (lists, line wraps). Weight ≈ ceil(len * factor) + frame + reserves.
   */
  private static readonly BOOKLET_MARKDOWN_TO_HTML_WEIGHT = 1.25;
  /**
   * Subtract from cap each chunk so totals stay below `.booklet-panel { overflow:hidden }`.
   * Tuned with panel padding and with {@link buildBookletMeasurePackScript} fit tolerance (~rounding + bottom-inset dip).
   */
  private static readonly BOOKLET_PANEL_BOTTOM_SLACK = 220;
  /**
   * Box chrome for compact booklet Updates (header “Updates (n):”, meta row, margins, bordered panel).
   * Does **not** include update body — that is weighed separately via {@link estimateBookletCompactUpdatesBlockWeight}.
   */
  private static readonly BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS = 320;
  /** Updates render in a narrow inset column; prose wraps more aggressively than descriptions — weight a bit higher per char */
  private static readonly BOOKLET_UPDATES_MARKDOWN_FACTOR = 1.48;
  /**
   * Bullet / numbered Markdown lines inflate height versus running prose (margins + list markers outside text box).
   * Used only inside {@link estimateBookletUnitWeight}; tuned with {@link BOOKLET_PANEL_PACK_BUDGET} so plain prose packs densely.
   */
  private static readonly BOOKLET_MARKDOWN_LIST_LINE_PREMIUM = 102;
  private static readonly BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM = 18;
  /**
   * Upper bound stacked cards per half-letter chunk — conservative to avoid underestimated combined height.
   */
  private static readonly BOOKLET_MAX_UNITS_PER_PANEL_CHUNK = 5;

  private setStartDateForTimeRange(startDate: Date, endDate: Date, timeRange: TimeRange): void {
    switch (timeRange) {
      case 'week':
        startDate.setTime(endDate.getTime());
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'twoweeks':
        startDate.setTime(endDate.getTime());
        startDate.setDate(endDate.getDate() - 14);
        break;
      case 'month':
        startDate.setTime(endDate.getTime());
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'twomonths':
        startDate.setTime(endDate.getTime());
        startDate.setMonth(endDate.getMonth() - 2);
        break;
      case 'year':
        startDate.setTime(endDate.getTime());
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2000, 0, 1);
        break;
    }
  }

  private getRangeFileLabel(timeRange: TimeRange): string {
    switch (timeRange) {
      case 'week':
        return 'week';
      case 'twoweeks':
        return '2weeks';
      case 'month':
        return 'month';
      case 'twomonths':
        return '2months';
      case 'year':
        return 'year';
      case 'all':
        return 'all';
    }
  }

  private getEmptyRangeUserMessage(timeRange: TimeRange): string {
    switch (timeRange) {
      case 'week':
        return 'No prayers found in the last week.';
      case 'twoweeks':
        return 'No prayers found in the last 2 weeks.';
      case 'month':
        return 'No prayers found in the last month.';
      case 'twomonths':
        return 'No prayers found in the last 2 months.';
      case 'year':
        return 'No prayers found in the last year.';
      case 'all':
        return 'No prayers found in the database.';
    }
  }

  /**
   * Loads approved, non-closed public prayers in the time range (created or update in range).
   * @returns `null` on fetch error (after alert), `[]` if none match.
   */
  private async loadPublicPrayersForTimeRange(
    timeRange: TimeRange,
    newWindow: Window | null
  ): Promise<Prayer[] | null> {
    const endDate = new Date();
    const startDate = new Date();
    this.setStartDateForTimeRange(startDate, endDate, timeRange);

    const { data: allPrayers, error: prayersError } = await this.supabase.client
      .from('prayers')
      .select('*')
      .eq('approval_status', 'approved')
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

    if (prayersError) {
      console.error('[PrintService] Error fetching prayers:', prayersError);
      alert('Failed to fetch prayers. Please try again.');
      if (newWindow) {
        newWindow.close();
      }
      return null;
    }

    const { data: allUpdates, error: updatesError } = await this.supabase.client
      .from('prayer_updates')
      .select('*');

    if (updatesError) {
      console.error('[PrintService] Error fetching updates:', updatesError);
      alert('Failed to fetch prayer updates. Please try again.');
      if (newWindow) {
        newWindow.close();
      }
      return null;
    }

    const updatesByPrayerId = new Map<string, any[]>();
    allUpdates?.forEach(update => {
      if (update.approval_status === 'approved') {
        if (!updatesByPrayerId.has(update.prayer_id)) {
          updatesByPrayerId.set(update.prayer_id, []);
        }
        updatesByPrayerId.get(update.prayer_id)!.push(update);
      }
    });

    const prayersWithUpdates = (allPrayers || []).map(prayer => ({
      ...prayer,
      prayer_updates: updatesByPrayerId.get(prayer.id) || []
    }));

    return prayersWithUpdates.filter(prayer => {
      const prayerCreatedDate = new Date(prayer.created_at);
      if (prayerCreatedDate >= startDate && prayerCreatedDate <= endDate) {
        return true;
      }
      if (prayer.prayer_updates && Array.isArray(prayer.prayer_updates) && prayer.prayer_updates.length > 0) {
        return prayer.prayer_updates.some((update: any) => {
          const updateDate = new Date(update.created_at);
          return updateDate >= startDate && updateDate <= endDate;
        });
      }
      return false;
    });
  }

  /**
   * Detect if running in native app (Capacitor)
   */
  private isNativeApp(): boolean {
    try {
      // Check for Capacitor presence and platform
      const hasCapacitor = typeof (window as any).Capacitor !== 'undefined';
      let platform = null;
      
      if (hasCapacitor) {
        try {
          platform = (window as any).Capacitor.getPlatform();
        } catch (e) {
          console.debug('[PrintService] Error getting platform:', e);
        }
      }
      
      const isNative = hasCapacitor && (platform === 'ios' || platform === 'android');
      console.log('[PrintService] Native app check:', isNative, {
        hasCapacitor,
        platform,
        userAgent: navigator.userAgent
      });
      return isNative;
    } catch (e) {
      console.error('[PrintService] Error checking native app:', e);
      return false;
    }
  }

  /**
   * Share or save file content on native app (iOS and Android)
   * Uses @capgo/capacitor-printer plugin; Android uses a patched native implementation that runs print on the UI thread.
   */
  private async shareOnNativeApp(html: string, filename: string, title: string): Promise<void> {
    try {
      const platform = (window as any).Capacitor?.getPlatform?.();
      if (platform === 'ios' || platform === 'android') {
        try {
          await Printer.printHtml({
            name: title,
            html
          });
        } catch (error) {
          console.error('[PrintService] Printer plugin error:', error);
          const message = (error as any)?.message || 'Unknown error';
          if (!message.toLowerCase().includes('cancelled') && !message.toLowerCase().includes('user')) {
            alert(`Failed to open print dialog: ${message}`);
          }
        }
        return;
      }
    } catch (error) {
      console.error('[PrintService] Error in shareOnNativeApp:', error);
      const message = (error as any)?.message || 'Unknown error';
      if (!message.toLowerCase().includes('cancelled') && !message.toLowerCase().includes('user')) {
        alert(`Error: ${message}`);
      }
    }
  }

  /**
   * Generate and download a printable prayer list for the specified time range
   */
  async downloadPrintablePrayerList(timeRange: TimeRange = 'month', newWindow: Window | null = null): Promise<void> {
    try {
      const prayers = await this.loadPublicPrayersForTimeRange(timeRange, newWindow);
      if (prayers === null) {
        return;
      }
      if (prayers.length === 0) {
        alert(this.getEmptyRangeUserMessage(timeRange));
        if (newWindow) {
          newWindow.close();
        }
        return;
      }

      const html = this.generatePrintableHTML(prayers, timeRange);

      // On native apps, use the native share/print dialog
      if (this.isNativeApp()) {
        console.log('[PrintService] Native app detected in downloadPrintablePrayerList, using shareOnNativeApp');
        const today = new Date().toISOString().split('T')[0];
        const rangeLabel = this.getRangeFileLabel(timeRange);
        const filename = `prayer-list-${rangeLabel}-${today}.html`;
        
        await this.shareOnNativeApp(html, filename, 'Prayer List');
        console.log('[PrintService] shareOnNativeApp completed, returning from downloadPrintablePrayerList');
        return;
      }

      // SAFETY CHECK: Never open a new window on native apps
      if (this.isNativeApp()) {
        console.error('[PrintService] ERROR: Reached web printing code on native app in downloadPrintablePrayerList! This should never happen.');
        return;
      }

      // Use the pre-opened window if provided (Safari compatible)
      const targetWindow = newWindow || window.open('', '_blank');
      
      if (!targetWindow) {
        // Fallback: if popup blocked, offer download
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        
        const today = new Date().toISOString().split('T')[0];
        const rangeLabel = this.getRangeFileLabel(timeRange);
        link.download = `prayer-list-${rangeLabel}-${today}.html`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        alert('Prayer list downloaded. Please open the file to view and print.');
      } else {
        // Write the HTML content to the window
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating prayer list:', error);
      alert('Failed to generate prayer list. Please try again.');
    }
  }

  /**
   * Admin: saddle-stitch imposed half-letter prayer booklet (letter landscape, 2 panels per print side).
   */
  async downloadPrintableBookletPrayerList(
    timeRange: BookletTimeRange = 'month',
    newWindow: Window | null = null
  ): Promise<void> {
    try {
      const prayers = await this.loadPublicPrayersForTimeRange(timeRange, newWindow);
      if (prayers === null) {
        return;
      }
      if (prayers.length === 0) {
        /* Booklet Tools flow only: avoid blocking browser dialogs for empty range / download / errors. */
        this.toast.warning(this.getEmptyRangeUserMessage(timeRange));
        if (newWindow) {
          newWindow.close();
        }
        return;
      }

      await this.brandingService.initialize();
      const coverLogoUrl = this.getBookletFrontCoverLogoUrl();
      const html = this.generateSaddleStitchBookletHTML(prayers, timeRange, coverLogoUrl);

      if (this.isNativeApp()) {
        const today = new Date().toISOString().split('T')[0];
        const rangeLabel = this.getRangeFileLabel(timeRange);
        const filename = `prayer-list-booklet-${rangeLabel}-${today}.html`;
        await this.shareOnNativeApp(html, filename, 'Prayer list booklet');
        return;
      }

      const targetWindow = newWindow || window.open('', '_blank');
      if (!targetWindow) {
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        const today = new Date().toISOString().split('T')[0];
        const rangeLabel = this.getRangeFileLabel(timeRange);
        link.download = `prayer-list-booklet-${rangeLabel}-${today}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        /* Booklet Tools flow only (popup blocked fallback). */
        this.toast.info(
          'Booklet download started. Open the file to print; use double-sided, flip on short edge, then fold and staple.'
        );
      } else {
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating prayer booklet:', error);
      /* Booklet Tools flow only. */
      this.toast.error('Failed to generate prayer booklet. Please try again.');
      if (newWindow) {
        newWindow.close();
      }
    }
  }

  /** CSS for the /info QR footer; embedded in each standalone print document. */
  private getPrintInfoFooterStyles(): string {
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

  /** QR image URL for the public `/info` page (same target as the Info page and other print footers). */
  private getInfoQrImageSrc(): string {
    const base = this.emailNotificationService.getEmailBaseUrl().replace(/\/$/, '');
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const infoUrl = `${base || origin}/info`;
    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(infoUrl);
  }

  /** Booklet front cover: bold CTA + copy left, `/info` QR right (bottom of panel), below `<hr />`. */
  private buildBookletFrontQrFooterHtml(): string {
    const qrSrc = this.getInfoQrImageSrc();
    return `<section class="booklet-cover-front-bottom-section" aria-label="Download the app">
  <hr class="booklet-cover-front-hr" />
  <div class="booklet-cover-front-footer">
    <div class="booklet-cover-front-footer-text">
      <p class="booklet-front-cta"><strong>Download the app</strong></p>
      <p class="booklet-front-copy">Scan for information about our prayer app.</p>
      <p class="booklet-front-copy"><strong>Join us in prayer</strong> at our weekly prayer meetings on Sundays from 6 - 6:25 PM in the overflow room.</p>
    </div>
    <div class="booklet-cover-front-footer-qr">
      <img class="booklet-front-qr" src="${this.escapeHtml(qrSrc)}" width="180" height="180" alt="" />
    </div>
  </div>
</section>`;
  }

  /** Footer with QR to `/info` (website + app store links). */
  private buildPrintInfoFooterHtml(): string {
    const qrSrc = this.getInfoQrImageSrc();
    return `
  <div class="print-info-footer" role="complementary" aria-label="Church info and app links">
    <img class="print-info-qr" src="${this.escapeHtml(qrSrc)}" width="200" height="200" alt="" />
    <div class="print-info-text">
      <p class="print-info-lead">Want to get the app?</p>
      <p class="print-info-copy">Scan to open the prayer app info page in your browser to get the website and app store links.</p>
    </div>
  </div>`;
  }

  /**
   * Generate printable HTML for prayer list
   */
  private generatePrintableHTML(prayers: Prayer[], timeRange: TimeRange = 'month'): string {
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
    
    this.setStartDateForTimeRange(startDate, now, timeRange);
    
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
        const prayersHTML = statusPrayers.map(prayer => this.generatePrayerHTML(prayer)).join('');
        
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
    ${this.getPrintInfoFooterStyles()}

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
  ${this.buildPrintInfoFooterHtml()}

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Public branding logo for booklet cover (light logo preferred for white paper; same source as home header when **Use logo** is on).
   */
  private getBookletFrontCoverLogoUrl(): string {
    const b = this.brandingService.getBranding();
    if (!b.useLogo) {
      return '';
    }
    const url = (b.lightLogo || b.darkLogo || '').trim();
    if (!url) {
      return '';
    }
    return this.resolvePrintAssetUrl(url);
  }

  /**
   * Ensure print HTML can load images (absolute http(s) or same-origin path).
   */
  /** PWA app icon (same asset as manifest / home screen); used large on booklet cover. */
  private getBookletAppIconUrl(): string {
    return this.resolvePrintAssetUrl('/icons/icon-512.png');
  }

  private resolvePrintAssetUrl(url: string): string {
    const t = url.trim();
    if (!t) {
      return '';
    }
    if (/^https?:\/\//i.test(t) || t.startsWith('data:')) {
      return t;
    }
    if (typeof window !== 'undefined' && window.location?.origin && t.startsWith('/')) {
      return `${window.location.origin}${t}`;
    }
    return t;
  }

  /** Shared heading for Notes ruled padding pages and the outer back cover (icon + bold **Notes:**). */
  private getBookletNotesHeadingHtml(): string {
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

  /**
   * Build saddle-stitch booklet: letter landscape, two 5.5"×8.5" panels per print side.
   */
  private generateSaddleStitchBookletHTML(
    prayers: Prayer[],
    timeRange: BookletTimeRange,
    coverLogoUrl: string
  ): string {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const startDate = new Date();
    this.setStartDateForTimeRange(startDate, now, timeRange);
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
    const sectionsForMeasure: { h2: string; fragments: string[] }[] = [];

    (['current', 'answered'] as const).forEach(status => {
      const list = prayersByStatus[status];
      if (list.length === 0) {
        return;
      }
      const title = `${statusLabels[status]} (${list.length})`;
      const h2 = `<h2 class="booklet-h2">${this.escapeHtml(title)}</h2>`;

      const units: { html: string; weight: number }[] = [];
      for (const prayer of list) {
        const hasUpdates =
          Array.isArray(prayer.prayer_updates) && prayer.prayer_updates.length > 0;
        const firstUpdateMarkdown = hasUpdates ? this.getBookletSortedFirstUpdateMarkdown(prayer) : null;
        const descSegmentMax = this.getBookletDescriptionSegmentMaxChars(firstUpdateMarkdown);
        const descParts = this.splitBookletMarkdownIntoPanelParts(
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
            html: this.generatePrayerHTML(prayer, true, slice),
            weight: this.estimateBookletUnitWeight(
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

      const packed = this.packBookletUnitsIntoPageChunks(
        units,
        h2,
        PrintService.BOOKLET_PANEL_PACK_BUDGET,
        PrintService.BOOKLET_SECTION_H2_RESERVE,
        PrintService.BOOKLET_PANEL_BOTTOM_SLACK
      );
      contentPageInners.push(...packed);
    });

    const backLogoBlock =
      coverLogoUrl.trim().length > 0
        ? `<div class="booklet-back-cover-logo-bottom"><img class="booklet-logo" src="${this.escapeHtml(
            coverLogoUrl
          )}" alt="" width="160" height="60" loading="eager" /></div>`
        : '';
    const bookletFrontQrFooter = this.buildBookletFrontQrFooterHtml();
    const appIconUrl = this.getBookletAppIconUrl();
    const appIconBlock = `<div class="booklet-cover-app-icon-wrap"><img class="booklet-app-icon" src="${this.escapeHtml(
      appIconUrl
    )}" alt="" width="512" height="512" loading="eager" /></div>`;
    const coverFrontInner = `
      <div class="booklet-cover">
        <div class="booklet-cover-main">
          ${appIconBlock}
          <h1 class="booklet-title">Prayer List</h1>
          <p class="booklet-subtitle">${this.escapeHtml(dateRange)}</p>
        </div>
        ${bookletFrontQrFooter}
      </div>`;
    const coverBackInner = `
<div class="booklet-back-cover">
  ${this.getBookletNotesHeadingHtml()}
  <div class="booklet-back-cover-ruled" aria-hidden="true"></div>
  ${backLogoBlock}
</div>`.trim();

    const blankInner = `
<div class="booklet-notes-page">
  ${this.getBookletNotesHeadingHtml()}
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

    const bookletPackB64 = this.encodeUtf8Base64(
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
    @media print { .no-print { display: none !important; } body { background: #fff; } }
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
    .booklet-notes-heading {
      flex: 0 0 auto;
      color: #1d4ed8;
      font-size: 16.5px;
      font-weight: 400;
      border-bottom: 1px solid #93c5fd;
      margin: 0 0 12px;
      padding: 0 0 6px;
      line-height: 1.25;
      page-break-after: avoid;
      break-after: avoid;
    }
    .booklet-notes-title-row {
      display: inline-flex;
      align-items: center;
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
        transparent 0.42in
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
    ${this.getPrintInfoFooterStyles()}
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

  /** UTF-8 JSON payload for inlined booklet layout script (avoid <code>&lt;/script&gt;</code> in prayer HTML). */
  private encodeUtf8Base64(raw: string): string {
    try {
      const bytes = new TextEncoder().encode(raw);
      let binary = '';
      bytes.forEach(b => (binary += String.fromCharCode(b)));
      return typeof btoa === 'function' ? btoa(binary) : '';
    } catch {
      return '';
    }
  }

  /**
   * Newest-first update body used for booklet compact block (same order as {@link generatePrayerHTML}).
   */
  private getBookletSortedFirstUpdateMarkdown(prayer: Prayer): string | null {
    const list = prayer.prayer_updates;
    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }
    const sorted = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const c = sorted[0]?.content;
    return typeof c === 'string' && c.trim().length ? c.trim() : null;
  }

  /**
   * When a prayer includes a compact Updates block, description segments must be shorter so the
   * last segment + box + rendered update body still fits under `.booklet-panel { overflow:hidden }`.
   */
  private getBookletDescriptionSegmentMaxChars(firstUpdateMarkdown: string | null): number {
    if (!firstUpdateMarkdown) {
      return PrintService.BOOKLET_MARKDOWN_CHARS_PER_PANEL;
    }
    const updateBlockWeight = this.estimateBookletCompactUpdatesBlockWeight(firstUpdateMarkdown);
    const shave = Math.min(
      Math.floor(PrintService.BOOKLET_MARKDOWN_CHARS_PER_PANEL * 0.58),
      Math.max(0, Math.floor((updateBlockWeight - 420) * 0.52))
    );
    return Math.max(260, PrintService.BOOKLET_MARKDOWN_CHARS_PER_PANEL - shave);
  }

  /**
   * Virtual height of the compact booklet “Updates (1)” box (header, meta, padding) plus **full**
   * first update markdown rendered in a narrow column (wraps more than raw char count suggests).
   */
  private estimateBookletCompactUpdatesBlockWeight(updateMarkdown: string): number {
    const m = updateMarkdown ?? '';
    if (!m.length) {
      return PrintService.BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS;
    }
    const newlineCount = m.match(/\r?\n/g)?.length ?? 0;
    const listLineHints =
      m.match(/(?:^|\r?\n)[ \t]{0,3}(?:[-*+] |\d+[.)]\s)/g) ?? [];
    const listHeadCount = listLineHints.length;
    /** ~chars per line scales with column width; narrower panel padding widens the text box vs older 52-char est. */
    const narrowColumnWrapPremium = Math.ceil((m.length / 57) * 14);

    return (
      PrintService.BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS +
      Math.ceil(m.length * PrintService.BOOKLET_UPDATES_MARKDOWN_FACTOR) +
      newlineCount * PrintService.BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM +
      listHeadCount * PrintService.BOOKLET_MARKDOWN_LIST_LINE_PREMIUM +
      narrowColumnWrapPremium
    );
  }

  /**
   * Heuristic “height” for packing — lists and explicit line breaks are far taller than the same raw char length.
   * When `compactUpdatesMarkdown` is set (newest-first update shown in booklet), its full body is weighed.
   */
  private estimateBookletUnitWeight(descriptionMarkdown: string, compactUpdatesMarkdown: string | null): number {
    const markdown = descriptionMarkdown ?? '';
    const newlineCount = markdown.match(/\r?\n/g)?.length ?? 0;
    const listLineHints =
      markdown.match(/(?:^|\r?\n)[ \t]{0,3}(?:[-*+] |\d+[.)]\s)/g) ?? [];
    const listHeadCount = listLineHints.length;

    let w =
      Math.ceil(markdown.length * PrintService.BOOKLET_MARKDOWN_TO_HTML_WEIGHT) +
      PrintService.BOOKLET_CARD_FRAME_CHARS +
      newlineCount * PrintService.BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM +
      listHeadCount * PrintService.BOOKLET_MARKDOWN_LIST_LINE_PREMIUM;

    if (compactUpdatesMarkdown && compactUpdatesMarkdown.length > 0) {
      w += this.estimateBookletCompactUpdatesBlockWeight(compactUpdatesMarkdown);
    }
    return w;
  }

  /**
   * Greedy-pack prayer card HTML onto half-letter reader chunks so several short requests share one panel.
   * A single oversized unit still occupies its own chunk (may match one long split segment).
   */
  private packBookletUnitsIntoPageChunks(
    units: { html: string; weight: number }[],
    sectionH2: string,
    panelBudget: number,
    sectionH2Reserve: number,
    bottomMarginSlack: number
  ): string[] {
    const out: string[] = [];
    let idx = 0;
    /** First emitted chunk carries the colored section heading */
    let pendingHeading = true;

    while (idx < units.length) {
      const cap =
        (pendingHeading ? panelBudget - sectionH2Reserve : panelBudget) - bottomMarginSlack;
      const chunk: { html: string; weight: number }[] = [];
      let sum = 0;

      while (idx < units.length) {
        const u = units[idx]!;
        if (chunk.length === 0) {
          chunk.push(u);
          sum += u.weight;
          idx++;
          continue;
        }
        if (
          chunk.length >= PrintService.BOOKLET_MAX_UNITS_PER_PANEL_CHUNK ||
          !(sum + u.weight <= cap)
        ) {
          break;
        }
        chunk.push(u);
        sum += u.weight;
        idx++;
      }

      const heading = pendingHeading ? sectionH2 : '';
      pendingHeading = false;
      out.push(`<div class="booklet-chunk">${heading}${chunk.map(c => c.html).join('')}</div>`);
    }

    return out;
  }

  /**
   * Pack markdown into bounded segments for one half-letter panel (plain-text length heuristic).
   * All returned segments use **trim-end** on the source so short single-segment bodies stay
   * consistent with split chunks (trailing whitespace does not affect rendered booklet height).
   * Overlong paragraphs are hard-split on spaces/newlines.
   */
  private splitBookletMarkdownIntoPanelParts(markdown: string, maxChars: number): string[] {
    const t = markdown.trimEnd();
    if (!t.length) {
      return [''];
    }
    if (t.length <= maxChars) {
      return [t];
    }
    const paragraphs = t.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
    const chunks: string[] = [];
    let cur = '';

    for (const para of paragraphs) {
      if (para.length > maxChars) {
        if (cur.trim()) {
          chunks.push(cur.trim());
          cur = '';
        }
        chunks.push(...this.hardSplitBookletMarkdown(para, maxChars));
        continue;
      }
      const joiner = cur.trim() ? '\n\n' : '';
      const next = `${cur}${joiner}${para}`;
      if (next.length <= maxChars) {
        cur = next;
      } else {
        if (cur.trim()) {
          chunks.push(cur.trim());
        }
        cur = para;
      }
    }
    if (cur.trim()) {
      chunks.push(cur.trim());
    }

    const out = chunks.filter(c => c.length > 0);
    return out.length ? out : [''];
  }

  private hardSplitBookletMarkdown(text: string, maxChars: number): string[] {
    const pieces: string[] = [];
    let rest = text.trim();
    const minChunk = Math.max(200, Math.floor(maxChars * 0.35));
    while (rest.length > maxChars) {
      let cut = rest.lastIndexOf('\n', maxChars);
      if (cut < minChunk) {
        cut = rest.lastIndexOf(' ', maxChars);
      }
      if (cut < minChunk || cut <= 0) {
        cut = Math.min(maxChars, rest.length);
      }
      const head = rest.slice(0, cut).trimEnd();
      if (head.length) {
        pieces.push(head);
      }
      rest = rest.slice(cut).trimStart();
    }
    if (rest.length) {
      pieces.push(rest);
    }
    return pieces.length ? pieces : [text.slice(0, maxChars)];
  }

  /**
   * Generate HTML for a single prayer
   * @param compactBooklet - tighter copy and one update only (saddle-stitch booklet panels)
   * @param bookletSlice - optional per-panel slice when a prayer spans multiple reader pages
   */
  private generatePrayerHTML(
    prayer: Prayer,
    compactBooklet = false,
    bookletSlice?: {
      descriptionMarkdown: string;
      partIndex: number;
      partCount: number;
      includeUpdates: boolean;
    }
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
          <span class="update-meta">${this.escapeHtml(authorName)} · ${uDate}</span>
          ${this.renderMarkdown(u.content)}
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
            return `<div class="update-item"><span class="update-meta">Updated by: ${this.escapeHtml(authorName)} • ${updateDate}:</span> ${this.renderMarkdown(update.content)}</div>`;
          })
          .join('')}
      </div>
    `
      : '';

    const requesterDisplay = prayer.is_anonymous ? 'Anonymous' : prayer.requester || 'Anonymous';
    const requesterText = `Requested by ${this.escapeHtml(requesterDisplay)}`;
    const rightMeta = answeredDate ? (compactBooklet ? `Ans. ${answeredDate}` : `Answered on ${answeredDate}`) : '';

    if (!compactBooklet) {
      return `
      <div class="prayer-item ${prayer.status}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div class="prayer-for"><strong>Prayer For:</strong> ${this.escapeHtml(prayer.prayer_for)}</div>
        </div>
        <div class="prayer-meta">
          <span>${requesterText} • ${createdDate}</span>
          <span>${rightMeta}</span>
        </div>
        <div class="prayer-description">${this.renderMarkdown(prayer.description)}</div>
        ${updatesHTML}
      </div>
    `;
    }

    const topMeta = `${this.escapeHtml(requesterDisplay)} · ${createdDate}${rightMeta ? ` · ${rightMeta}` : ''}`;
    const showContinued = !!(bookletSlice && bookletSlice.partCount > 1 && bookletSlice.partIndex > 0);
    return `
      <div class="prayer-item ${prayer.status}">
        <div class="booklet-prayer-top">
          <strong>Prayer For:</strong> ${this.escapeHtml(prayer.prayer_for)}
          ${showContinued ? '<span class="booklet-prayer-top-continued">(continued)</span>' : ''}
          <span class="booklet-prayer-top-meta"> · ${topMeta}</span>
        </div>
        <div class="prayer-description">${this.renderMarkdown(descMarkdown)}</div>
        ${updatesHTML}
      </div>
    `;
  }

  /**
   * Generate and download a printable prayer prompts list
   * @param selectedTypes - Array of type names to filter by. Empty array means all types.
   * @param newWindow - Pre-opened window for Safari compatibility
   */
  async downloadPrintablePromptList(selectedTypes: string[] = [], newWindow: Window | null = null): Promise<void> {
    try {
      // Fetch all prayer prompts
      const { data: promptsData, error: promptsError } = await this.supabase.client
        .from('prayer_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (promptsError) {
        console.error('Error fetching prompts:', promptsError);
        alert('Failed to fetch prayer prompts. Please try again.');
        if (newWindow) newWindow.close();
        return;
      }

      if (!promptsData || promptsData.length === 0) {
        alert('No prayer prompts found.');
        if (newWindow) newWindow.close();
        return;
      }

      // Fetch prayer types for ordering
      const { data: typesData, error: typesError } = await this.supabase.client
        .from('prayer_types')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (typesError) {
        console.error('Error fetching prayer types:', typesError);
        // Continue with default alphabetical sorting if types fetch fails
      }

      // Create a map of type name to display_order
      const typeOrderMap = new Map(typesData?.map((t: any) => [t.name, t.display_order]) || []);

      // Filter prompts by selected types (if any are selected)
      const filteredPrompts = selectedTypes.length > 0
        ? promptsData.filter((p: any) => selectedTypes.includes(p.type))
        : promptsData;

      if (filteredPrompts.length === 0) {
        alert('No prayer prompts found for the selected types.');
        if (newWindow) newWindow.close();
        return;
      }

      // Sort prompts by type's display_order
      const sortedPrompts = filteredPrompts.sort((a: any, b: any) => {
        const orderA = typeOrderMap.get(a.type) ?? 999;
        const orderB = typeOrderMap.get(b.type) ?? 999;
        return (orderA as number) - (orderB as number);
      });

      const html = this.generatePromptsPrintableHTML(sortedPrompts);

      // On native apps, use the native share/print dialog
      if (this.isNativeApp()) {
        console.log('[PrintService] Native app detected in downloadPrintablePromptList, using shareOnNativeApp');
        const today = new Date().toISOString().split('T')[0];
        const filename = `prayer-prompts-${today}.html`;
        
        await this.shareOnNativeApp(html, filename, 'Prayer Prompts');
        console.log('[PrintService] shareOnNativeApp completed, returning from downloadPrintablePromptList');
        return;
      }

      // SAFETY CHECK: Never open a new window on native apps
      if (this.isNativeApp()) {
        console.error('[PrintService] ERROR: Reached web printing code on native app in downloadPrintablePromptList! This should never happen.');
        return;
      }

      // Use the pre-opened window if provided (Safari compatible)
      const targetWindow = newWindow || window.open('', '_blank');
      
      if (!targetWindow) {
        // Fallback: if popup blocked, offer download
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        
        const today = new Date().toISOString().split('T')[0];
        link.download = `prayer-prompts-${today}.html`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        alert('Prayer prompts downloaded. Please open the file to view and print.');
      } else {
        // Write the HTML content to the window
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        // Switch focus to the new tab
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating prayer prompts list:', error);
      alert('An error occurred while generating the prayer prompts list.');
      if (newWindow) newWindow.close();
    }
  }

  /**
   * Generate and download a printable list of personal prayers
   */
  async downloadPrintablePersonalPrayerList(categories?: string[], newWindow: Window | null = null): Promise<void> {
    try {
      // Fetch personal prayers using the prayer service
      const allPersonalPrayers = await this.prayerService.getPersonalPrayers();
      
      if (!allPersonalPrayers || allPersonalPrayers.length === 0) {
        alert('No personal prayers found.');
        if (newWindow) newWindow.close();
        return;
      }

      // Filter by categories if specified, otherwise include all
      const personalPrayers = categories && categories.length > 0
        ? allPersonalPrayers.filter((prayer: any) => categories.includes(prayer.category || ''))
        : allPersonalPrayers;

      if (personalPrayers.length === 0) {
        const categoryText = categories && categories.length > 0 
          ? `in the selected categories` 
          : 'with the selected filters';
        alert(`No personal prayers found ${categoryText}.`);
        if (newWindow) newWindow.close();
        return;
      }

      const html = this.generatePersonalPrayersPrintableHTML(personalPrayers, categories);

      // On native apps, use the native share/print dialog
      if (this.isNativeApp()) {
        console.log('[PrintService] Native app detected in downloadPrintablePersonalPrayerList, using shareOnNativeApp');
        const today = new Date().toISOString().split('T')[0];
        const categoryLabel = categories && categories.length > 0 ? categories.slice(0, 2).join('-').toLowerCase() : 'all';
        const filename = `personal-prayers-${categoryLabel}-${today}.html`;
        
        await this.shareOnNativeApp(html, filename, 'Personal Prayers');
        console.log('[PrintService] shareOnNativeApp completed, returning from downloadPrintablePersonalPrayerList');
        return;
      }

      // SAFETY CHECK: Never open a new window on native apps
      if (this.isNativeApp()) {
        console.error('[PrintService] ERROR: Reached web printing code on native app in downloadPrintablePersonalPrayerList! This should never happen.');
        return;
      }

      // Use the pre-opened window if provided (Safari compatible)
      const targetWindow = newWindow || window.open('', '_blank');
      
      if (!targetWindow) {
        // Fallback: if popup blocked, offer download
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        
        const today = new Date().toISOString().split('T')[0];
        const categoryLabel = categories && categories.length > 0 ? categories.slice(0, 2).join('-').toLowerCase() : 'all';
        link.download = `personal-prayers-${categoryLabel}-${today}.html`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        alert('Personal prayers downloaded. Please open the file to view and print.');
      } else {
        // Write the HTML content to the window
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating personal prayers list:', error);
      alert('Failed to generate personal prayers list. Please try again.');
      if (newWindow) newWindow.close();
    }
  }

  /**
   * Generate HTML content for printable personal prayers list
   */
  private generatePersonalPrayersPrintableHTML(prayers: any[], categories?: string[]): string {
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
        const prayersHTML = categoryPrayers.map((prayer: any) => this.generatePersonalPrayerHTML(prayer)).join('');
        
        // Use a color scheme for categories (similar to status colors)
        const categoryColor = this.getCategoryColor(category);
        
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

  /**
   * Generate HTML for a single personal prayer
   */
  private generatePersonalPrayerHTML(prayer: any): string {
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
          return `<div class="update-item"><span class="update-meta">${updateDate}:</span> ${this.renderMarkdown(update.content)}</div>`;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="prayer-item ${prayer.status}">
        <div class="prayer-title">${this.escapeHtml(prayer.title)}</div>
        <div class="prayer-meta">
          <span>${createdDate}</span>
        </div>
        ${prayer.description ? `<div class="prayer-description">${this.renderMarkdown(prayer.description)}</div>` : ''}
        ${updatesHTML}
      </div>
    `;
  }

  /**
   * Generate HTML for a single prompt
   */
  private generatePromptsPrintableHTML(prompts: any[]): string {
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

    // Group prompts by type
    const promptsByType: { [key: string]: any[] } = {};
    
    prompts.forEach(prompt => {
      if (!promptsByType[prompt.type]) {
        promptsByType[prompt.type] = [];
      }
      promptsByType[prompt.type].push(prompt);
    });

    // Get types in the order they appear in the already-sorted prompts array
    const sortedTypes: string[] = [];
    prompts.forEach(prompt => {
      if (!sortedTypes.includes(prompt.type)) {
        sortedTypes.push(prompt.type);
      }
    });

    // Type colors for visual distinction
    const typeColors: { [key: string]: string } = {
      'Praise': '#39704D',
      'Confession': '#C9A961',
      'Thanksgiving': '#0047AB',
      'Supplication': '#8b5cf6'
    };

    let promptSectionsHTML = '';

    sortedTypes.forEach(type => {
      const typePrompts = promptsByType[type];
      const color = typeColors[type] || '#6b7280';
      
      // Split into two columns (column-major ordering)
      const mid = Math.ceil(typePrompts.length / 2);
      const col1 = typePrompts.slice(0, mid);
      const col2 = typePrompts.slice(mid);

      const col1HTML = col1.map((prompt) => this.generatePromptHTML(prompt)).join('');
      const col2HTML = col2.map((prompt) => this.generatePromptHTML(prompt)).join('');

      promptSectionsHTML += `
        <div class="type-section">
          <h2 style="color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 2px; margin-bottom: 2px; margin-top: 4px; font-size: 14px;">
            ${this.escapeHtml(type)} (${typePrompts.length})
          </h2>
          <div class="columns">
            <div class="col">${col1HTML}</div>
            <div class="col">${col2HTML}</div>
          </div>
        </div>
      `;
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prayer Prompts - ${today}</title>
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
      margin-bottom: 4px;
      padding-bottom: 3px;
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
      gap: 12px;
      flex-wrap: wrap;
    }

    .header-right {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
    }

    .header h1 {
      font-size: 16px;
      color: #1f2937;
      margin: 0;
    }

    .type-section {
      margin-bottom: 3px;
    }

    .prompt-item {
      background: transparent;
      border: 1px solid #e6e6e6;
      padding: 3px 6px;
      margin-bottom: 3px;
      border-radius: 2px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .prompt-text {
      font-size: 13px;
      color: #374151;
      line-height: 1.3;
      display: inline;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .columns {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .col {
      flex: 1 1 0;
      min-width: 0;
    }
    ${this.getPrintInfoFooterStyles()}

    @media screen and (max-width: 768px) {
      body {
        padding: 15px;
        font-size: 16px;
      }

      .header h1 {
        font-size: 24px;
      }

      .prompt-text {
        font-size: 16px;
      }
    }

    @media print {
      body {
        padding: 15px;
      }

      .no-print {
        display: none !important;
      }

      .prompt-item {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      h2 {
        page-break-after: avoid;
        break-after: avoid;
      }

      .print-info-footer {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }

    @page {
      margin: 0.5in;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>🙏 Prayer Prompts</h1>
    </div>
    <div class="header-right">
      Generated: ${today} at ${currentTime}
    </div>
  </div>
  ${promptSectionsHTML}
  ${this.buildPrintInfoFooterHtml()}

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for a single prompt
   */
  private generatePromptHTML(prompt: any): string {
    return `
      <div class="prompt-item">
        <span class="prompt-text">${this.escapeHtml(prompt.title)}</span>
      </div>
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    const html = div.innerHTML;
    if (html != null) {
      return html;
    }
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Render markdown to sanitized HTML for printable pages.
   * Falls back to escaped text when markdown module fails to load.
   */
  private renderMarkdown(text: string | null | undefined): string {
    return markdownToSafeHtml(text || '');
  }

  /**
   * Get a color for a category for printing sections
   */
  private getCategoryColor(category: string): string {
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
}
