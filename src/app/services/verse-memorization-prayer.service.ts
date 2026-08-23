import { Injectable } from '@angular/core';
import { markdownToPlainText } from '../../utils/markdown';
import { buildMemorizeVerseAppLink } from '../lib/email-notification-links';
import type { BibleTranslation } from '../types/memorization';
import { BrandingService } from './branding.service';
import { EmailNotificationService } from './email-notification.service';
import { PrayerService } from './prayer.service';
import { PushNotificationService } from './push-notification.service';
import { ScriptureService } from './scripture.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { UserSessionService } from './user-session.service';

export type SendVerseMemorizationPrayerOutcome =
  | { ok: true; prayerId: string }
  | { ok: false; reason: 'empty_reference' | 'no_passage' | 'no_admin_email' | 'insert_failed' };

const VERSE_MEMORIZATION_PRAYER_FOR = 'Verse Memorization';

@Injectable({ providedIn: 'root' })
export class VerseMemorizationPrayerService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly scriptureService: ScriptureService,
    private readonly brandingService: BrandingService,
    private readonly emailNotification: EmailNotificationService,
    private readonly pushNotification: PushNotificationService,
    private readonly prayerService: PrayerService,
    private readonly userSession: UserSessionService,
  ) {}

  async sendVerseMemorizationPrayer(options: {
    reference: string;
    translation: BibleTranslation;
    adminMessage?: string | null;
  }): Promise<SendVerseMemorizationPrayerOutcome> {
    const reference = options.reference.trim();
    if (!reference) {
      return { ok: false, reason: 'empty_reference' };
    }

    const adminEmail = this.userSession.getUserEmail();
    if (!adminEmail) {
      return { ok: false, reason: 'no_admin_email' };
    }

    const translation = options.translation;
    const passage = await this.scriptureService.getPassage(reference, translation);
    const verseText = passage.text?.trim();
    if (!verseText) {
      return { ok: false, reason: 'no_passage' };
    }

    const adminMessage = options.adminMessage?.trim() ?? '';
    const branding = this.brandingService.getBranding();
    const requester =
      branding.appTitle?.trim() || branding.appSubtitle?.trim() || 'Church';
    const now = new Date().toISOString();

    const { data, error } = await this.supabase.client
      .from('prayers')
      .insert({
        title: reference,
        description: verseText,
        status: 'current',
        requester,
        prayer_for: VERSE_MEMORIZATION_PRAYER_FOR,
        approval_status: 'approved',
        approved_at: now,
        email: adminEmail,
        is_anonymous: false,
        content_kind: 'verse_memorization',
        verse_reference: reference,
        verse_translation: translation,
        admin_message: adminMessage || null,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      console.error('[VerseMemorizationPrayerService] insert failed:', error);
      return { ok: false, reason: 'insert_failed' };
    }

    const prayerId = data.id as string;
    const baseUrl = this.emailNotification.getEmailBaseUrl();
    const memorizeAppLink = buildMemorizeVerseAppLink(baseUrl, reference, translation);

    await this.emailNotification.sendVerseMemorizationPrayerNotification({
      prayerId,
      verseReference: reference,
      verseTranslation: translation,
      verseText,
      adminMessage: adminMessage || null,
    });

    const pushBody =
      adminMessage.length > 0
        ? markdownToPlainText(adminMessage).slice(0, 120)
        : verseText.length > 120
          ? verseText.slice(0, 117) + '...'
          : verseText;

    await this.pushNotification
      .sendPushToSubscribers({
        title: `Memorize: ${reference}`,
        body: pushBody,
        data: {
          type: 'verse_memorization_prayer',
          prayerId,
          verseRef: reference,
          verseTranslation: translation,
          url: memorizeAppLink,
        },
      })
      .catch(() => undefined);

    await this.prayerService.loadPrayers(false).catch(() => undefined);

    return { ok: true, prayerId };
  }

  async listRecent(limit = 10): Promise<
    Array<{
      id: string;
      verse_reference: string;
      verse_translation: string | null;
      approved_at: string | null;
      status: string;
    }>
  > {
    const { data, error } = await this.supabase.client
      .from('prayers')
      .select('id, verse_reference, verse_translation, approved_at, status')
      .eq('content_kind', 'verse_memorization')
      .order('approved_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[VerseMemorizationPrayerService] listRecent failed:', error);
      return [];
    }

    return (data ?? []) as Array<{
      id: string;
      verse_reference: string;
      verse_translation: string | null;
      approved_at: string | null;
      status: string;
    }>;
  }
}
