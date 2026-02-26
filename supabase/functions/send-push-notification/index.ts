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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getToken } from 'https://deno.land/x/google_jwt_sa@v0.2.5/mod.ts';
import { createAppleNotificationJwt } from 'jsr:@narumincho/apple-notification-jwt@0.1.0';

// Required when invoking from browser or Capacitor (origin capacitor://localhost)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400'
};

interface PushNotificationRequest {
  emails?: string[];
  sendToAll?: boolean;
  title: string;
  body: string;
  data?: Record<string, string>;
  platform?: 'ios' | 'android' | 'both';
}

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

/** FCM HTTP v1 requires all data values to be strings. */
function stringifyData(data: Record<string, string> | undefined): Record<string, string> {
  if (!data) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
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
  title: string,
  body: string,
  dataPayload: Record<string, string>
): Promise<{ ok: boolean; errorData?: unknown }> {
  const jwt = await getApnsJwt();
  const host = apnsSandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const url = `https://${host}/3/device/${encodeURIComponent(deviceToken)}`;
  const aps: Record<string, unknown> = {
    alert: { title, body },
    sound: 'default',
  };
  const bodyObj: Record<string, unknown> = { aps };
  for (const [k, v] of Object.entries(dataPayload)) {
    bodyObj[k] = v;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${jwt}`,
      'apns-topic': apnsBundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify(bodyObj),
  });
  if (res.ok) return { ok: true };
  const errorData = await res.json().catch(() => ({}));
  return { ok: false, errorData };
}

serve(async (req) => {
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
    const payload: PushNotificationRequest = await req.json();

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.emails && !payload.sendToAll) {
      return new Response(
        JSON.stringify({ error: 'emails or sendToAll is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const platform = payload.platform || 'both';

    let query = supabase.from('device_tokens').select('id, token, platform, user_email');
    if (!payload.sendToAll && payload.emails) {
      query = query.in('user_email', payload.emails);
    }
    if (platform !== 'both') {
      query = query.eq('platform', platform);
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

    const dataPayload = stringifyData(payload.data);
    let successCount = 0;
    let failureCount = 0;
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
        title: payload.title,
        body: payload.body,
        data: payload.data ?? undefined,
        user_email: tokenRecord.user_email,
      };

      try {
        if (tokenRecord.platform === 'ios') {
          // iOS: Capacitor gives APNs device token → send via APNs
          const result = await sendViaApns(
            tokenRecord.token,
            payload.title,
            payload.body,
            dataPayload
          );
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

        const message = {
          token: tokenRecord.token,
          notification: { title: payload.title, body: payload.body },
          data: Object.keys(dataPayload).length ? dataPayload : undefined,
          android: {
            priority: 'high' as const,
            notification: { channelId: 'prayers' },
          },
        };

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
