import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { PrayerService } from './prayer.service';
import { EmailNotificationService } from './email-notification.service';
import { BrandingService } from './branding.service';
import { ToastService } from './toast.service';
import type { BookletInsertPage } from '../types/booklet-insert-page';
import { buildBookletInsertPageHtml as renderBookletInsertPageHtml } from '../lib/print-booklet-chrome';
import { buildSaddleStitchBookletHtml } from '../lib/print-booklet-html';
import { splitBookletMarkdownIntoPanelParts } from '../lib/print-booklet-pack';
import {
  PRINT_BOOKLET_CARD_FRAME_CHARS,
  PRINT_BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS,
  PRINT_BOOKLET_MARKDOWN_CHARS_PER_PANEL,
  PRINT_BOOKLET_MARKDOWN_LIST_LINE_PREMIUM,
  PRINT_BOOKLET_MARKDOWN_TO_HTML_WEIGHT,
  PRINT_BOOKLET_MAX_UNITS_PER_PANEL_CHUNK,
  PRINT_BOOKLET_PANEL_BOTTOM_SLACK,
  PRINT_BOOKLET_PANEL_PACK_BUDGET,
  PRINT_BOOKLET_PROMPT_SECTION_HEADING_WEIGHT,
  PRINT_BOOKLET_SECTION_H2_RESERVE,
  PRINT_BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM,
  PRINT_BOOKLET_UPDATES_MARKDOWN_FACTOR,
} from '../lib/print-booklet-constants';
import { getPrintBookletAppIconUrl, resolvePrintAssetUrl } from '../lib/print-asset-url';
import {
  buildInfoQrImageSrc,
  resolvePrintInfoPageUrl,
  tryFetchImageAsDataUrl,
} from '../lib/print-info-footer';
import { isPrintNativeApp, sharePrintHtmlOnNativeApp } from '../lib/print-native';
import { buildPrintPersonalPrayerListDocumentHtml } from '../lib/print-personal-prayer-list-html';
import { buildPrintPrayerListDocumentHtml } from '../lib/print-prayer-list-html';
import { buildPrintPromptCardHtml } from '../lib/print-prompt-card-html';
import { buildPrintPromptListDocumentHtml } from '../lib/print-prompt-list-html';
import { sortPromptsAlphabeticalByTitle } from '../lib/print-prompt-layout';
import {
  getPrintEmptyRangeUserMessage,
  getPrintRangeFileLabel,
  setPrintStartDateForTimeRange,
} from '../lib/print-time-range';
import type { BookletTimeRange, Prayer, TimeRange } from '../lib/print-types';

export type { BookletTimeRange, Prayer, TimeRange } from '../lib/print-types';

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  constructor(
    private supabase: SupabaseService,
    private prayerService: PrayerService,
    private emailNotificationService: EmailNotificationService,
    private brandingService: BrandingService,
    private toast: ToastService,
  ) {}

  static readonly BOOKLET_MARKDOWN_CHARS_PER_PANEL = PRINT_BOOKLET_MARKDOWN_CHARS_PER_PANEL;
  static readonly BOOKLET_CARD_FRAME_CHARS = PRINT_BOOKLET_CARD_FRAME_CHARS;
  static readonly BOOKLET_SECTION_H2_RESERVE = PRINT_BOOKLET_SECTION_H2_RESERVE;
  static readonly BOOKLET_PANEL_PACK_BUDGET = PRINT_BOOKLET_PANEL_PACK_BUDGET;
  static readonly BOOKLET_MARKDOWN_TO_HTML_WEIGHT = PRINT_BOOKLET_MARKDOWN_TO_HTML_WEIGHT;
  static readonly BOOKLET_PANEL_BOTTOM_SLACK = PRINT_BOOKLET_PANEL_BOTTOM_SLACK;
  static readonly BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS = PRINT_BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS;
  static readonly BOOKLET_UPDATES_MARKDOWN_FACTOR = PRINT_BOOKLET_UPDATES_MARKDOWN_FACTOR;
  static readonly BOOKLET_MARKDOWN_LIST_LINE_PREMIUM = PRINT_BOOKLET_MARKDOWN_LIST_LINE_PREMIUM;
  static readonly BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM = PRINT_BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM;
  static readonly BOOKLET_MAX_UNITS_PER_PANEL_CHUNK = PRINT_BOOKLET_MAX_UNITS_PER_PANEL_CHUNK;
  static readonly BOOKLET_PROMPT_SECTION_HEADING_WEIGHT = PRINT_BOOKLET_PROMPT_SECTION_HEADING_WEIGHT;

  /**
   * Loads approved, non-closed public prayers in the time range (created or update in range).
   * @returns `null` on fetch error (after alert), `[]` if none match.
   */
  private async loadPublicPrayersForTimeRange(
    timeRange: TimeRange,
    newWindow: Window | null,
  ): Promise<Prayer[] | null> {
    const endDate = new Date();
    const startDate = new Date();
    setPrintStartDateForTimeRange(startDate, endDate, timeRange);

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
    allUpdates?.forEach((update) => {
      if (update.approval_status === 'approved') {
        if (!updatesByPrayerId.has(update.prayer_id)) {
          updatesByPrayerId.set(update.prayer_id, []);
        }
        updatesByPrayerId.get(update.prayer_id)!.push(update);
      }
    });

    const prayersWithUpdates = (allPrayers || []).map((prayer) => ({
      ...prayer,
      prayer_updates: updatesByPrayerId.get(prayer.id) || [],
    }));

    return prayersWithUpdates.filter((prayer) => {
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

  async downloadPrintablePrayerList(timeRange: TimeRange = 'month', newWindow: Window | null = null): Promise<void> {
    try {
      const prayers = await this.loadPublicPrayersForTimeRange(timeRange, newWindow);
      if (prayers === null) {
        return;
      }
      if (prayers.length === 0) {
        alert(getPrintEmptyRangeUserMessage(timeRange));
        if (newWindow) {
          newWindow.close();
        }
        return;
      }

      const html = buildPrintPrayerListDocumentHtml(prayers, timeRange, this.resolveInfoQrImageSrc());

      if (isPrintNativeApp()) {
        console.log('[PrintService] Native app detected in downloadPrintablePrayerList, using shareOnNativeApp');
        const today = new Date().toISOString().split('T')[0];
        const rangeLabel = getPrintRangeFileLabel(timeRange);
        const filename = `prayer-list-${rangeLabel}-${today}.html`;

        await sharePrintHtmlOnNativeApp(html, filename, 'Prayer List');
        console.log('[PrintService] shareOnNativeApp completed, returning from downloadPrintablePrayerList');
        return;
      }

      if (isPrintNativeApp()) {
        console.error(
          '[PrintService] ERROR: Reached web printing code on native app in downloadPrintablePrayerList! This should never happen.',
        );
        return;
      }

      const targetWindow = newWindow || window.open('', '_blank');

      if (!targetWindow) {
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;

        const today = new Date().toISOString().split('T')[0];
        const rangeLabel = getPrintRangeFileLabel(timeRange);
        link.download = `prayer-list-${rangeLabel}-${today}.html`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        alert('Prayer list downloaded. Please open the file to view and print.');
      } else {
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

  async downloadPrintableBookletPrayerList(
    timeRange: BookletTimeRange = 'month',
    newWindow: Window | null = null,
  ): Promise<void> {
    try {
      const prayers = await this.loadPublicPrayersForTimeRange(timeRange, newWindow);
      if (prayers === null) {
        return;
      }

      const [bookletPromptSections, bookletInsertPages] = await Promise.all([
        this.loadBookletPromptSectionsOrdered(),
        this.loadBookletInsertPagesOrdered(),
      ]);

      if (
        prayers.length === 0 &&
        bookletPromptSections.length === 0 &&
        bookletInsertPages.length === 0
      ) {
        this.toast.warning(getPrintEmptyRangeUserMessage(timeRange));
        if (newWindow) {
          newWindow.close();
        }
        return;
      }

      await this.brandingService.initialize();
      const coverLogoUrl = this.getBookletFrontCoverLogoUrl();
      const [embeddedQr, embeddedAppIcon, embeddedBackLogo] = await Promise.all([
        this.tryEmbedInfoQrAsDataUrl(),
        this.tryEmbedBookletAppIconAsDataUrl(),
        coverLogoUrl.trim().length > 0
          ? this.tryEmbedBookletBackLogoAsDataUrl(coverLogoUrl)
          : Promise.resolve<string | null>(null),
      ]);
      const html = buildSaddleStitchBookletHtml(
        prayers,
        timeRange,
        coverLogoUrl,
        embeddedQr,
        embeddedAppIcon,
        embeddedBackLogo,
        bookletPromptSections,
        bookletInsertPages,
        this.resolveInfoQrImageSrc(),
        getPrintBookletAppIconUrl(),
      );

      if (isPrintNativeApp()) {
        const today = new Date().toISOString().split('T')[0];
        const rangeLabel = getPrintRangeFileLabel(timeRange);
        const filename = `prayer-list-booklet-${rangeLabel}-${today}.html`;
        await sharePrintHtmlOnNativeApp(html, filename, 'Prayer list booklet');
        return;
      }

      const targetWindow = newWindow || window.open('', '_blank');
      if (!targetWindow) {
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        const today = new Date().toISOString().split('T')[0];
        const rangeLabel = getPrintRangeFileLabel(timeRange);
        link.download = `prayer-list-booklet-${rangeLabel}-${today}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        this.toast.info(
          'Booklet download started. Open the file to print; use double-sided, flip on short edge, then fold and staple.',
        );
      } else {
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating prayer booklet:', error);
      this.toast.error('Failed to generate prayer booklet. Please try again.');
      if (newWindow) {
        newWindow.close();
      }
    }
  }

  private async loadBookletPromptSectionsOrdered(): Promise<Array<{ typeName: string; prompts: any[] }>> {
    const { data: typesRows, error: typesErr } = await this.supabase.client
      .from('prayer_types')
      .select('name, display_order')
      .eq('is_active', true)
      .eq('include_in_booklet', true)
      .order('display_order', { ascending: true });

    if (typesErr) {
      console.error('[PrintService] Booklet prompt types:', typesErr);
      return [];
    }
    if (!typesRows?.length) {
      return [];
    }

    const names = typesRows.map((t: { name: string }) => t.name);
    const { data: promptsData, error: promptsErr } = await this.supabase.client
      .from('prayer_prompts')
      .select('*')
      .in('type', names)
      .order('title', { ascending: true });

    if (promptsErr) {
      console.error('[PrintService] Booklet prompts:', promptsErr);
      return [];
    }
    if (!promptsData?.length) {
      return [];
    }

    const byType = new Map<string, any[]>();
    for (const p of promptsData) {
      const k = p.type as string;
      if (!byType.has(k)) {
        byType.set(k, []);
      }
      byType.get(k)!.push(p);
    }

    const ordered: Array<{ typeName: string; prompts: any[] }> = [];
    for (const row of typesRows) {
      const list = byType.get(row.name);
      if (list?.length) {
        ordered.push({
          typeName: row.name,
          prompts: sortPromptsAlphabeticalByTitle(list),
        });
      }
    }
    return ordered;
  }

  async loadBookletInsertPagesOrdered(): Promise<BookletInsertPage[]> {
    const { data, error } = await this.supabase.client
      .from('booklet_insert_pages')
      .select('id, sort_order, label, mime_type, image_data')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[PrintService] Booklet insert pages:', error);
      return [];
    }
    return (data ?? []) as BookletInsertPage[];
  }

  buildBookletInsertPageHtml(dataUrl: string): string {
    return renderBookletInsertPageHtml(dataUrl);
  }

  /** @internal Used by unit tests — prefer `buildPrintPrayerListDocumentHtml`. */
  private generatePrintableHTML(prayers: Prayer[], timeRange: TimeRange = 'month'): string {
    return buildPrintPrayerListDocumentHtml(prayers, timeRange, this.resolveInfoQrImageSrc());
  }

  /** @internal Used by unit tests — prefer `buildPrintPromptListDocumentHtml`. */
  private generatePromptsPrintableHTML(prompts: any[]): string {
    return buildPrintPromptListDocumentHtml(prompts, this.resolveInfoQrImageSrc());
  }

  /** @internal Used by unit tests — prefer `buildPrintPromptCardHtml`. */
  private generatePromptHTML(prompt: any): string {
    return buildPrintPromptCardHtml(prompt);
  }

  /** @internal Used by unit tests — prefer `splitBookletMarkdownIntoPanelParts` from print-booklet-pack. */
  private splitBookletMarkdownIntoPanelParts(markdown: string, maxChars: number): string[] {
    return splitBookletMarkdownIntoPanelParts(markdown, maxChars);
  }

  private resolveInfoQrImageSrc(): string {
    const infoUrl = resolvePrintInfoPageUrl(
      this.emailNotificationService.getEmailBaseUrl(),
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '',
    );
    return buildInfoQrImageSrc(infoUrl);
  }

  private async tryEmbedInfoQrAsDataUrl(): Promise<string | null> {
    return tryFetchImageAsDataUrl(this.resolveInfoQrImageSrc());
  }

  private async tryEmbedBookletAppIconAsDataUrl(): Promise<string | null> {
    return tryFetchImageAsDataUrl(getPrintBookletAppIconUrl());
  }

  private async tryEmbedBookletBackLogoAsDataUrl(resolvedLogoUrl: string): Promise<string | null> {
    const t = resolvedLogoUrl.trim();
    if (!t) {
      return null;
    }
    return tryFetchImageAsDataUrl(t);
  }

  private getBookletFrontCoverLogoUrl(): string {
    const b = this.brandingService.getBranding();
    if (!b.useLogo) {
      return '';
    }
    const url = (b.lightLogo || b.darkLogo || '').trim();
    if (!url) {
      return '';
    }
    return resolvePrintAssetUrl(url);
  }

  async downloadPrintablePromptList(selectedTypes: string[] = [], newWindow: Window | null = null): Promise<void> {
    try {
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

      const { data: typesData, error: typesError } = await this.supabase.client
        .from('prayer_types')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (typesError) {
        console.error('Error fetching prayer types:', typesError);
      }

      const typeOrderMap = new Map(typesData?.map((t: any) => [t.name, t.display_order]) || []);

      const filteredPrompts =
        selectedTypes.length > 0
          ? promptsData.filter((p: any) => selectedTypes.includes(p.type))
          : promptsData;

      if (filteredPrompts.length === 0) {
        alert('No prayer prompts found for the selected types.');
        if (newWindow) newWindow.close();
        return;
      }

      const sortedPrompts = filteredPrompts.sort((a: any, b: any) => {
        const orderA = typeOrderMap.get(a.type) ?? 999;
        const orderB = typeOrderMap.get(b.type) ?? 999;
        return (orderA as number) - (orderB as number);
      });

      const html = buildPrintPromptListDocumentHtml(sortedPrompts, this.resolveInfoQrImageSrc());

      if (isPrintNativeApp()) {
        console.log('[PrintService] Native app detected in downloadPrintablePromptList, using shareOnNativeApp');
        const today = new Date().toISOString().split('T')[0];
        const filename = `prayer-prompts-${today}.html`;

        await sharePrintHtmlOnNativeApp(html, filename, 'Prayer Prompts');
        console.log('[PrintService] shareOnNativeApp completed, returning from downloadPrintablePromptList');
        return;
      }

      if (isPrintNativeApp()) {
        console.error(
          '[PrintService] ERROR: Reached web printing code on native app in downloadPrintablePromptList! This should never happen.',
        );
        return;
      }

      const targetWindow = newWindow || window.open('', '_blank');

      if (!targetWindow) {
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
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating prayer prompts list:', error);
      alert('An error occurred while generating the prayer prompts list.');
      if (newWindow) newWindow.close();
    }
  }

  async downloadPrintablePersonalPrayerList(categories?: string[], newWindow: Window | null = null): Promise<void> {
    try {
      const allPersonalPrayers = await this.prayerService.getPersonalPrayers();

      if (!allPersonalPrayers || allPersonalPrayers.length === 0) {
        alert('No personal prayers found.');
        if (newWindow) newWindow.close();
        return;
      }

      const personalPrayers =
        categories && categories.length > 0
          ? allPersonalPrayers.filter((prayer: any) => categories.includes(prayer.category || ''))
          : allPersonalPrayers;

      if (personalPrayers.length === 0) {
        const categoryText =
          categories && categories.length > 0 ? `in the selected categories` : 'with the selected filters';
        alert(`No personal prayers found ${categoryText}.`);
        if (newWindow) newWindow.close();
        return;
      }

      const html = buildPrintPersonalPrayerListDocumentHtml(personalPrayers, categories);

      if (isPrintNativeApp()) {
        console.log('[PrintService] Native app detected in downloadPrintablePersonalPrayerList, using shareOnNativeApp');
        const today = new Date().toISOString().split('T')[0];
        const categoryLabel =
          categories && categories.length > 0 ? categories.slice(0, 2).join('-').toLowerCase() : 'all';
        const filename = `personal-prayers-${categoryLabel}-${today}.html`;

        await sharePrintHtmlOnNativeApp(html, filename, 'Personal Prayers');
        console.log('[PrintService] shareOnNativeApp completed, returning from downloadPrintablePersonalPrayerList');
        return;
      }

      if (isPrintNativeApp()) {
        console.error(
          '[PrintService] ERROR: Reached web printing code on native app in downloadPrintablePersonalPrayerList! This should never happen.',
        );
        return;
      }

      const targetWindow = newWindow || window.open('', '_blank');

      if (!targetWindow) {
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;

        const today = new Date().toISOString().split('T')[0];
        const categoryLabel =
          categories && categories.length > 0 ? categories.slice(0, 2).join('-').toLowerCase() : 'all';
        link.download = `personal-prayers-${categoryLabel}-${today}.html`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        alert('Personal prayers downloaded. Please open the file to view and print.');
      } else {
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
}
