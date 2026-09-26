// @ts-nocheck - Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0'
import { hashVerificationCode } from './verification-code-hash.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function generateCode(length: number = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += (bytes[i] % 10).toString();
  }
  return code;
}

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
    console.log('📧 Send verification code: Received request');

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
    const { email, actionType, actionData } = await req.json();

    // Validate inputs
    if (!email || !actionType || !actionData) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: 'email, actionType, and actionData are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate action type
    const validActionTypes = [
      'prayer_submission',
      'prayer_update',
      'deletion_request',
      'update_deletion_request',
      'status_change_request',
      'preference_change',
      'admin_login'
    ];
    if (!validActionTypes.includes(actionType)) {
      return new Response(JSON.stringify({
        error: 'Invalid action type',
        details: `Action type must be one of: ${validActionTypes.join(', ')}`
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get code length from settings (default: 6)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('verification_code_length, test_account_email, test_account_code_4, test_account_code_6, test_account_code_8')
      .eq('id', 1)
      .maybeSingle();

    const codeLength = settings?.verification_code_length || 6;
    const emailNormalized = email.toLowerCase().trim();
    const testAccountEmail = (settings?.test_account_email || '').trim().toLowerCase();
    const isTestAccount = testAccountEmail !== '' && emailNormalized === testAccountEmail;

    // Generate verification code (from DB for test account, random otherwise)
    let code: string;
    if (isTestAccount) {
      const code4 = (settings?.test_account_code_4 || '').trim();
      const code6 = (settings?.test_account_code_6 || '').trim();
      const code8 = (settings?.test_account_code_8 || '').trim();
      if (codeLength === 4 && code4) code = code4;
      else if (codeLength === 6 && code6) code = code6;
      else if (codeLength === 8 && code8) code = code8;
      else code = code4 || code6 || code8 || '1777';
    } else {
      code = generateCode(codeLength);
    }
    if (isTestAccount) {
      console.log(`✅ Using hardcoded test account code (no email sent)`);
    } else {
      console.log(`✅ Generated ${codeLength}-digit code`);
    }

    // Calculate expiry time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store a hash. The email still contains the code; the table does not.
    const codeHash = await hashVerificationCode(code, SUPABASE_SERVICE_ROLE_KEY);
    const { data: codeRecord, error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email: emailNormalized,
        code: codeHash,
        action_type: actionType,
        action_data: actionData,
        expires_at: expiresAt
      })
      .select('id, expires_at')
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to create verification code',
        details: insertError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log(`✅ Verification code stored: ${codeRecord.id}`);

    // Send verification email only for non-test accounts
    if (!isTestAccount) {
      // Fetch verification template from database
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', 'verification_code')
        .single();

      if (templateError || !template) {
        console.error('Template not found:', templateError?.message);
        // Continue anyway - code is still stored, send fallback email
      }

      // Prepare template variables
      const actionDescription = getActionDescription(actionType);
      const variables = {
        code: code,
        actionDescription: actionDescription
      };

      // Apply variables to template (or use fallback)
      let subject = `Your verification code: ${code}`;
      let htmlBody = generateVerificationHTML(code, actionType);
      let textBody = generateVerificationText(code, actionType);

      if (template) {
        subject = applyTemplateVariables(template.subject, variables);
        htmlBody = applyTemplateVariables(template.html_body, variables);
        textBody = applyTemplateVariables(template.text_body, variables);
      }

      // Send verification email via new unified email service
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject,
          htmlBody,
          textBody
        }
      });

      if (emailError) {
        console.error('❌ Email send error:', emailError);
        // Don't fail the whole request - code is already stored
        // User can still use it even if email fails
        console.warn('⚠️ Verification code created but email failed to send');
      } else {
        console.log('✅ Verification email sent');
      }
    } else {
      console.log('Test account: skipping email');
    }

    return new Response(JSON.stringify({
      success: true,
      codeId: codeRecord.id,
      expiresAt: codeRecord.expires_at
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});

function getActionDescription(actionType: string): string {
  const descriptions = {
    'prayer_submission': 'submit a prayer request',
    'prayer_update': 'add a prayer update',
    'deletion_request': 'request a prayer deletion',
    'update_deletion_request': 'request an update deletion',
    'status_change_request': 'request a status change',
    'preference_change': 'update your email preferences',
    'admin_login': 'sign in to the admin portal'
  };
  return descriptions[actionType] || 'perform an action';
}

/**
 * Replace template variables with actual values
 * Supports {{variableName}} syntax
 */
function applyTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
  }
  return result
}

function generateVerificationHTML(code: string, actionType: string): string {
  const actionDescription = getActionDescription(actionType);
  
  // Single-line HTML to avoid JSON encoding issues with Microsoft Graph API
  // Include code in text format for iOS/Safari autocomplete detection
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;"><tr><td align="center" style="padding: 20px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff;"><tr><td style="background-color: #4F46E5; padding: 30px 20px; text-align: center;"><h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold;">Verification Code</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">You requested to ${actionDescription}. Your verification code is: <strong>${code}</strong></p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;"><tr><td style="background-color: #667eea; padding: 30px; text-align: center;"><p style="margin: 0 0 15px 0; font-size: 14px; color: #ffffff; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p><p style="margin: 0; font-size: 48px; font-weight: bold; color: #ffffff; letter-spacing: 12px; font-family: Courier New, Courier, monospace;"><code>${code}</code></p></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background-color: #eff6ff; border-left: 4px solid #3b82f6;"><tr><td style="padding: 15px 20px;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #1e40af; font-size: 14px;">Easy Code Entry:</p><p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;"><strong>Your device should suggest the code automatically.</strong> Or copy the code above and paste it into the verification field.</p></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b;"><tr><td style="padding: 15px 20px;"><p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;"><strong>This code will expire in 15 minutes.</strong> If you did not request this code, you can safely ignore this email.</p></td></tr></table></td></tr><tr><td style="padding: 20px 30px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; text-align: center; color: #6b7280; font-size: 13px; line-height: 1.5;">This is an automated message from your Prayer App.<br>Please do not reply to this email.</p></td></tr></table></td></tr></table></body></html>`;
}

function generateVerificationText(code: string, actionType: string): string {
  const actionDescription = getActionDescription(actionType);
  
  return `
🔐 VERIFICATION CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You requested to ${actionDescription}.

Your verification code is: ${code}

YOUR CODE: ${code}

💡 Your device should suggest this code automatically when you tap the input field.

⏰ This code will expire in 15 minutes.

If you didn't request this code, you can safely ignore this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from your Prayer App.
Please do not reply to this email.
  `.trim();
}
