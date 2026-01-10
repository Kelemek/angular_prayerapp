/**
 * Email Queue Processor
 * Runs scheduled from GitHub Actions to process queued emails
 * Sends emails one per recipient to improve deliverability
 */

import { createClient } from '@supabase/supabase-js';

interface EmailQueueItem {
  id: string;
  recipient: string;
  template_key: string;
  template_variables: Record<string, string>;
  status: string;
  attempts: number;
  last_error: string | null;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string;
}

// Configuration
const BATCH_SIZE = 20;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000; // Start with 1 second
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

// Validation
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'MAIL_SENDER_ADDRESS'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

let cachedToken: { token: string; expires: number } | null = null;

/**
 * Get OAuth access token from Microsoft Identity Platform
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expires - 300000) {
    console.log('✅ Using cached access token');
    return cachedToken.token;
  }

  console.log('🔑 Acquiring new access token...');

  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID!,
    client_secret: process.env.AZURE_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to acquire token: ${response.status} ${error}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };

  // Cache token (expires_in is in seconds, typically 3600)
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + data.expires_in * 1000
  };

  console.log('✅ Access token acquired');
  return data.access_token;
}

/**
 * Send single email via Microsoft Graph API
 */
async function sendViaGraphAPI(
  token: string,
  recipient: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<void> {
  const message = {
    message: {
      subject,
      body: {
        contentType: htmlBody ? 'html' : 'text',
        content: htmlBody || textBody || ''
      },
      from: {
        emailAddress: {
          address: process.env.MAIL_SENDER_ADDRESS,
          name: process.env.MAIL_FROM_NAME || 'Prayer Ministry'
        }
      },
      toRecipients: [
        {
          emailAddress: { address: recipient }
        }
      ],
      // Add List-Unsubscribe header for compliance (RFC 8058)
      // Email clients will show an "Unsubscribe" button
      internetMessageHeaders: [
        {
          name: 'List-Unsubscribe',
          value: `<mailto:${process.env.MAIL_SENDER_ADDRESS}?subject=unsubscribe>`
        }
      ]
    },
    saveToSentItems: true
  };

  const url = `${GRAPH_API_BASE}/users/${encodeURIComponent(
    process.env.MAIL_SENDER_ADDRESS!
  )}/sendMail`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Graph API error for ${recipient}:`, {
      status: response.status,
      statusText: response.statusText,
      error
    });

    // Check for rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 30000;
      console.log(`⏳ Rate limited. Retrying after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      throw new Error(`Graph API rate limited (429)`);
    }

    throw new Error(`Graph API sendMail failed: ${response.status} ${error}`);
  }

  console.log(`✅ Email sent to ${recipient}`);
}

/**
 * Apply template variables to content
 */
function applyTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  return result;
}

/**
 * Fetch email template from database
 */
async function getTemplate(templateKey: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single();

  if (error) {
    console.error(`Error fetching template ${templateKey}:`, error);
    return null;
  }

  return data;
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempts: number): number {
  // 1s, 2s, 4s, 8s, 16s, etc.
  return RETRY_DELAY_MS * Math.pow(2, attempts);
}

/**
 * Process a single email from the queue
 */
async function processEmail(
  token: string,
  email: EmailQueueItem
): Promise<boolean> {
  try {
    console.log(
      `📧 Processing email ${email.id} to ${email.recipient} (attempt ${email.attempts + 1}/${MAX_RETRIES})`
    );

    // Fetch template
    const template = await getTemplate(email.template_key);
    if (!template) {
      throw new Error(`Template not found: ${email.template_key}`);
    }

    // Apply variables
    const subject = applyTemplateVariables(template.subject, email.template_variables);
    const htmlBody = applyTemplateVariables(
      template.html_body,
      email.template_variables
    );
    const textBody = applyTemplateVariables(
      template.text_body,
      email.template_variables
    );

    // Send email
    await sendViaGraphAPI(token, email.recipient, subject, htmlBody, textBody);

    // Delete from queue on success
    const { error: deleteError } = await supabase
      .from('email_queue')
      .delete()
      .eq('id', email.id);

    if (deleteError) {
      console.error(`Error deleting email from queue: ${email.id}`, deleteError);
      throw deleteError;
    }

    console.log(`✅ Email processed and removed from queue: ${email.id}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const attempts = email.attempts + 1;

    console.error(`❌ Error processing email ${email.id}:`, errorMessage);

    // Check if we should retry
    if (attempts < MAX_RETRIES) {
      console.log(
        `🔄 Will retry (${attempts}/${MAX_RETRIES}), queuing for next batch`
      );

      // Update with error info
      const { error: updateError } = await supabase
        .from('email_queue')
        .update({
          attempts,
          last_error: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', email.id);

      if (updateError) {
        console.error(`Error updating queue item: ${email.id}`, updateError);
      }

      return false;
    }

    // Max retries exceeded - mark as failed
    console.log(
      `❌ Max retries exceeded for ${email.id}, marking as failed`
    );
    const { error: updateError } = await supabase
      .from('email_queue')
      .update({
        status: 'failed',
        attempts,
        last_error: `${errorMessage} (max retries exceeded)`,
        updated_at: new Date().toISOString()
      })
      .eq('id', email.id);

    if (updateError) {
      console.error(`Error marking email as failed: ${email.id}`, updateError);
    }

    return false;
  }
}

/**
 * Main processor function
 */
async function processEmailQueue(): Promise<void> {
  console.log('🚀 Starting email queue processor...');

  try {
    // Get access token
    const token = await getAccessToken();

    // Fetch batch of pending emails
    const { data: queueItems, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      throw new Error(`Failed to fetch email queue: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('✅ No pending emails in queue');
      return;
    }

    console.log(`📬 Found ${queueItems.length} email(s) to process`);

    // Process each email
    let successCount = 0;
    let failureCount = 0;

    for (const email of queueItems) {
      const success = await processEmail(token, email as EmailQueueItem);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(
      `\n📊 Batch complete: ${successCount} sent, ${failureCount} failed/retry`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Fatal error in email processor:', message);
    process.exit(1);
  }
}

// Run processor
processEmailQueue();
