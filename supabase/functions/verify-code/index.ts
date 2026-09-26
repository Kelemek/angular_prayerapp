// @ts-nocheck - Deno Edge Function
import { hashVerificationCode, verificationCodesMatch } from './verification-code-hash.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CODE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  try {
    console.log('🔐 Verify code: Received request');

    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Parse request body
    const { codeId, code } = await req.json();

    // Validate inputs
    if (!codeId || !code) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: 'codeId and code are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate code format (4, 6, or 8 digits)
    if (!/^\d{4,8}$/.test(code)) {
      return new Response(JSON.stringify({
        error: 'Invalid code format',
        details: 'Code must be 4, 6, or 8 digits'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (!CODE_ID_PATTERN.test(codeId)) {
      return new Response(JSON.stringify({
        error: 'Invalid verification code',
        details: 'The code you entered is incorrect'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log(`🔍 Looking up verification code: ${codeId}`);

    const fetchResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(codeId)}&select=id,email,code,action_type,action_data,expires_at,used_at`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!fetchResponse.ok) {
      const error = await fetchResponse.text();
      console.error('❌ Database error:', error);
      throw new Error(`Database error: ${error}`);
    }

    const records = await fetchResponse.json();

    // Check if code exists
    if (!records || records.length === 0) {
      console.log('❌ Invalid code or code ID');
      return new Response(JSON.stringify({
        error: 'Invalid verification code',
        details: 'The code you entered is incorrect'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const verificationRecord = records[0];
    const computedHash = await hashVerificationCode(code, SUPABASE_SERVICE_ROLE_KEY);
    if (!verificationCodesMatch(String(verificationRecord.code ?? ''), computedHash)) {
      console.log('❌ Invalid code or code ID');
      return new Response(JSON.stringify({
        error: 'Invalid verification code',
        details: 'The code you entered is incorrect'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Check if code has already been used
    if (verificationRecord.used_at) {
      console.log('❌ Code already used');
      return new Response(JSON.stringify({
        error: 'Code already used',
        details: 'This verification code has already been used'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Check if code has expired
    const expiresAt = new Date(verificationRecord.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      console.log('❌ Code expired');
      return new Response(JSON.stringify({
        error: 'Code expired',
        details: 'This verification code has expired. Please request a new one.'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log(`✅ Code verified for action type: ${verificationRecord.action_type}`);

    // Mark code as used
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${codeId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          used_at: new Date().toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to mark code as used:', error);
      // Don't fail the request if we can't mark it as used
    } else {
      console.log('✅ Code marked as used');
    }

    // Clean up expired codes while we're here
    const cleanupResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/cleanup_expired_verification_codes`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!cleanupResponse.ok) {
      const error = await cleanupResponse.text();
      console.warn('⚠️ Cleanup function failed (non-critical):', error);
      // Don't fail the request if cleanup fails - it's not critical
    } else {
      console.log('✅ Cleaned up expired verification codes');
    }

    // If test account completed admin login, notify admins (fire-and-forget)
    const emailNormalized = (verificationRecord.email || '').toLowerCase().trim();
    let testAccountEmail = '';
    try {
      const settingsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_settings?id=eq.1&select=test_account_email`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Accept': 'application/json'
          }
        }
      );
      if (settingsRes.ok) {
        const settingsRows = await settingsRes.json();
        testAccountEmail = (settingsRows?.[0]?.test_account_email || '').trim().toLowerCase();
      }
    } catch (_) {
      // non-critical
    }
    if (testAccountEmail !== '' && verificationRecord.action_type === 'admin_login' && emailNormalized === testAccountEmail) {
      try {
        const adminsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/email_subscribers?is_admin=eq.true&receive_admin_emails=eq.true&select=email`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Accept': 'application/json'
            }
          }
        );
        if (adminsRes.ok) {
          const admins = await adminsRes.json();
          const adminEmails = Array.isArray(admins) ? admins.map((a: { email: string }) => a.email).filter(Boolean) : [];
          if (adminEmails.length > 0) {
            const subject = 'Test account logged into the prayer app';
            const htmlBody = `<p>The test account <strong>${testAccountEmail}</strong> was used to sign in to the prayer app.</p><p>Time: ${new Date().toISOString()}</p>`;
            const textBody = `The test account ${testAccountEmail} was used to sign in to the prayer app. Time: ${new Date().toISOString()}`;
            const invokeRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ to: adminEmails, subject, htmlBody, textBody })
            });
            if (!invokeRes.ok) {
              console.warn('⚠️ Test account admin notification: send-email failed', await invokeRes.text());
            } else {
              console.log('✅ Test account admin notification sent to', adminEmails.length, 'admin(s)');
            }
          }
        }
      } catch (notifyErr) {
        console.warn('⚠️ Test account admin notification failed (non-critical):', notifyErr);
      }
    }

    // Return the action data
    return new Response(JSON.stringify({
      success: true,
      actionType: verificationRecord.action_type,
      actionData: verificationRecord.action_data,
      email: verificationRecord.email,
      message: 'Email verified successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Error in verify-code:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
