// @ts-nocheck - Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform'
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

    console.log(`🔍 Looking up verification code: ${codeId}`);

    // Fetch the verification code from database
    const fetchResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${codeId}&code=eq.${code}&select=*`,
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
