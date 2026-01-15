import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  requester: string;
  email: string;
  is_anonymous: boolean;
  created_at: string;
  last_reminder_sent?: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the reminder_interval_days setting
    const { data: settings, error: settingsError } = await supabaseClient
      .from('admin_settings')
      .select('enable_reminders, reminder_interval_days, enable_auto_archive, days_before_archive')
      .eq('id', 1)
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings', details: settingsError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const enableReminders = settings?.enable_reminders || false
    const reminderIntervalDays = settings?.reminder_interval_days || 0
    const enableAutoArchive = settings?.enable_auto_archive || false
    const daysBeforeArchive = settings?.days_before_archive || 7

    // If reminders are disabled, we can still proceed if auto-archiving is enabled
    // If both are disabled, return early
    if (!enableReminders && !enableAutoArchive) {
      return new Response(
        JSON.stringify({ 
          message: 'Prayer update reminders and auto-archiving are both disabled',
          sent: 0,
          archived: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If reminder interval is 0 or null, return early
    if (!reminderIntervalDays || reminderIntervalDays <= 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Reminder emails are disabled',
          sent: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate the cutoff date for reminders
    const now = new Date()
    const millisecondsInDay = 24 * 60 * 60 * 1000
    const cutoffDate = new Date(now.getTime() - (reminderIntervalDays * millisecondsInDay))

    // Find prayers that need reminders:
    // - Status is 'current' (active prayers only)
    // - Approval status is 'approved'
    // - Has NOT had any updates in the last X days (where X = reminderIntervalDays)
    
    // First, get all prayers that might need reminders or archiving
    const { data: potentialPrayers, error: fetchError } = await supabaseClient
      .from('prayers')
      .select('id, title, description, prayer_for, requester, email, is_anonymous, created_at, last_reminder_sent')
      .eq('status', 'current')
      .eq('approval_status', 'approved')

    if (fetchError) {
      console.error('Error fetching prayers:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch prayers', details: fetchError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!potentialPrayers || potentialPrayers.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No approved current prayers found',
          sent: 0,
          archived: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // For each prayer, check if it has had any updates in the last X days
    const prayersNeedingReminders = []
    
    // Only process reminders if they are enabled
    if (enableReminders && reminderIntervalDays > 0) {
    for (const prayer of potentialPrayers) {
      // Get the most recent update for this prayer
      const { data: updates, error: updateError } = await supabaseClient
        .from('prayer_updates')
        .select('created_at')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (updateError) {
        console.error(`Error fetching updates for prayer ${prayer.id}:`, updateError)
        continue
      }

      // Determine the last activity date (either last update or prayer creation)
      let lastActivityDate
      if (updates && updates.length > 0) {
        lastActivityDate = new Date(updates[0].created_at)
      } else {
        lastActivityDate = new Date(prayer.created_at)
      }

      // Only send reminder if:
      // 1. Last activity was before the cutoff date AND
      // 2. Either no reminder has been sent yet, OR the last activity is AFTER the last reminder
      //    (meaning the counter has reset due to a new update)
      const shouldSendReminder = lastActivityDate < cutoffDate && (
        !prayer.last_reminder_sent || 
        new Date(lastActivityDate) > new Date(prayer.last_reminder_sent)
      )

      if (shouldSendReminder) {
        prayersNeedingReminders.push(prayer)
        console.log(`Prayer ${prayer.id} needs reminder: last activity ${lastActivityDate.toISOString()}, last reminder: ${prayer.last_reminder_sent || 'never'}`)
      }
    }
    } // End of reminder processing loop

    if (prayersNeedingReminders.length === 0 && enableReminders) {
      return new Response(
        JSON.stringify({ 
          message: 'No prayers need reminders at this time - all have recent updates',
          sent: 0,
          archived: 0,
          total: potentialPrayers.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send reminder emails
    let emailsSent = 0
    const errors = []

    if (enableReminders && prayersNeedingReminders.length > 0) {
    for (const prayer of prayersNeedingReminders) {
      if (!prayer.email) {
        console.log(`Skipping prayer ${prayer.id}: no email address`)
        continue
      }

      try {
        // Fetch the prayer_reminder template
        const { data: template, error: templateError } = await supabaseClient
          .from('email_templates')
          .select('*')
          .eq('template_key', 'prayer_reminder')
          .single()

        if (templateError || !template) {
          console.error(`Template not found for prayer reminder: ${templateError?.message || 'unknown error'}`)
          errors.push({ prayerId: prayer.id, error: 'Prayer reminder template not found' })
          continue
        }

        // Prepare template variables
        const requesterName = prayer.is_anonymous ? 'Friend' : prayer.requester
        const baseUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
        const appLink = `${baseUrl}/`

        const variables: Record<string, string> = {
          requesterName,
          prayerTitle: prayer.title,
          prayerFor: prayer.prayer_for,
          appLink
        }

        // Apply variables to template
        const subject = applyTemplateVariables(template.subject, variables)
        const textBody = applyTemplateVariables(template.text_body, variables)
        const htmlBody = applyTemplateVariables(template.html_body, variables)

        // Send the reminder email using send-email function
        const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
          body: {
            to: prayer.email,
            subject,
            textBody,
            htmlBody
          }
        })

        if (emailError) {
          console.error(`Error sending reminder for prayer ${prayer.id}:`, emailError)
          errors.push({ prayerId: prayer.id, error: emailError })
          continue
        }

        // Update last_reminder_sent timestamp
        const { error: updateError } = await supabaseClient
          .from('prayers')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', prayer.id)

        if (updateError) {
          console.error(`Error updating reminder timestamp for prayer ${prayer.id}:`, updateError)
        }

        emailsSent++
        console.log(`Sent reminder for prayer ${prayer.id}: ${prayer.title}`)
      } catch (error) {
        console.error(`Unexpected error sending reminder for prayer ${prayer.id}:`, error)
        const errorMessage = error && typeof error === 'object' && 'message' in error 
          ? String(error.message) 
          : 'Unknown error';
        errors.push({ prayerId: prayer.id, error: errorMessage })
      }
    }
    } // End of reminder sending loop

    // Handle auto-archiving if enabled
    let prayersArchived = 0
    if (enableAutoArchive && daysBeforeArchive > 0) {
      // Archive prayers if:
      // 1. A reminder was sent (last_reminder_sent is not null)
      // 2. The reminder is older than daysBeforeArchive
      // 3. No updates have occurred since the reminder was sent
      
      const archiveNow = new Date()
      const archiveCutoffDate = new Date(archiveNow.getTime() - (daysBeforeArchive * millisecondsInDay))

      console.log(`Auto-archive enabled: checking for prayers with reminders sent before ${archiveCutoffDate.toISOString()} (${daysBeforeArchive} days ago) and no updates since`)

      // Find prayers that:
      // 1. Have status 'current' (active prayers only)
      // 2. Have a last_reminder_sent timestamp
      const { data: prayersToArchive, error: archiveQueryError } = await supabaseClient
        .from('prayers')
        .select('id, title, created_at, last_reminder_sent')
        .eq('status', 'current')
        .eq('approval_status', 'approved')
        .not('last_reminder_sent', 'is', null)

      if (archiveQueryError) {
        console.error('Error querying prayers for auto-archive:', archiveQueryError)
      } else if (prayersToArchive && prayersToArchive.length > 0) {
        console.log(`Found ${prayersToArchive.length} prayers with reminders sent to check for archiving`)
        
        // For each prayer with a reminder, check if it should be archived
        for (const prayer of prayersToArchive) {
          // Get the most recent update for this prayer (after the reminder was sent)
          const { data: updates, error: updateError } = await supabaseClient
            .from('prayer_updates')
            .select('created_at')
            .eq('prayer_id', prayer.id)
            .gt('created_at', prayer.last_reminder_sent!)
            .order('created_at', { ascending: false })
            .limit(1)

          if (updateError) {
            console.error(`Error checking updates for prayer ${prayer.id}:`, updateError)
            continue
          }

          // If there's an update after the reminder, skip archiving (counter reset)
          if (updates && updates.length > 0) {
            console.log(`Prayer ${prayer.id} has an update after reminder, skipping archive`)
            continue
          }

          // Check if the reminder is old enough to archive
          const reminderDate = new Date(prayer.last_reminder_sent!)
          const shouldArchive = reminderDate < archiveCutoffDate
          
          if (shouldArchive) {
            const daysSinceReminder = Math.floor((new Date().getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24))
            console.log(`Archiving prayer ${prayer.id}: ${prayer.title} (${daysSinceReminder} days since reminder, threshold: ${daysBeforeArchive} days, no updates since reminder)`)
            
            const { error: archiveError } = await supabaseClient
              .from('prayers')
              .update({ status: 'archived' })
              .eq('id', prayer.id)

            if (archiveError) {
              console.error(`Error archiving prayer ${prayer.id}:`, archiveError)
            } else {
              prayersArchived++
              console.log(`Successfully auto-archived prayer ${prayer.id}: ${prayer.title}`)
            }
          }
        }
      } else {
        console.log('No prayers with reminders found that need auto-archiving')
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully sent ${emailsSent} reminder emails${prayersArchived > 0 ? ` and archived ${prayersArchived} prayers` : ''}`,
        sent: emailsSent,
        archived: prayersArchived,
        total: prayersNeedingReminders.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorDetails = error && typeof error === 'object' && 'message' in error 
      ? String(error.message) 
      : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Unexpected error occurred', details: errorDetails }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

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

function generateReminderHTML(prayer: Prayer, enableAutoArchive: boolean, daysBeforeArchive: number): string {
  const baseUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
  const appUrl = `${baseUrl}/`
  const requesterName = prayer.is_anonymous ? 'Friend' : prayer.requester

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer Update Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Prayer Update Reminder</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${requesterName},</h2>
          <p style="margin-bottom: 20px;">This is a friendly reminder to update your prayer request if there have been any changes or answered prayers.</p>
          
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;"><strong>Your Prayer Request:</strong></p>
            <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600; font-size: 18px;">${prayer.title}</p>
            <p style="margin: 0; color: #1e3a8a;"><strong>Prayer For:</strong> ${prayer.prayer_for}</p>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>💡 Why update?</strong><br>
              • Share how God is working in this situation<br>
              • Let others know if prayers have been answered<br>
              • Update the prayer need if circumstances have changed<br>
              • Encourage others by sharing God's faithfulness
            </p>
          </div>

          ${enableAutoArchive ? `
          <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>⏰ Please Note:</strong> To keep our active prayer list current, if we don't receive an update within <strong>${daysBeforeArchive} days</strong>, this prayer will be automatically archived. You can always reactivate an archived prayer by adding a new update.
            </p>
          </div>
          ` : ''}

          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">To add an update, simply visit the prayer app and click the "Add Update" button on your prayer request.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
          </div>

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 30px 0 0 0;">
            <p style="margin: 0; color: #0c4a6e; font-size: 13px;">
              <strong>Prayer Details:</strong><br>
              Submitted: ${new Date(prayer.created_at).toLocaleDateString()}<br>
              ${prayer.last_reminder_sent ? `Last Reminder: ${new Date(prayer.last_reminder_sent).toLocaleDateString()}` : 'First Reminder'}
            </p>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Continuing to pray with you,<br><strong>The Prayer Team</strong></p>
          <p style="font-size: 12px; color: #9ca3af;">You're receiving this because you submitted a prayer request. Updates help our community stay connected and see how God is working.</p>
        </div>
      </body>
    </html>
  `
}
