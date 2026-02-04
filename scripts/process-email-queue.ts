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
  template_variables: Record<string, string | null | undefined>;
  status: string;
  attempts: number;
  last_error: string | null;
  processing_started_at?: string;
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
const templateCache = new Map<string, EmailTemplate>();

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
      // Must be prefixed with 'x-' for Microsoft Graph API
      // Email clients will show an "Unsubscribe" button
      internetMessageHeaders: [
        {
          name: 'x-List-Unsubscribe',
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
  variables: Record<string, string | null | undefined>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    result = result.replace(placeholder, stringValue);
  }
  return result;
}

/**
 * Lock emails for processing by marking them as "processing"
 * Prevents concurrent instances from processing the same emails
 */
async function lockEmailsForProcessing(emailIds: string[]): Promise<void> {
  if (emailIds.length === 0) {
    return;
  }

  console.log(`🔒 Locking ${emailIds.length} email(s) for processing...`);

  const { error: lockError } = await supabase
    .from('email_queue')
    .update({
      status: 'processing',
      processing_started_at: new Date().toISOString()
    })
    .in('id', emailIds);

  if (lockError) {
    throw new Error(`Failed to lock emails for processing: ${lockError.message}`);
  }

  console.log(`✅ Emails locked: ${emailIds.length}`);
}

/**
 * Extract unique template keys from a batch of queue items
 */
function getUniqueTemplateKeys(queueItems: EmailQueueItem[]): string[] {
  const keys = new Set(queueItems.map(item => item.template_key));
  return Array.from(keys);
}

/**
 * Prefetch multiple templates from database
 */
async function prefetchTemplates(templateKeys: string[]): Promise<void> {
  // Filter to only fetch templates not already cached
  const keysToFetch = templateKeys.filter(key => !templateCache.has(key));
  
  if (keysToFetch.length === 0) {
    console.log(`📦 All ${templateKeys.length} template(s) already cached`);
    return;
  }

  console.log(`📥 Prefetching ${keysToFetch.length} template(s) from database...`);

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .in('template_key', keysToFetch);

  if (error) {
    throw new Error(`Failed to prefetch templates: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`Database query returned no templates for keys: ${keysToFetch.join(', ')}. Check that email_templates table exists and contains these template keys.`);
  }

  // Validate all requested templates were found
  const fetchedKeys = new Set(data.map(t => t.template_key));
  const missingKeys = keysToFetch.filter(key => !fetchedKeys.has(key));

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing email templates in database. Not found: ${missingKeys.join(', ')}. ` +
      `This will cause emails to fail. Verify these template_key values exist in email_templates table.`
    );
  }

  // Cache all fetched templates
  for (const template of data) {
    templateCache.set(template.template_key, template);
  }

  console.log(`✅ Cached ${data.length} template(s): ${data.map(t => t.template_key).join(', ')}`);
}

/**
 * Get template from cache (must be prefetched first)
 */
function getTemplate(templateKey: string): EmailTemplate | null {
  const template = templateCache.get(templateKey);
  if (!template) {
    console.error(`Template not found in cache: ${templateKey}`);
    return null;
  }
  return template;
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

    // Get template from cache (should already be prefetched)
    const template = getTemplate(email.template_key);
    if (!template) {
      throw new Error(`Template not found in cache: ${email.template_key}`);
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

      // Update with error info and reset status to pending for next run
      const { error: updateError } = await supabase
        .from('email_queue')
        .update({
          status: 'pending',
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

    // Max retries exceeded - delete the email from queue
    console.log(
      `❌ Max retries exceeded for ${email.id}, deleting from queue`
    );
    const { error: deleteError } = await supabase
      .from('email_queue')
      .delete()
      .eq('id', email.id);

    if (deleteError) {
      console.error(`Error deleting failed email from queue: ${email.id}`, deleteError);
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

    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    let batchNumber = 0;

    // Keep processing batches until queue is empty
    while (true) {
      batchNumber++;
      console.log(`\n📬 Fetching batch ${batchNumber}...`);

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
        break;
      }

      console.log(`📧 Found ${queueItems.length} email(s) in batch ${batchNumber}`);

      // Lock these emails for processing (prevent concurrent duplicate sends)
      const emailIds = (queueItems as EmailQueueItem[]).map(item => item.id);
      await lockEmailsForProcessing(emailIds);

      // Prefetch all unique templates for this batch
      const templateKeys = getUniqueTemplateKeys(queueItems as EmailQueueItem[]);
      await prefetchTemplates(templateKeys);

      // Process each email
      let batchSuccessCount = 0;
      let batchFailureCount = 0;

      for (const email of queueItems) {
        const success = await processEmail(token, email as EmailQueueItem);
        if (success) {
          batchSuccessCount++;
        } else {
          batchFailureCount++;
        }

        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      totalSuccessCount += batchSuccessCount;
      totalFailureCount += batchFailureCount;

      console.log(
        `✅ Batch ${batchNumber} complete: ${batchSuccessCount} sent, ${batchFailureCount} failed/retry`
      );

      // If batch was smaller than BATCH_SIZE, we've processed everything
      if (queueItems.length < BATCH_SIZE) {
        console.log('✅ All emails processed');
        break;
      }

      // Pause between batches to respect Graph API rate limits
      // Microsoft Graph API allows up to 2000 requests per minute per app
      // A 2 second delay between batches is reasonable and shouldn't impact processing speed
      const pauseDuration = 2000; // 2 seconds
      console.log(`⏸️  Pausing ${pauseDuration}ms between batches...`);
      await new Promise(resolve => setTimeout(resolve, pauseDuration));
    }

    console.log(
      `\n📊 Processing complete: ${totalSuccessCount} sent, ${totalFailureCount} failed/retry`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Fatal error in email processor:', message);
    process.exit(1);
  }
}

// Run processor
processEmailQueue();
