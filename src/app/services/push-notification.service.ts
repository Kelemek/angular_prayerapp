import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';
import { CapacitorService, PushNotificationToken } from './capacitor.service';

/**
 * Service for managing device tokens and push notification setup
 * This service handles storing device tokens in the backend so that
 * push notifications can be sent to specific devices.
 */
@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  constructor(
    private supabase: SupabaseService,
    private userSession: UserSessionService,
    private capacitor: CapacitorService
  ) {
    this.setupDeviceTokenHandling();
    this.setupSessionChangeHandling();
  }

  /**
   * Listen for device tokens and store them in the backend
   */
  private setupDeviceTokenHandling(): void {
    this.capacitor.pushToken$.subscribe(async (token) => {
      if (token && this.capacitor.isNative()) {
        console.log('New push token received, storing in backend:', token);
        await this.storeDeviceToken(token);
      }
    });
  }

  /**
   * When the user session becomes available (e.g. after first login), store the device token
   * if we already have one. Fixes the case where the token arrived before login.
   */
  private setupSessionChangeHandling(): void {
    this.userSession.userSession$.subscribe(async (session) => {
      if (!session?.email?.trim() || !this.capacitor.isNative()) return;
      const token = this.capacitor.getPushToken();
      if (token) {
        console.log('User session available, storing existing push token');
        await this.storeDeviceToken(token);
      }
    });
  }

  /**
   * Store device token in database for push notification delivery
   * This is called automatically when a new token is received
   * 
   * @param token - The push notification token for this device
   */
  async storeDeviceToken(token: PushNotificationToken): Promise<void> {
    try {
      // Prefer session (portal + admin MFA); fall back to localStorage when token arrives before session is loaded
      const sessionEmail = this.userSession.getCurrentSession()?.email?.trim();
      const userEmail =
        sessionEmail ||
        localStorage.getItem('prayerapp_user_email')?.trim() ||
        localStorage.getItem('mfa_authenticated_email')?.trim() ||
        (await this.supabase.client.auth.getSession()).data.session?.user?.email?.trim() ||
        '';

      if (!userEmail) {
        console.warn('Cannot store device token: no user logged in');
        return;
      }

      // Try to find existing token for this device
      const { data: existing, error: fetchError } = await this.supabase.client
        .from('device_tokens')
        .select('id')
        .eq('token', token.token)
        .eq('platform', token.platform)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error checking for existing token:', fetchError);
        return;
      }

      if (existing) {
        // Update existing token with new timestamp
        const { error: updateError } = await this.supabase.client
          .from('device_tokens')
          .update({
            last_seen_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating device token:', updateError);
        } else {
          console.log('Device token updated successfully');
          await this.setReceivePushForEmail(userEmail, true);
        }
      } else {
        // Insert new token
        const { error: insertError } = await this.supabase.client
          .from('device_tokens')
          .insert({
            user_email: userEmail,
            token: token.token,
            platform: token.platform,
            created_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error storing device token:', insertError);
        } else {
          console.log('Device token stored successfully');
          await this.setReceivePushForEmail(userEmail, true);
        }
      }
    } catch (error) {
      console.error('Error in storeDeviceToken:', error);
    }
  }

  /**
   * Set receive_push for a subscriber when they register a device (or turn push off).
   * Called with true when we successfully store a device token.
   */
  private async setReceivePushForEmail(email: string, value: boolean): Promise<void> {
    const { error } = await this.supabase.client
      .from('email_subscribers')
      .update({ receive_push: value })
      .eq('email', email.trim().toLowerCase());
    if (error) {
      console.warn('Could not update receive_push for subscriber:', error.message);
    }
  }

  /**
   * Get all device tokens for a user (admin use)
   * This would be used to send bulk notifications to all user devices
   */
  async getDeviceTokensForUser(email: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('device_tokens')
        .select('token, platform')
        .eq('user_email', email);

      if (error) {
        console.error('Error fetching device tokens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDeviceTokensForUser:', error);
      return [];
    }
  }

  /**
   * Clean up old device tokens (run periodically)
   * Removes tokens that haven't been seen in 30 days
   */
  async cleanupOldTokens(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await this.supabase.client
        .from('device_tokens')
        .delete()
        .lt('last_seen_at', thirtyDaysAgo.toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning up old tokens:', error);
        return 0;
      }

      console.log('Cleaned up old device tokens');
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('Error in cleanupOldTokens:', error);
      return 0;
    }
  }

  /**
   * Send a push notification to all subscribers who have receive_push enabled and the app installed.
   * Independent of is_active (email preference): a user can get push only, email only, both, or neither.
   * Failures are logged but do not throw.
   */
  async sendPushToSubscribers(params: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    try {
      const { data: subscribers, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('is_blocked', false)
        .eq('receive_push', true);

      if (fetchError) {
        console.error('Failed to fetch subscribers for push:', fetchError);
        return;
      }
      if (!subscribers?.length) return;

      const emails = subscribers.map((s: { email: string }) => s.email);
      const { error: invokeError } = await this.supabase.client.functions.invoke(
        'send-push-notification',
        {
          body: {
            emails,
            title: params.title,
            body: params.body,
            data: params.data ?? undefined,
          },
        }
      );

      if (invokeError) {
        console.error('Push notification send failed:', invokeError);
      }
    } catch (err) {
      console.error('Error sending push to subscribers:', err);
    }
  }

  /**
   * Send a push notification to specific emails (e.g. requester when their prayer/update is approved).
   * Only sends to addresses that have receive_push enabled and are not blocked.
   * Failures are logged but do not throw.
   */
  async sendPushToEmails(
    emails: string[],
    params: { title: string; body: string; data?: Record<string, string> }
  ): Promise<void> {
    const normalized = emails.map((e) => e?.trim().toLowerCase()).filter(Boolean);
    if (!normalized.length) return;
    try {
      const { data: rows, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .in('email', normalized)
        .eq('is_blocked', false)
        .eq('receive_push', true);

      if (fetchError) {
        console.error('Failed to fetch emails for push:', fetchError);
        return;
      }
      if (!rows?.length) return;

      const allowed = rows.map((r: { email: string }) => r.email);
      const { error: invokeError } = await this.supabase.client.functions.invoke(
        'send-push-notification',
        {
          body: {
            emails: allowed,
            title: params.title,
            body: params.body,
            data: params.data ?? undefined,
          },
        }
      );
      if (invokeError) {
        console.error('Push to requester/author failed:', invokeError);
      }
    } catch (err) {
      console.error('Error sending push to emails:', err);
    }
  }

  /**
   * Send a push notification to all admins who have receive_admin_push enabled.
   * Failures are logged but do not throw.
   */
  async sendPushToAdmins(params: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    try {
      const { data: admins, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('is_admin', true)
        .eq('receive_admin_push', true);

      if (fetchError) {
        console.error('Failed to fetch admins for push:', fetchError);
        return;
      }
      if (!admins?.length) return;

      const emails = admins.map((a: { email: string }) => a.email);
      const { error: invokeError } = await this.supabase.client.functions.invoke(
        'send-push-notification',
        {
          body: {
            emails,
            title: params.title,
            body: params.body,
            data: { ...params.data, target: 'admin' },
          },
        }
      );

      if (invokeError) {
        console.error('Admin push notification send failed:', invokeError);
      }
    } catch (err) {
      console.error('Error sending push to admins:', err);
    }
  }

  /**
   * Remove device token (user logs out)
   */
  async removeDeviceToken(): Promise<void> {
    try {
      const token = this.capacitor.getPushToken();
      if (!token) return;

      const { error } = await this.supabase.client
        .from('device_tokens')
        .delete()
        .eq('token', token.token);

      if (error) {
        console.error('Error removing device token:', error);
      } else {
        console.log('Device token removed');
      }
    } catch (error) {
      console.error('Error in removeDeviceToken:', error);
    }
  }
}
