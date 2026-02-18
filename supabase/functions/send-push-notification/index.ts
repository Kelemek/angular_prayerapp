/**
 * Supabase Edge Function for sending push notifications via Firebase Cloud Messaging
 * 
 * This function is called when you want to send push notifications to app users.
 * It retrieves device tokens and sends notifications via FCM.
 * 
 * Deploy with: supabase functions deploy send-push-notification
 * 
 * Usage example:
 * const result = await supabase.functions.invoke('send-push-notification', {
 *   body: {
 *     emails: ['user@example.com'],
 *     title: 'Prayer Updated',
 *     body: 'Your prayer request has been updated',
 *     data: {
 *       type: 'prayer_update',
 *       prayerId: '123'
 *     }
 *   }
 * });
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushNotificationRequest {
  emails?: string[]; // Send to specific users
  sendToAll?: boolean; // Send to all users
  title: string;
  body: string;
  data?: Record<string, string>;
  platform?: 'ios' | 'android' | 'both'; // Default: both
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') || ''; // Firebase Server Key

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload: PushNotificationRequest = await req.json();

    // Validate input
    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400 }
      );
    }

    if (!payload.emails && !payload.sendToAll) {
      return new Response(
        JSON.stringify({ error: 'emails or sendToAll is required' }),
        { status: 400 }
      );
    }

    const platform = payload.platform || 'both';

    // Query device tokens
    let query = supabase.from('device_tokens').select('token, platform, user_email');

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
        JSON.stringify({ error: 'Failed to retrieve device tokens' }),
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No device tokens found',
          sent: 0,
          failed: 0
        }),
        { status: 200 }
      );
    }

    // Send notifications via FCM
    let successCount = 0;
    let failureCount = 0;

    for (const tokenRecord of tokens) {
      try {
        const notificationPayload = {
          notification: {
            title: payload.title,
            body: payload.body,
            sound: 'default'
          },
          data: payload.data || {},
          token: tokenRecord.token,
          android: {
            priority: 'high',
            notification: {
              channelId: 'prayers' // Match channel created in app
            }
          },
          apns: {
            headers: {
              'apns-priority': '10'
            }
          }
        };

        // Send via FCM
        const fcmResponse = await fetch(
          'https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${fcmServerKey}`
            },
            body: JSON.stringify({
              message: notificationPayload
            })
          }
        );

        if (fcmResponse.ok) {
          successCount++;

          // Log successful send
          await supabase.from('push_notification_log').insert({
            device_token_id: tokenRecord.id,
            title: payload.title,
            body: payload.body,
            data: payload.data,
            delivery_status: 'sent',
            user_email: tokenRecord.user_email
          });
        } else {
          failureCount++;
          const errorData = await fcmResponse.json();
          console.error(`Failed to send to ${tokenRecord.token}:`, errorData);

          // Log failed send
          await supabase.from('push_notification_log').insert({
            device_token_id: tokenRecord.id,
            title: payload.title,
            body: payload.body,
            data: payload.data,
            delivery_status: 'failed',
            error_message: JSON.stringify(errorData),
            user_email: tokenRecord.user_email
          });
        }
      } catch (error) {
        failureCount++;
        console.error('Error sending notification:', error);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Push notification send complete',
        total: tokens.length,
        sent: successCount,
        failed: failureCount
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
});

/**
 * SETUP INSTRUCTIONS:
 * 
 * 1. Get FCM Server Key:
 *    - Go to Firebase Console → Your Project → Project Settings
 *    - Go to Cloud Messaging tab
 *    - Copy Server Key
 * 
 * 2. Set environment variables in Supabase:
 *    supabase secrets set FCM_SERVER_KEY "your_fcm_key_here"
 * 
 * 3. Deploy function:
 *    supabase functions deploy send-push-notification
 * 
 * 4. Create database tables (see device_tokens_schema.sql)
 * 
 * 5. Test the function via Supabase dashboard or your app
 */
