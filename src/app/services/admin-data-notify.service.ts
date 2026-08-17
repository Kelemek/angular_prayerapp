import { Injectable } from '@angular/core';
import { markdownToPlainText } from '../../utils/markdown';
import {
  nestedPrayerDescription,
  nestedPrayerStatus,
  nestedPrayerTitle,
  prayerStatusAfterApprovedUpdate,
  type AdminPrayerRow,
  type AdminPendingUpdateRow,
} from '../lib/admin-data-map';
import type { AccountApprovalRequest } from '../types/admin-data';
import { EmailNotificationService } from './email-notification.service';
import { PushNotificationService } from './push-notification.service';

@Injectable({ providedIn: 'root' })
export class AdminDataNotifyService {
  constructor(
    private readonly emailNotification: EmailNotificationService,
    private readonly pushNotification: PushNotificationService,
  ) {}

  notifyPrayerApproved(prayer: AdminPrayerRow): void {
    this.emailNotification
      .sendRequesterApprovalNotification({
        title: prayer.title,
        description: prayer.description,
        requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
        requesterEmail: prayer.email,
        prayerFor: prayer.prayer_for,
      })
      .catch((err) => console.error('Failed to send requester approval notification:', err));

    if (prayer.email) {
      const pushTitle = 'Prayer approved';
      const pushBody =
        (prayer.title || 'Your prayer request').length > 80
          ? (prayer.title || 'Your prayer request').slice(0, 77) + '...'
          : (prayer.title || 'Your prayer request');
      this.pushNotification
        .sendPushToEmails([prayer.email], {
          title: pushTitle,
          body: pushBody,
          data: { type: 'prayer_approved', prayerId: prayer.id },
        })
        .catch(() => undefined);
    }
  }

  notifyPrayerDenied(prayer: AdminPrayerRow, reason: string): void {
    if (!prayer.email) {
      return;
    }
    this.emailNotification
      .sendDeniedPrayerNotification({
        title: prayer.title,
        description: prayer.description,
        requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
        requesterEmail: prayer.email,
        denialReason: reason,
      })
      .catch((err) => console.error('Failed to send denial notification:', err));
  }

  sendApprovedPrayerBroadcast(prayer: AdminPrayerRow): void {
    this.emailNotification
      .sendApprovedPrayerNotification({
        title: prayer.title,
        description: prayer.description,
        requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
        prayerFor: prayer.prayer_for,
        status: prayer.status,
      })
      .catch((err) => console.error('Failed to send broadcast notification:', err));

    const pushTitle = prayer.title.length > 50 ? prayer.title.slice(0, 47) + '...' : prayer.title;
    const desc = markdownToPlainText(prayer.description).trim();
    const pushBody =
      desc.length > 0 ? (desc.length > 120 ? desc.slice(0, 117) + '...' : desc) : 'A new prayer has been shared.';
    this.pushNotification
      .sendPushToSubscribers({
        title: pushTitle,
        body: pushBody,
        data: { type: 'prayer_approved', prayerId: prayer.id },
      })
      .catch(() => undefined);
  }

  sendNewPrayerBroadcast(prayer: AdminPrayerRow): void {
    this.sendApprovedPrayerBroadcast(prayer);
  }

  notifyUpdateApproved(update: AdminPendingUpdateRow): void {
    const prayerTitle = nestedPrayerTitle(update.prayers ?? undefined);
    this.emailNotification
      .sendUpdateAuthorApprovalNotification({
        prayerTitle,
        content: update.content || '',
        author: update.is_anonymous ? 'Anonymous' : update.author || 'Anonymous',
        authorEmail: update.author_email || '',
      })
      .catch((err) => console.error('Failed to send update author approval notification:', err));

    if (update.author_email) {
      const pushTitle = 'Update approved';
      const updatePlain = markdownToPlainText(update.content || '').trim();
      const pushBody = `${prayerTitle}: ${updatePlain.slice(0, 60)}${updatePlain.length > 60 ? '...' : ''}`;
      this.pushNotification
        .sendPushToEmails([update.author_email], {
          title: pushTitle,
          body: pushBody || prayerTitle,
          data: { type: 'update_approved', updateId: update.id, prayerId: update.prayer_id },
        })
        .catch(() => undefined);
    }
  }

  sendApprovedUpdateBroadcast(update: AdminPendingUpdateRow): void {
    const prayerTitle = nestedPrayerTitle(update.prayers ?? undefined);
    const prayerDescription = nestedPrayerDescription(update.prayers ?? undefined);
    const prayerStatus = nestedPrayerStatus(update.prayers ?? undefined);
    this.emailNotification
      .sendApprovedUpdateNotification({
        prayerTitle,
        prayerDescription,
        content: update.content,
        author: update.is_anonymous ? 'Anonymous' : update.author || 'Anonymous',
        prayerStatus,
        markedAsAnswered: update.mark_as_answered || false,
      })
      .catch((err) => console.error('Failed to send update notification:', err));

    const pushTitle = prayerTitle.length > 50 ? prayerTitle.slice(0, 47) + '...' : prayerTitle;
    const updateContent = markdownToPlainText(update.content || '').trim();
    const pushBody =
      updateContent.length > 0
        ? updateContent.length > 120
          ? updateContent.slice(0, 117) + '...'
          : updateContent
        : 'New prayer update.';
    this.pushNotification
      .sendPushToSubscribers({
        title: pushTitle,
        body: pushBody,
        data: { type: 'prayer_update', prayerId: update.prayer_id, updateId: update.id },
      })
      .catch(() => undefined);
  }

  sendNewUpdateBroadcast(update: AdminPendingUpdateRow, subscriberPrayerStatus: string): void {
    const prayerTitle = nestedPrayerTitle(update.prayers ?? undefined);
    const prayerDescription = nestedPrayerDescription(update.prayers ?? undefined);
    this.emailNotification
      .sendApprovedUpdateNotification({
        prayerTitle,
        prayerDescription,
        content: update.content,
        author: update.is_anonymous ? 'Anonymous' : update.author || 'Anonymous',
        prayerStatus: subscriberPrayerStatus,
        markedAsAnswered: update.mark_as_answered || false,
      })
      .catch((err) => console.error('Failed to send update notification:', err));

    const pushTitle = prayerTitle.length > 50 ? prayerTitle.slice(0, 47) + '...' : prayerTitle;
    const updateContent = markdownToPlainText(update.content || '').trim();
    const pushBody =
      updateContent.length > 0
        ? updateContent.length > 120
          ? updateContent.slice(0, 117) + '...'
          : updateContent
        : 'New prayer update.';
    this.pushNotification
      .sendPushToSubscribers({
        title: pushTitle,
        body: pushBody,
        data: { type: 'prayer_update', prayerId: update.prayer_id, updateId: update.id },
      })
      .catch(() => undefined);
  }

  notifyUpdateDenied(update: AdminPendingUpdateRow, reason: string): void {
    if (!update.author_email) {
      return;
    }
    const prayerTitle = nestedPrayerTitle(update.prayers ?? undefined);
    this.emailNotification
      .sendDeniedUpdateNotification({
        prayerTitle,
        content: update.content,
        author: update.is_anonymous ? 'Anonymous' : update.author || 'Anonymous',
        authorEmail: update.author_email,
        denialReason: reason,
      })
      .catch((err) => console.error('Failed to send denial notification:', err));
  }

  async notifyAccountApproved(request: AccountApprovalRequest): Promise<void> {
    try {
      const template = await this.emailNotification.getTemplate('account_approved');
      if (template) {
        const subject = this.emailNotification.applyTemplateVariables(template.subject, {
          firstName: request.first_name,
        });
        const html = this.emailNotification.applyTemplateVariables(template.html_body, {
          firstName: request.first_name,
          lastName: request.last_name,
          email: request.email,
          loginLink: `${this.emailNotification.getEmailBaseUrl()}/login`,
        });
        const text = this.emailNotification.applyTemplateVariables(template.text_body, {
          firstName: request.first_name,
          lastName: request.last_name,
          email: request.email,
          loginLink: `${this.emailNotification.getEmailBaseUrl()}/login`,
        });

        await this.emailNotification.sendEmail({
          to: request.email,
          subject,
          htmlBody: html,
          textBody: text,
        });
      }
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    try {
      await this.emailNotification.sendSubscriberWelcomeNotification(request.email);
    } catch (welcomeEmailError) {
      console.error('Failed to send welcome email:', welcomeEmailError);
    }
  }

  async notifyAccountDenied(request: AccountApprovalRequest): Promise<void> {
    try {
      const template = await this.emailNotification.getTemplate('account_denied');
      if (template) {
        const subject = this.emailNotification.applyTemplateVariables(template.subject, {
          firstName: request.first_name,
        });
        const html = this.emailNotification.applyTemplateVariables(template.html_body, {
          firstName: request.first_name,
          lastName: request.last_name,
          supportEmail: 'support@example.com',
        });
        const text = this.emailNotification.applyTemplateVariables(template.text_body, {
          firstName: request.first_name,
          lastName: request.last_name,
          supportEmail: 'support@example.com',
        });

        await this.emailNotification.sendEmail({
          to: request.email,
          subject,
          htmlBody: html,
          textBody: text,
        });
      }
    } catch (emailError) {
      console.error('Failed to send denial email:', emailError);
    }
  }

  async sendSubscriberWelcomeEmail(email: string): Promise<void> {
    await this.emailNotification.sendSubscriberWelcomeNotification(email);
  }

  subscriberPrayerStatusForUpdate(
    update: AdminPendingUpdateRow,
    appliedPrayerStatus: string | null,
  ): string {
    const currentStatus = nestedPrayerStatus(update.prayers ?? undefined);
    const newStatus = prayerStatusAfterApprovedUpdate(update.mark_as_answered, currentStatus);
    return newStatus ?? appliedPrayerStatus ?? currentStatus ?? 'current';
  }
}
