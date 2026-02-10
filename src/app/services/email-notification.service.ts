import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  replyTo?: string;
  fromName?: string;
}

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovedPrayerPayload {
  title: string;
  description: string;
  requester: string;
  prayerFor: string;
  status: string;
}

export interface ApprovedUpdatePayload {
  prayerTitle: string;
  prayerDescription: string;
  content: string;
  author: string;
  markedAsAnswered?: boolean;
}

export interface RequesterApprovalPayload {
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  prayerFor: string;
}

export interface DeniedPrayerPayload {
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  denialReason: string;
}

export interface DeniedUpdatePayload {
  prayerTitle: string;
  content: string;
  author: string;
  authorEmail: string;
  denialReason: string;
}

export interface UpdateAuthorApprovalPayload {
  prayerTitle: string;
  content: string;
  author: string;
  authorEmail: string;
}

export interface AdminNotificationPayload {
  type: 'prayer' | 'update' | 'deletion';
  title: string;
  description?: string;
  requester?: string;
  author?: string;
  content?: string;
  reason?: string;
  requestId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailNotificationService {
  constructor(
    private supabase: SupabaseService
  ) {}

  /**
   * Send a single email using Supabase edge function
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { data, error } = await this.supabase.client.functions.invoke('send-email', {
      body: {
        to: options.to,
        subject: options.subject,
        htmlBody: options.htmlBody,
        textBody: options.textBody,
        replyTo: options.replyTo,
        fromName: options.fromName
      }
    });

    if (error) {
      console.error('Failed to send email:', error);
      throw new Error(error.message || 'Failed to send email');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to send email');
    }
  }

  /**
   * Get email template by key
   */
  async getTemplate(templateKey: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase.client
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }

    return data;
  }

  /**
   * Apply template variables to a string with {{variableName}} syntax
   */
  applyTemplateVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, value || '');
    }
    return result;
  }

  /**
   * Queue an email for processing by the email queue system
   * Used for bulk notifications to improve deliverability
   */
  async enqueueEmail(
    recipient: string,
    templateKey: string,
    variables: Record<string, string | null | undefined> = {}
  ): Promise<void> {
    // Ensure all values are strings (convert undefined/null to empty string)
    const stringifiedVariables: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      stringifiedVariables[key] = value !== null && value !== undefined ? String(value) : '';
    }

    const { error } = await this.supabase.client
      .from('email_queue')
      .insert({
        recipient,
        template_key: templateKey,
        template_variables: stringifiedVariables,
        status: 'pending',
        attempts: 0
      });

    if (error) {
      console.error('Failed to enqueue email:', error);
      throw new Error(error.message || 'Failed to enqueue email');
    }

    console.log(`📧 Email queued for ${recipient} with template ${templateKey}`);
  }

  /**
   * Trigger email processor workflow via Supabase Edge Function
   */
  private async triggerEmailProcessor(): Promise<void> {
    try {
      console.log('🚀 Triggering email processor via Edge Function...');
      
      const response = await this.supabase.client.functions.invoke('trigger-email-processor', {
        method: 'POST',
      });

      if (response.error) {
        console.error('❌ Edge Function error:', response.error);
        return;
      }

      console.log('📊 Edge Function response:', response.data);
      console.log('✅ Email processor workflow triggered successfully');
    } catch (error) {
      console.error('❌ Failed to trigger email processor:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Send email to all active subscribers
   */
  async sendEmailToAllSubscribers(options: {
    subject: string;
    htmlBody?: string;
    textBody?: string;
    replyTo?: string;
    fromName?: string;
  }): Promise<void> {
    const { data, error } = await this.supabase.client.functions.invoke('send-email', {
      body: {
        action: 'send_to_all_subscribers',
        subject: options.subject,
        htmlBody: options.htmlBody,
        textBody: options.textBody,
        replyTo: options.replyTo,
        fromName: options.fromName
      }
    });

    if (error) {
      console.error('Failed to send bulk email:', error);
      throw new Error(error.message || 'Failed to send bulk email');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to send bulk email');
    }
  }

  /**
   * Send notification when a prayer is approved
   * Queues emails to all active subscribers for processing
   */
  async sendApprovedPrayerNotification(payload: ApprovedPrayerPayload): Promise<void> {
    try {
      const isAnswered = payload.status === 'answered';
      const templateKey = isAnswered ? 'prayer_answered' : 'approved_prayer';

      // Template variables to send with queued emails
      const variables = {
        prayerTitle: payload.title,
        prayerFor: payload.prayerFor,
        requesterName: payload.requester,
        prayerDescription: payload.description,
        status: payload.status,
        appLink: `${window.location.origin}/`
      };

      // Fetch all active subscribers
      const { data: subscribers, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('is_active', true)
        .eq('is_blocked', false);

      if (fetchError) {
        throw fetchError;
      }

      if (!subscribers || subscribers.length === 0) {
        console.log('No active subscribers to notify');
        return;
      }

      // Queue an email for each subscriber
      const queuePromises = subscribers.map(sub =>
        this.enqueueEmail(sub.email, templateKey, variables).catch(err =>
          console.error(`Failed to queue email for ${sub.email}:`, err)
        )
      );

      await Promise.all(queuePromises);
      console.log(`📧 Queued approved prayer notification to ${subscribers.length} subscriber(s)`);

      // Trigger email processor immediately
      await this.triggerEmailProcessor().catch(err =>
        console.error('Failed to trigger email processor:', err)
      );
    } catch (error) {
      console.error('Error in sendApprovedPrayerNotification:', error);
      // Don't re-throw - let the error be logged but don't block approval
    }
  }

  /**
   * Send notification when a prayer update is approved
   * Queues emails to all active subscribers for processing
   */
  async sendApprovedUpdateNotification(payload: ApprovedUpdatePayload): Promise<void> {
    try {
      const isAnswered = payload.markedAsAnswered || false;
      const templateKey = isAnswered ? 'prayer_answered' : 'approved_update';

      // Template variables to send with queued emails
      const variables = {
        prayerTitle: payload.prayerTitle,
        prayerDescription: payload.prayerDescription,
        authorName: payload.author,
        updateContent: payload.content,
        appLink: window.location.origin
      };

      // Fetch all active subscribers
      const { data: subscribers, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('is_active', true)
        .eq('is_blocked', false);

      if (fetchError) {
        throw fetchError;
      }

      if (!subscribers || subscribers.length === 0) {
        console.log('No active subscribers to notify');
        return;
      }

      // Queue an email for each subscriber
      const queuePromises = subscribers.map(sub =>
        this.enqueueEmail(sub.email, templateKey, variables).catch(err =>
          console.error(`Failed to queue email for ${sub.email}:`, err)
        )
      );

      await Promise.all(queuePromises);
      console.log(`📧 Queued approved update notification to ${subscribers.length} subscriber(s)`);

      // Trigger email processor immediately
      await this.triggerEmailProcessor().catch(err =>
        console.error('Failed to trigger email processor:', err)
      );
    } catch (error) {
      console.error('Error in sendApprovedUpdateNotification:', error);
    }
  }

  /**
   * Send notification to requester when their prayer is approved
   */
  async sendRequesterApprovalNotification(payload: RequesterApprovalPayload): Promise<void> {
    try {
      if (!payload.requesterEmail) {
        console.warn('No email address for prayer requester');
        return;
      }

      let subject: string;
      let body: string;
      let html: string;

      try {
        const template = await this.getTemplate('requester_approval');
        if (template) {
          const variables = {
            prayerTitle: payload.title,
            prayerFor: payload.prayerFor,
            prayerDescription: payload.description,
            appLink: `${window.location.origin}/`
          };
          console.log('[EmailNotificationService.sendRequesterApprovalNotification] Template variables:', variables);
          console.log('[EmailNotificationService.sendRequesterApprovalNotification] Template HTML before substitution:', template.html_body.substring(0, 200));
          subject = this.applyTemplateVariables(template.subject, variables);
          body = this.applyTemplateVariables(template.text_body, variables);
          html = this.applyTemplateVariables(template.html_body, variables);
          console.log('[EmailNotificationService.sendRequesterApprovalNotification] HTML after substitution contains prayerFor:', html.includes(payload.prayerFor));
        } else {
          throw new Error('Template not found');
        }
      } catch (error) {
        console.warn('Failed to load requester_approval template, using fallback:', error);
        subject = `Your Prayer Request Has Been Approved: ${payload.title}`;
        body = `Great news! Your prayer request has been approved and is now live on the prayer app.\n\nTitle: ${payload.title}\nFor: ${payload.prayerFor}\n\nYour prayer is now being lifted up by our community. You will receive updates via email when the prayer status changes or when updates are posted.`;
        html = this.generateRequesterApprovalHTML(payload);
        console.log('[EmailNotificationService.sendRequesterApprovalNotification] Using fallback HTML, html contains prayerFor:', html.includes(payload.prayerFor));
      }

      await this.sendEmail({
        to: [payload.requesterEmail],
        subject,
        textBody: body,
        htmlBody: html
      });
    } catch (error) {
      console.error('Error in sendRequesterApprovalNotification:', error);
    }
  }

  /**
   * Send notification when a prayer is denied
   */
  async sendDeniedPrayerNotification(payload: DeniedPrayerPayload): Promise<void> {
    try {
      if (!payload.requesterEmail) {
        console.warn('No email address for denied prayer requester');
        return;
      }

      let subject = `Prayer Request Not Approved: ${payload.title}`;
      let body = `Unfortunately, your prayer request could not be approved at this time.\n\nTitle: ${payload.title}\nRequested by: ${payload.requester}\n\nReason: ${payload.denialReason}\n\nIf you have questions, please contact the administrator.`;
      let html = this.generateDeniedPrayerHTML(payload);

      try {
        const template = await this.getTemplate('denied_prayer');
        if (template) {
          const variables = {
            prayerTitle: payload.title,
            prayerDescription: payload.description,
            denialReason: payload.denialReason,
            appLink: `${window.location.origin}/`
          };
          subject = this.applyTemplateVariables(template.subject, variables);
          body = this.applyTemplateVariables(template.text_body, variables);
          html = this.applyTemplateVariables(template.html_body, variables);
        }
      } catch (templateError) {
        console.warn('Failed to fetch denied_prayer template, using fallback:', templateError);
      }

      await this.sendEmail({
        to: [payload.requesterEmail],
        subject,
        textBody: body,
        htmlBody: html
      });
    } catch (error) {
      console.error('Error in sendDeniedPrayerNotification:', error);
    }
  }

  /**
   * Send notification when an update is denied
   */
  async sendDeniedUpdateNotification(payload: DeniedUpdatePayload): Promise<void> {
    try {
      if (!payload.authorEmail) {
        console.warn('No email address for denied update author');
        return;
      }

      let subject = `Prayer Update Not Approved: ${payload.prayerTitle}`;
      let body = `Unfortunately, your update for "${payload.prayerTitle}" could not be approved at this time.\n\nUpdate by: ${payload.author}\n\nReason: ${payload.denialReason}\n\nIf you have questions, please contact the administrator.`;
      let html = this.generateDeniedUpdateHTML(payload);

      try {
        const template = await this.getTemplate('denied_update');
        if (template) {
          const variables = {
            prayerTitle: payload.prayerTitle,
            updateContent: payload.content,
            denialReason: payload.denialReason,
            appLink: `${window.location.origin}/`
          };
          subject = this.applyTemplateVariables(template.subject, variables);
          body = this.applyTemplateVariables(template.text_body, variables);
          html = this.applyTemplateVariables(template.html_body, variables);
        }
      } catch (templateError) {
        console.warn('Failed to fetch denied_update template, using fallback:', templateError);
      }

      await this.sendEmail({
        to: [payload.authorEmail],
        subject,
        textBody: body,
        htmlBody: html
      });
    } catch (error) {
      console.error('Error in sendDeniedUpdateNotification:', error);
    }
  }

  /**
   * Send notification to update author when their update is approved
   */
  async sendUpdateAuthorApprovalNotification(payload: UpdateAuthorApprovalPayload): Promise<void> {
    try {
      if (!payload.authorEmail) {
        console.warn('No email address for update author');
        return;
      }

      let subject: string;
      let body: string;
      let html: string;

      try {
        const template = await this.getTemplate('update_author_approval');
        if (template) {
          const variables = {
            prayerTitle: payload.prayerTitle,
            updateContent: payload.content,
            author: payload.author,
            appLink: `${window.location.origin}/`
          };
          subject = this.applyTemplateVariables(template.subject, variables);
          body = this.applyTemplateVariables(template.text_body, variables);
          html = this.applyTemplateVariables(template.html_body, variables);
        } else {
          throw new Error('Template not found');
        }
      } catch (error) {
        console.warn('Failed to load update_author_approval template, using fallback:', error);
        subject = `Your Update Has Been Approved: ${payload.prayerTitle}`;
        body = `Great news! Your update for "${payload.prayerTitle}" has been approved and is now live on the prayer app.\n\nUpdate: ${payload.content}\n\nThank you for keeping our community updated!`;
        html = this.generateUpdateAuthorApprovalHTML(payload);
      }

      await this.sendEmail({
        to: [payload.authorEmail],
        subject,
        textBody: body,
        htmlBody: html
      });
    } catch (error) {
      console.error('Error in sendUpdateAuthorApprovalNotification:', error);
    }
  }

  /**
   * Send notification to admins when new items need approval
   * Sends individual emails to each admin with personalized approval links
   */
  async sendAdminNotification(payload: AdminNotificationPayload): Promise<void> {
    try {
      // Get admin emails from email_subscribers table
      const { data: admins, error: adminsError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('is_admin', true)
        .eq('is_active', true)
        .eq('receive_admin_emails', true);

      if (adminsError) {
        console.error('Error fetching admin emails:', adminsError);
        return;
      }

      if (!admins || admins.length === 0) {
        console.warn('No admins configured to receive notifications. Please enable admin email notifications in Admin User Management.');
        return;
      }

      const adminEmails = admins.map(admin => admin.email);

      // Send individual emails to each admin
      for (const adminEmail of adminEmails) {
        await this.sendAdminNotificationToEmail(payload, adminEmail);
      }
    } catch (error) {
      console.error('Error in sendAdminNotification:', error);
      // Don't throw - we don't want email failures to break the app
    }
  }

  /**
   * Send account approval request notification to all admins
   */
  async sendAccountApprovalNotification(email: string, firstName: string, lastName: string, affiliationReason?: string): Promise<void> {
    try {
      // Get all admin emails
      const { data: admins, error: adminsError } = await this.supabase.directQuery<{ email: string }>(
        'email_subscribers',
        {
          select: 'email',
          eq: { is_admin: true, is_active: true }
        }
      );

      if (adminsError || !admins || !Array.isArray(admins) || admins.length === 0) {
        console.error('No admins found for account approval notification:', adminsError);
        return;
      }

      // Send notification to each admin
      for (const admin of admins) {
        await this.sendAccountApprovalNotificationToEmail(email, firstName, lastName, affiliationReason || '', admin.email);
      }
    } catch (error) {
      console.error('Error in sendAccountApprovalNotification:', error);
      // Don't throw - we don't want email failures to break the app
    }
  }

  /**
   * Send account approval notification to a single admin
   */
  private async sendAccountApprovalNotificationToEmail(email: string, firstName: string, lastName: string, affiliationReason: string, adminEmail: string): Promise<void> {
    try {
      // Link to admin site - admins will log in normally
      const appUrl = window.location.origin;
      const adminLink = `${appUrl}/admin`;
      
      // Get template from database
      const template = await this.getTemplate('account_approval_request');
      
      if (!template) {
        console.error('Account approval request template not found');
        return;
      }
      
      const requestedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Replace variables in template
      const subject = this.applyTemplateVariables(template.subject, {
        firstName,
        lastName,
        email
      });
      
      const html = this.applyTemplateVariables(template.html_body, {
        firstName,
        lastName,
        email,
        affiliationReason,
        requestedDate,
        adminLink
      });
      
      const body = this.applyTemplateVariables(template.text_body, {
        firstName,
        lastName,
        email,
        affiliationReason,
        requestedDate,
        adminLink
      });
      
      await this.sendEmail({
        to: [adminEmail],
        subject,
        textBody: body,
        htmlBody: html
      });
    } catch (error) {
      console.error('Error in sendAccountApprovalNotificationToEmail:', error);
      // Don't throw - we don't want email failures to break the app
    }
  }

  /**
   * Send notification to a single admin with personalized approval link
   */
  private async sendAdminNotificationToEmail(payload: AdminNotificationPayload, adminEmail: string): Promise<void> {
    try {
      // Link to admin site - admins will log in normally to handle approvals
      const adminLink = `${window.location.origin}/admin`;

      let subject: string;
      let body: string;
      let html: string | undefined;

      // Load appropriate template based on payload type
      try {
        let templateKey: string;
        let variables: Record<string, string>;
        
        switch (payload.type) {
          case 'prayer':
            templateKey = 'admin_notification_prayer';
            variables = {
              prayerTitle: payload.title,
              requesterName: payload.requester || 'Anonymous',
              prayerDescription: payload.description || 'No description provided',
              adminLink
            };
            break;
            
          case 'update':
            templateKey = 'admin_notification_update';
            variables = {
              prayerTitle: payload.title,
              authorName: payload.author || 'Anonymous',
              updateContent: payload.content || 'No content provided',
              adminLink
            };
            break;
            
          case 'deletion':
            templateKey = 'admin_notification_deletion';
            variables = {
              prayerTitle: payload.title,
              requestedBy: payload.requester || 'Anonymous',
              reason: payload.reason || 'No reason provided',
              adminLink
            };
            break;
            
          default:
            subject = `New Admin Action Required: ${payload.title}`;
            body = `A new item requires your attention in the admin portal.`;
            throw new Error('Unknown payload type');
        }
        
        const template = await this.getTemplate(templateKey);
        
        if (template) {
          subject = this.applyTemplateVariables(template.subject, variables);
          body = this.applyTemplateVariables(template.text_body, variables);
          html = this.applyTemplateVariables(template.html_body, variables);
        } else {
          throw new Error(`Template ${templateKey} not found`);
        }
      } catch (error) {
        // Fallback templates
        if (payload.type === 'prayer') {
          subject = `New Prayer Request: ${payload.title}`;
          body = `A new prayer request has been submitted and is pending approval.\n\nTitle: ${payload.title}\nRequested by: ${payload.requester || 'Anonymous'}\n\nDescription: ${payload.description || 'No description provided'}\n\nApprove this request here: ${adminLink}`;
          html = this.generateAdminNotificationPrayerHTML(payload, adminLink);
        } else if (payload.type === 'update') {
          subject = `New Prayer Update: ${payload.title}`;
          body = `A new prayer update has been submitted and is pending approval.\n\nPrayer: ${payload.title}\nUpdate by: ${payload.author || 'Anonymous'}\n\nContent: ${payload.content || 'No content provided'}\n\nApprove this request here: ${adminLink}`;
          html = this.generateAdminNotificationUpdateHTML(payload, adminLink);
        } else if (payload.type === 'deletion') {
          subject = `Deletion Request: ${payload.title}`;
          body = `A deletion request has been submitted for a prayer.\n\nPrayer: ${payload.title}\nRequested by: ${payload.requester || 'Anonymous'}\n\nReason: ${payload.reason || 'No reason provided'}\n\nApprove this request here: ${adminLink}`;
          html = this.generateAdminNotificationDeletionHTML(payload, adminLink);
        } else {
          subject = `New Admin Action Required`;
          body = `A new item requires your attention in the admin portal: ${adminLink}`;
        }
      }

      // Send email
      await this.sendEmail({
        to: [adminEmail],
        subject,
        textBody: body,
        htmlBody: html
      });
    } catch (error) {
      console.error('Error in sendAdminNotificationToEmail:', error);
      // Don't throw - we don't want email failures to break the app
    }
  }

  // HTML template generators (fallbacks when templates not found in DB)

  private generateApprovedPrayerHTML(payload: ApprovedPrayerPayload): string {
    const appUrl = `${window.location.origin}/`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Prayer Request</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0;"><strong>For:</strong> ${payload.prayerFor}</p>
              <p style="margin: 5px 0;"><strong>Requested by:</strong> ${payload.requester}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> ${payload.status}</p>
            </div>
            <p><strong>Description:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">${payload.description}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This prayer has been approved and is now active. Join us in prayer!</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateAnsweredPrayerHTML(payload: ApprovedPrayerPayload): string {
    const appUrl = `${window.location.origin}/`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prayer Answered</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Prayer Answered!</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 15px;">✓ Answered Prayer</div>
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0;"><strong>For:</strong> ${payload.prayerFor}</p>
              <p style="margin: 5px 0;"><strong>Requested by:</strong> ${payload.requester}</p>
            </div>
            <p><strong>Description:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">${payload.description}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Let's give thanks and praise for this answered prayer!</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateApprovedUpdateHTML(payload: ApprovedUpdatePayload): string {
    const appUrl = `${window.location.origin}/`;
    const isAnswered = payload.markedAsAnswered || false;

    const gradientColors = isAnswered ? '#10b981, #059669' : '#3b82f6, #2563eb';
    const icon = isAnswered ? '🎉' : '💬';
    const title = isAnswered ? 'Prayer Answered!' : 'Prayer Update';
    const borderColor = isAnswered ? '#10b981' : '#3b82f6';
    const buttonColor = isAnswered ? '#10b981' : '#3b82f6';
    const statusBadge = isAnswered
      ? '<div style="display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 15px;">✓ Answered Prayer</div>'
      : '';
    const closingMessage = isAnswered
      ? "Let's give thanks and praise for this answered prayer!"
      : "Let's continue to lift this prayer up together.";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, ${gradientColors}); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${icon} ${title}</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            ${statusBadge}
            <h2 style="color: #1f2937; margin-top: 0;">Update for: ${payload.prayerTitle}</h2>
            <p style="margin: 5px 0 15px 0;"><strong>Posted by:</strong> ${payload.author}</p>
            <p><strong>Update:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${borderColor};">${payload.content}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: ${buttonColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>${closingMessage}</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateRequesterApprovalHTML(payload: RequesterApprovalPayload): string {
    const appUrl = `${window.location.origin}/`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prayer Request Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Prayer Request Approved!</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Great news, ${payload.requester}!</h2>
            <p style="margin-bottom: 20px;">Your prayer request has been approved and is now active in our prayer community.</p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;"><strong>Your Prayer Request:</strong></p>
              <p style="margin: 0 0 5px 0; color: #065f46; font-weight: 600; font-size: 18px;">${payload.title}</p>
              <p style="margin: 0 0 10px 0; color: #047857; font-size: 14px;"><strong>Prayer for:</strong> ${payload.prayerFor}</p>
              <p style="margin: 0; color: #047857;">${payload.description}</p>
            </div>
            
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
                <strong>What happens next?</strong><br>
                • Your prayer is now visible to our community<br>
                • People can pray for this request and post updates<br>
                • You'll receive email notifications when updates are posted<br>
                • You can visit the app anytime to see the latest
              </p>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Thank you for sharing this prayer need with our community. We are honored to pray alongside you!</p>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Your Prayer</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>You're receiving this because you submitted a prayer request to our prayer app.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateDeniedPrayerHTML(payload: DeniedPrayerPayload): string {
    const appUrl = `${window.location.origin}/`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prayer Request Not Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Prayer Request Status</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <p style="margin-bottom: 15px;">Thank you for submitting your prayer request. After careful review, we are unable to approve this request at this time.</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
              <p style="margin: 10px 0 0 0; color: #991b1b;">${payload.denialReason}</p>
            </div>
            <p style="margin-top: 20px;"><strong>Your Submission:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${payload.description}</p>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateDeniedUpdateHTML(payload: DeniedUpdatePayload): string {
    const appUrl = `${window.location.origin}/`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prayer Update Not Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💬 Update Status</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Update for: ${payload.prayerTitle}</h2>
            <p style="margin-bottom: 15px;">Thank you for submitting an update. After careful review, we are unable to approve this update at this time.</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
              <p style="margin: 10px 0 0 0; color: #991b1b;">${payload.denialReason}</p>
            </div>
            <p style="margin-top: 20px;"><strong>Your Update:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${payload.content}</p>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateUpdateAuthorApprovalHTML(payload: UpdateAuthorApprovalPayload): string {
    const appUrl = `${window.location.origin}/`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Update Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Update Approved</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Update for: ${payload.prayerTitle}</h2>
            <p style="margin-bottom: 15px;">Great news! Your update has been approved and is now live on the prayer app.</p>
            <p style="margin-top: 20px;"><strong>Your Update:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${payload.content}</p>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Thank you for keeping our community updated on this prayer!</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
  }
  
  private generateAdminNotificationPrayerHTML(payload: AdminNotificationPayload, adminLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Prayer Request</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <p><strong>Requested by:</strong> ${payload.requester || 'Anonymous'}</p>
            <p><strong>Description:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">${payload.description || 'No description provided'}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${adminLink}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateAdminNotificationUpdateHTML(payload: AdminNotificationPayload, adminLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Prayer Update</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Prayer Update</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Update for: ${payload.title}</h2>
            <p><strong>Update by:</strong> ${payload.author || 'Anonymous'}</p>
            <p><strong>Content:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">${payload.content || 'No content provided'}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${adminLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateAdminNotificationDeletionHTML(payload: AdminNotificationPayload, adminLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Deletion Request</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #dc2626, #991b1b); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🗑️ Deletion Request</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <p><strong>Requested by:</strong> ${payload.requester || 'Anonymous'}</p>
            <p><strong>Reason:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">${payload.reason || 'No reason provided'}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${adminLink}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send welcome email to a new subscriber
   */
  async sendSubscriberWelcomeNotification(email: string): Promise<void> {
    try {
      if (!email) {
        console.warn('No email address provided for subscriber welcome notification');
        return;
      }

      const template = await this.getTemplate('subscriber_welcome');
      let subject: string;
      let htmlContent: string;
      let textContent: string;

      if (template) {
        const variables = {
          appLink: `${window.location.origin}/`
        };
        subject = this.applyTemplateVariables(template.subject, variables);
        htmlContent = this.applyTemplateVariables(template.html_body, variables);
        textContent = this.applyTemplateVariables(template.text_body, variables);
      } else {
        // Fallback content
        subject = 'Welcome to Our Prayer Community! 🙏';
        htmlContent = this.generateWelcomeEmailHTML();
        textContent = 'Welcome to our prayer community! We are thrilled to have you join us. Visit the app to learn more about how you can participate.';
      }

      await this.sendEmail({
        to: [email],
        subject,
        htmlBody: htmlContent,
        textBody: textContent
      });
    } catch (error) {
      console.error('Error in sendSubscriberWelcomeNotification:', error);
      // Don't re-throw - let the error be logged but don't block subscriber addition
    }
  }

  /**
   * Fallback HTML for welcome email
   */
  private generateWelcomeEmailHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Prayer Community</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2B2B2B; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #0047AB, #3E5266); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Our Prayer Community! 🙏</h1>
            <p style="color: #E8E5E1; margin: 10px 0 0 0; font-size: 16px;">You're now part of something meaningful</p>
          </div>
          <div style="background: #F8F7F5; padding: 20px; border: 1px solid #D1CCC4; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="margin-bottom: 20px;">We're so glad you've joined our prayer community! You're now connected to a group of people who believe in the power of prayer and the importance of lifting each other up.</p>
            <div style="background: #E8E5E1; border-left: 4px solid #39704D; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #39704D;">What You Can Do:</h3>
              <ul style="margin: 10px 0; padding-left: 20px; color: #2B2B2B;">
                <li style="margin: 8px 0;"><strong>Submit Prayer Requests</strong> - Share what's on your heart. Our community will pray for your needs, whether big or small.</li>
                <li style="margin: 8px 0;"><strong>Receive Prayer Updates</strong> - Get notified when community members share updates about their prayers, answered prayers, and God's faithfulness at work in their lives.</li>
                <li style="margin: 8px 0;"><strong>Stay Informed</strong> - Choose how often you want to hear from us. You can adjust your email preferences anytime.</li>
                <li style="margin: 8px 0;"><strong>Be Encouraged</strong> - Read stories of answered prayers and see how God is working in the lives of those around you.</li>
                <li style="margin: 8px 0;"><strong>Lift Others Up</strong> - Join in prayer for the requests that touch your heart. Your prayers make a real difference.</li>
              </ul>
            </div>
            <div style="background: #FEF9E7; border: 1px solid #C9A961; border-radius: 6px; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; color: #B8860B;"><strong>💡 Pro Tip:</strong> Check out the app to explore prayers in different categories and find people and situations you'd like to pray for.</p>
            </div>
            <h3 style="margin-top: 25px; margin-bottom: 10px; color: #2B2B2B;">Have Feedback or Questions?</h3>
            <p style="margin-bottom: 15px;">We'd love to hear from you! Whether you have suggestions to improve the app, questions about how things work, or feedback about your experience, we're all ears.</p>
            <p style="margin-bottom: 15px;"><strong>📝 Share Your Feedback:</strong> You can submit feedback directly through the app using the feedback form. Just look for the "Send Feedback" option in your user menu. Your thoughts help us create a better experience for everyone.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${window.location.origin}/" style="background: #39704D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Enter the Prayer App</a>
            </div>
          </div>
          <div style="margin-top: 25px; text-align: center; color: #988F83; font-size: 13px; border-top: 1px solid #D1CCC4; padding-top: 20px;">
            <p style="margin: 10px 0;"><strong>Blessings,</strong><br>Your Prayer Community Team</p>
            <p style="margin: 10px 0; font-size: 12px;">You're receiving this email because you've joined our prayer community. This is a one-time welcome message.</p>
            <p style="margin: 10px 0; font-size: 12px;">© 2024 Prayer Community. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }
}
