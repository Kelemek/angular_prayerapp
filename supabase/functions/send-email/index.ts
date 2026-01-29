/**
 * Unified Email Service using Microsoft Graph API
 * Replaces Resend and Mailchimp functionality
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const AZURE_TENANT_ID = Deno.env.get('AZURE_TENANT_ID')
const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID')
const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET')
// The mailbox to send from (shared mailbox or regular mailbox)
const MAIL_SENDER_ADDRESS = Deno.env.get('MAIL_SENDER_ADDRESS')!
const MAIL_FROM_NAME = Deno.env.get('MAIL_FROM_NAME') || 'Prayer Ministry'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Token cache (reuse for 55 minutes)
let cachedToken: { token: string; expires: number } | null = null

/**
 * Get OAuth access token from Microsoft Identity Platform
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expires - 300000) {
    console.log('✅ Using cached access token')
    return cachedToken.token
  }

  console.log('🔑 Acquiring new access token...')
  
  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`
  
  const body = new URLSearchParams({
    client_id: AZURE_CLIENT_ID!,
    client_secret: AZURE_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to acquire token: ${response.status} ${error}`)
  }

  const data = await response.json()
  
  // Cache token (expires_in is in seconds, typically 3600)
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in * 1000)
  }
  
  console.log('✅ Access token acquired')
  return data.access_token
}

/**
 * Send email via Microsoft Graph API
 */
async function sendEmail(
  token: string,
  options: {
    to: string | string[]
    subject: string
    htmlBody?: string
    textBody?: string
    replyTo?: string
    fromName?: string
    useBcc?: boolean  // If true, use BCC instead of To (hides recipients from each other)
  }
): Promise<void> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to]
  
  const message = {
    message: {
      subject: options.subject,
      body: {
        contentType: options.htmlBody ? 'html' : 'text',
        content: options.htmlBody || options.textBody || ''
      },
      from: {
        emailAddress: {
          address: MAIL_SENDER_ADDRESS,
          name: options.fromName || MAIL_FROM_NAME
        }
      },
      // Use BCC for bulk sends to hide recipients from each other
      ...(options.useBcc ? {
        bccRecipients: recipients.map(email => ({
          emailAddress: { address: email }
        }))
      } : {
        toRecipients: recipients.map(email => ({
          emailAddress: { address: email }
        }))
      }),
      ...(options.replyTo && {
        replyTo: [{ emailAddress: { address: options.replyTo } }]
      })
    },
    saveToSentItems: true
  }

  // With app-only auth (Mail.Send application permission), we send from the mailbox address directly
  // MAIL_SENDER_ADDRESS should be the shared mailbox or actual sending mailbox
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_SENDER_ADDRESS)}/sendMail`
  
  console.log('📤 Sending email via Graph API (app-only):', {
    from: MAIL_SENDER_ADDRESS,
    to: recipients.length > 5 ? `${recipients.slice(0, 5).join(', ')}... (${recipients.length} total)` : recipients,
    subject: options.subject,
    hasHtmlBody: !!options.htmlBody,
    hasTextBody: !!options.textBody,
    contentType: options.htmlBody ? 'html' : 'text'
  })
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Graph API error:', {
      status: response.status,
      statusText: response.statusText,
      error
    })
    throw new Error(`Graph API sendMail failed: ${response.status} ${error}`)
  }
  
  console.log(`✅ Email sent to ${recipients.length} recipient(s)${options.useBcc ? ' via BCC' : ''}`)
}

/**
 * Send bulk emails with BCC batching (respects M365 rate limits and hides recipients)
 * Uses BCC to ensure recipients don't see each other's email addresses
 */
async function sendBulkEmails(
  token: string,
  recipients: string[],
  options: {
    subject: string
    htmlBody?: string
    textBody?: string
    replyTo?: string
    fromName?: string
  }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  // Microsoft 365 limits: 500 recipients per message, 30 messages per minute
  const BCC_BATCH_SIZE = 500  // Max recipients per email
  const TIME_BATCH_SIZE = 30  // Max emails per minute
  const BATCH_DELAY = 60000   // 60 seconds between time batches
  
  let sent = 0
  let failed = 0
  const errors: string[] = []
  
  console.log(`📧 Sending to ${recipients.length} recipients using BCC...`)
  
  // Split into BCC batches of 500 recipients each
  const bccBatches = []
  for (let i = 0; i < recipients.length; i += BCC_BATCH_SIZE) {
    bccBatches.push(recipients.slice(i, i + BCC_BATCH_SIZE))
  }
  
  console.log(`📦 Created ${bccBatches.length} BCC batch(es) of up to ${BCC_BATCH_SIZE} recipients each`)
  
  // Send BCC batches in time-limited groups
  for (let i = 0; i < bccBatches.length; i += TIME_BATCH_SIZE) {
    const timeBatch = bccBatches.slice(i, i + TIME_BATCH_SIZE)
    const timeBatchNum = Math.floor(i / TIME_BATCH_SIZE) + 1
    const totalTimeBatches = Math.ceil(bccBatches.length / TIME_BATCH_SIZE)
    
    console.log(`⏰ Processing time batch ${timeBatchNum}/${totalTimeBatches} (${timeBatch.length} BCC email(s))...`)
    
    // Send all BCC batches in this time window
    for (const bccBatch of timeBatch) {
      try {
        await sendEmail(token, {
          to: bccBatch,  // Array of recipients
          subject: options.subject,
          htmlBody: options.htmlBody,
          textBody: options.textBody,
          replyTo: options.replyTo,
          fromName: options.fromName,
          useBcc: true  // Use BCC to hide recipients from each other
        })
        sent += bccBatch.length
        console.log(`✅ Sent to ${bccBatch.length} recipients via BCC`)
      } catch (error) {
        failed += bccBatch.length
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push(`Batch of ${bccBatch.length}: ${errorMsg}`)
        console.error(`❌ Failed to send BCC batch:`, errorMsg)
      }
    }
    
    // Wait before next time batch (unless this was the last one)
    if (i + TIME_BATCH_SIZE < bccBatches.length) {
      console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s before next time batch...`)
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
    }
  }
  
  console.log(`✅ Bulk send complete: ${sent} sent, ${failed} failed`)
  return { sent, failed, errors }
}

/**
 * Main request handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform'
      }
    })
  }

  try {
    console.log('📧 Email service: Received request')

    // Validate environment
    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
      throw new Error('Microsoft Graph not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET')
    }

    if (!MAIL_SENDER_ADDRESS) {
      throw new Error('MAIL_SENDER_ADDRESS not configured. Set to your shared mailbox or sending mailbox address.')
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase not configured')
    }

    // Parse request
    const body = await req.json()
    const { action, to, subject, htmlBody, textBody, replyTo, fromName } = body

    // Get access token
    const token = await getAccessToken()

    // Handle different actions
    if (action === 'send_to_all_subscribers') {
      // Bulk send to all active subscribers
      console.log('📧 Action: Send to all subscribers')
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      
      const { data: subscribers, error } = await supabase
        .from('email_subscribers')
        .select('email')
        .eq('is_active', true)
      
      if (error) throw error
      
      if (!subscribers || subscribers.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No active subscribers found',
          sent: 0,
          failed: 0
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
      
      const emails = subscribers.map(s => s.email)
      const result = await sendBulkEmails(token, emails, {
        subject,
        htmlBody,
        textBody,
        replyTo,
        fromName
      })
      
      return new Response(JSON.stringify({
        success: true,
        ...result
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    } else {
      // Single or small batch email
      console.log('📧 Action: Send email')
      
      if (!to) {
        throw new Error('Missing required field: to')
      }
      
      if (!subject) {
        throw new Error('Missing required field: subject')
      }
      
      await sendEmail(token, {
        to,
        subject,
        htmlBody,
        textBody,
        replyTo,
        fromName
      })
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Email sent successfully'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  } catch (error) {
    console.error('❌ Error:', error)
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
