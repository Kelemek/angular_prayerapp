/**
 * Supabase Edge Function for sending push notifications.
 *
 * - Android: FCM HTTP v1 API (Firebase service account). Token from device is FCM token.
 * - iOS: APNs HTTP/2 API (.p8 key). Token from Capacitor is APNs device token (not FCM).
 *
 * Deploy: supabase functions deploy send-push-notification
 *
 * Usage example:
 * const result = await supabase.functions.invoke('send-push-notification', {
 *   body: {
 *     emails: ['user@example.com'],
 *     title: 'Prayer Updated',
 *     body: 'Your prayer request has been updated',
 *     data: { type: 'prayer_update', prayerId: '123' }
 *   }
 * });
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { getToken } from 'https://deno.land/x/google_jwt_sa@v0.2.5/mod.ts';
import { createAppleNotificationJwt } from 'jsr:@narumincho/apple-notification-jwt@0.1.0';
import { jwtRole } from '../send-email/access.ts';
import {
  adminPushRecipientEmails,
  allAdminRecipientEmails,
  decidePushAccess,
  isPushServiceRoleCaller,
  type PushCallerKind,
} from './access.ts';
import { computeIconBadge, type IconBadgeReport } from './badge.ts';
import {
  buildApnsRequest,
  buildFcmMessage,
  logContent,
  parsePushRequest,
  type PushRequest,
} from './payload.ts';

// Required when invoking from browser or Capacitor (origin capacitor://localhost)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const fcmServiceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON') || '';

const supabase = createClient(supabaseUrl, supabaseKey);

/** Get OAuth2 access token for FCM using service account (HTTP v1). */
async function getFcmAccessToken(): Promise<string> {
  if (!fcmServiceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON secret is not set');
  }
  const token = await getToken(fcmServiceAccountJson, {
    scope: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  if (!token?.access_token) {
    throw new Error('Failed to get FCM access token');
  }
  return token.access_token;
}

/** Get Firebase project ID from service account JSON. */
function getFcmProjectId(): string {
  if (!fcmServiceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON secret is not set');
  }
  const sa = JSON.parse(fcmServiceAccountJson) as { project_id?: string };
  if (!sa?.project_id) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON must contain project_id');
  }
  return sa.project_id;
}

// --- APNs (iOS): Capacitor gives APNs device token, not FCM token ---
const apnsKeyP8 = Deno.env.get('APNS_KEY_P8') || '';
const apnsKeyId = Deno.env.get('APNS_KEY_ID') || '';
const apnsTeamId = Deno.env.get('APNS_TEAM_ID') || '';
const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') || 'com.prayerapp.mobile';
const apnsSandbox = Deno.env.get('APNS_USE_SANDBOX') !== 'false'; // default true for dev builds

let cachedApnsJwt: { jwt: string; exp: number } | null = null;

/** Create or reuse APNs JWT (valid ~60 min; reuse within 20 min recommended). */
async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && cachedApnsJwt.exp > now + 20 * 60) {
    return cachedApnsJwt.jwt;
  }
  if (!apnsKeyP8 || !apnsKeyId || !apnsTeamId) {
    throw new Error('APNS_KEY_P8, APNS_KEY_ID, and APNS_TEAM_ID must be set for iOS push');
  }
  const secret = apnsKeyP8.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const jwt = await createAppleNotificationJwt({
    secret,
    iat: new Date(),
    iss: apnsTeamId,
    kid: apnsKeyId,
  });
  cachedApnsJwt = { jwt, exp: now + 55 * 60 };
  return jwt;
}

/** Send one notification via APNs (iOS device token). */
async function sendViaApns(
  deviceToken: string,
  request: PushRequest,
  badge: number | null,
): Promise<{ ok: boolean; errorData?: unknown }> {
  const jwt = await getApnsJwt();
  const host = apnsSandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const url = `https://${host}/3/device/${encodeURIComponent(deviceToken)}`;
  const apns = buildApnsRequest(request, badge);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${jwt}`,
      'apns-topic': apnsBundleId,
      ...apns.headers,
      'content-type': 'application/json',
    },
    body: JSON.stringify(apns.body),
  });
  if (res.ok) return { ok: true };
  const errorData = await res.json().catch(() => ({}));
  return { ok: false, errorData };
}

async function resolvePushCaller(req: Request): Promise<PushCallerKind> {
  const header = req.headers.get('Authorization') ?? '';
  if (isPushServiceRoleCaller(header, req.headers.get('apikey'), supabaseKey)) {
    return 'service_role';
  }
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const role = token ? jwtRole(token) : null;
  if (role !== 'authenticated' || !supabaseUrl || !supabaseKey) return 'anonymous';

  const userClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY') || supabaseKey,
    { global: { headers: { Authorization: header } } }
  );
  const { data: userData } = await userClient.auth.getUser();
  const email = userData?.user?.email?.toLowerCase().trim();
  if (!email) return 'anonymous';

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
    user_email: email,
  });
  if (adminError) {
    console.error('admin check failed:', adminError);
    return 'anonymous';
  }
  if (isAdmin === true) return 'admin';

  const { data: subscriber, error: subscriberError } = await supabase
    .from('email_subscribers')
    .select('is_blocked')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();
  if (subscriberError) {
    console.error('subscriber check failed:', subscriberError);
    return 'anonymous';
  }
  if (subscriber && subscriber.is_blocked !== true) return 'subscriber';
  return 'anonymous';
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function distinctLowerEmails(tokens: { user_email: string | null }[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const token of tokens) {
    const email = token.user_email?.trim().toLowerCase() ?? '';
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

function reportFromRow(row: {
  icon_unread: number | null;
  icon_badges_enabled: boolean | null;
  icon_reported_at: string | null;
}): IconBadgeReport {
  if (!row.icon_reported_at) return null;
  const unread = typeof row.icon_unread === 'number' && Number.isFinite(row.icon_unread)
    ? row.icon_unread
    : 0;
  return {
    unread,
    badgesEnabled: row.icon_badges_enabled === true,
    reportedAt: row.icon_reported_at,
  };
}

function finiteCount(data: unknown): number | null {
  return typeof data === 'number' && Number.isFinite(data) ? data : null;
}

/** Per recipient email. Null omits the badge so a lookup failure still sends the push. */
async function loadIconBadges(
  tokens: { user_email: string | null }[],
): Promise<Map<string, number | null>> {
  const emails = distinctLowerEmails(tokens);
  const badges = new Map<string, number | null>();
  for (const email of emails) badges.set(email, null);
  if (emails.length === 0) return badges;

  try {
    const { data: rows, error: rowError } = await supabase
      .from('user_badge_read_state')
      .select('user_email, icon_unread, icon_badges_enabled, icon_reported_at')
      .in('user_email', emails);
    if (rowError) {
      console.error('icon badge state lookup failed:', rowError);
      return badges;
    }

    const reports = new Map<string, IconBadgeReport>();
    for (const row of rows ?? []) {
      const email = row.user_email?.trim().toLowerCase();
      if (!email) continue;
      reports.set(email, reportFromRow(row));
    }

    const { data: subscribers, error: adminError } = await supabase
      .from('email_subscribers')
      .select('email, is_admin')
      .eq('is_admin', true);
    if (adminError) {
      console.error('icon badge admin lookup failed:', adminError);
      return badges;
    }

    const recipients = new Set(emails);
    const admins = new Set<string>();
    for (const row of subscribers ?? []) {
      const email = row.email?.trim().toLowerCase();
      if (email && recipients.has(email)) admins.add(email);
    }

    let pendingTotal = 0;
    let pendingOk = true;
    if (admins.size > 0) {
      const { data, error } = await supabase.rpc('admin_pending_item_total');
      const count = finiteCount(data);
      if (error || count === null) {
        console.error('admin_pending_item_total failed:', error ?? data);
        pendingOk = false;
      } else {
        pendingTotal = count;
      }
    }

    await Promise.all(emails.map(async (email) => {
      const report = reports.get(email) ?? null;
      if (report === null) return;
      const isAdmin = admins.has(email);
      if (isAdmin && !pendingOk) return;
      try {
        const { data, error } = await supabase.rpc('icon_badge_new_since', {
          p_email: email,
          p_since: report.reportedAt,
        });
        const newSince = finiteCount(data);
        if (error || newSince === null) {
          console.error('icon_badge_new_since failed:', email, error ?? data);
          return;
        }
        badges.set(email, computeIconBadge(report, isAdmin, newSince, pendingTotal));
      } catch (error) {
        console.error('icon_badge_new_since failed:', email, error);
      }
    }));
  } catch (error) {
    console.error('icon badge lookup failed:', error);
  }
  return badges;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const request = parsePushRequest(await req.json());
    if ('error' in request) {
      return json({ error: request.error }, 400);
    }
    const sendToAll = request.kind === 'alert' && request.sendToAll;

    const access = decidePushAccess(await resolvePushCaller(req), request);
    if (access === 'deny') {
      return json({ error: 'Not authorized' }, 403);
    }

    const requested = request.kind === 'alert' ? request.emails : undefined;
    let recipientEmails = requested;
    if (access !== 'raw') {
      const { data: admins, error: adminFetchError } = await supabase
        .from('email_subscribers')
        .select('email, receive_admin_push, is_blocked')
        .eq('is_admin', true);
      if (adminFetchError) {
        console.error('admin push recipient lookup failed:', adminFetchError);
        return json({ error: 'Failed to load recipients' }, 500);
      }
      recipientEmails = access === 'all_admins'
        ? allAdminRecipientEmails(admins ?? [])
        : adminPushRecipientEmails(requested ?? [], admins ?? []);
    }
    if (!sendToAll && recipientEmails?.length === 0) {
      return json({ message: 'No device tokens found', sent: 0, failed: 0 }, 200);
    }

    let query = supabase.from('device_tokens').select('id, token, platform, user_email');
    if (!sendToAll && recipientEmails) {
      query = query.in('user_email', recipientEmails);
    }
    if (request.platform !== 'both') {
      query = query.eq('platform', request.platform);
    }

    const { data: tokens, error: queryError } = await query;

    if (queryError) {
      console.error('Error querying device tokens:', queryError);
      return new Response(
        JSON.stringify({
          error: 'Failed to retrieve device tokens',
          detail: queryError.message,
          code: queryError.code,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No device tokens found', sent: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const iconBadges = await loadIconBadges(tokens);
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    let firstFailureReason: string | null = null;

    // FCM only for Android (token is FCM token)
    let fcmAccessToken: string | null = null;
    let fcmUrl: string | null = null;
    const hasAndroid = tokens.some((t) => t.platform === 'android');
    if (hasAndroid && fcmServiceAccountJson) {
      try {
        const projectId = getFcmProjectId();
        fcmAccessToken = await getFcmAccessToken();
        fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      } catch (e) {
        console.error('FCM setup failed:', e);
      }
    }

    for (const tokenRecord of tokens) {
      const logRow = {
        device_token_id: tokenRecord.id,
        ...logContent(request),
        user_email: tokenRecord.user_email,
      };

      const badgeEmail = tokenRecord.user_email?.trim().toLowerCase() ?? '';
      const badge = iconBadges.get(badgeEmail) ?? null;
      if (request.kind === 'badge_only' && badge === null) {
        skippedCount++;
        continue;
      }

      try {
        if (tokenRecord.platform === 'ios') {
          // iOS: Capacitor gives APNs device token → send via APNs
          const result = await sendViaApns(tokenRecord.token, request, badge);
          if (result.ok) {
            successCount++;
            await supabase.from('push_notification_log').insert({
              ...logRow,
              delivery_status: 'sent',
            });
          } else {
            failureCount++;
            const errStr =
              result.errorData != null && typeof result.errorData === 'object'
                ? JSON.stringify(result.errorData)
                : String(result.errorData);
            if (!firstFailureReason) firstFailureReason = errStr;
            console.error('APNs send failed for token:', result.errorData);
            await supabase.from('push_notification_log').insert({
              ...logRow,
              delivery_status: 'failed',
              error_message: errStr,
            });
          }
          continue;
        }

        // Android: token is FCM token → send via FCM
        if (!fcmUrl || !fcmAccessToken) {
          failureCount++;
          const errStr = 'FCM not configured (FCM_SERVICE_ACCOUNT_JSON or FCM token missing)';
          if (!firstFailureReason) firstFailureReason = errStr;
          await supabase.from('push_notification_log').insert({
            ...logRow,
            delivery_status: 'failed',
            error_message: errStr,
          });
          continue;
        }

        const message = buildFcmMessage(tokenRecord.token, request, badge);

        const fcmResponse = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fcmAccessToken}`,
          },
          body: JSON.stringify({ message }),
        });

        if (fcmResponse.ok) {
          successCount++;
          await supabase.from('push_notification_log').insert({
            ...logRow,
            delivery_status: 'sent',
          });
        } else {
          failureCount++;
          const errorData = await fcmResponse.json().catch(() => ({}));
          const errStr =
            typeof errorData === 'object' ? JSON.stringify(errorData) : String(errorData);
          if (!firstFailureReason) firstFailureReason = errStr;
          console.error('FCM send failed for token:', errorData);
          await supabase.from('push_notification_log').insert({
            ...logRow,
            delivery_status: 'failed',
            error_message: errStr,
          });
        }
      } catch (err) {
        failureCount++;
        const errStr = err instanceof Error ? err.message : String(err);
        if (!firstFailureReason) firstFailureReason = errStr;
        console.error('Error sending notification:', err);
        await supabase.from('push_notification_log').insert({
          ...logRow,
          delivery_status: 'failed',
          error_message: errStr,
        });
      }
    }

    const body: Record<string, unknown> = {
      message: 'Push notification send complete',
      total: tokens.length,
      sent: successCount,
      failed: failureCount,
      skipped: skippedCount,
    };
    if (firstFailureReason) body.failureReason = firstFailureReason;

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
