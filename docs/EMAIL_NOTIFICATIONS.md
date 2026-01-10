# Email Notification System

## Overview

The Angular prayer app now has a comprehensive email notification system that automatically sends emails in two scenarios:
1. **Admin Notifications**: When users submit prayers/updates that need approval
2. **Approval/Denial Notifications**: When admins approve or deny prayers/updates

## Architecture

### Service: EmailNotificationService

Location: `src/app/services/email-notification.service.ts`

This service handles all email notifications using the Supabase edge function `send-email`.

#### Key Features:

1. **Template System**: Fetches email templates from `email_templates` table
2. **Variable Substitution**: Replaces `{{variableName}}` placeholders with actual values
3. **Fallback HTML**: Built-in HTML email templates when database templates aren't found
4. **Bulk Emails**: Sends to all subscribers via `send_to_all_subscribers` action
5. **Individual Emails**: Sends to specific recipients (admins, requesters, authors, etc.)

## Email Types

### Admin Notification Emails (When Items Need Approval)

#### 1. New Prayer Submission
- **Trigger**: User submits a new prayer
- **Recipients**: All admins with `receive_admin_emails` enabled
- **Template Key**: `admin_notification_prayer`
- **Method**: `sendAdminNotification({ type: 'prayer' })`
- **Content**: Prayer title, description, requester name
- **When**: Called in `PrayerService.addPrayer()`

#### 2. New Update Submission
- **Trigger**: User submits an update to a prayer
- **Recipients**: All admins with `receive_admin_emails` enabled
- **Template Key**: `admin_notification_update`
- **Method**: `sendAdminNotification({ type: 'update' })`
- **Content**: Prayer title, update content, author name
- **When**: Called in `PrayerService.addPrayerUpdate()`

#### 3. Deletion Request
- **Trigger**: User requests deletion of a prayer
- **Recipients**: All admins with `receive_admin_emails` enabled
- **Template Key**: `admin_notification_deletion`
- **Method**: `sendAdminNotification({ type: 'deletion' })`
- **Content**: Prayer title, deletion reason, requester name

### Approval/Denial Response Emails

#### 1. Prayer Approval Notifications

##### Immediate Requester Notification
- **Trigger**: Admin approves a prayer (automatic)
- **Recipients**: Prayer requester only
- **Method**: `sendRequesterApprovalNotification()`
- **Content**: Personal confirmation with next steps
- **Timing**: Sent **immediately** when admin clicks approve button
- **Purpose**: Let requester know their prayer was approved

##### Broadcast to All Subscribers
- **Trigger**: Admin explicitly clicks "Send Emails" button for an approved prayer
- **Recipients**: All active email subscribers
- **Template Key**: `approved_prayer`
- **Method**: `sendApprovedPrayerNotification()`
- **Content**: Prayer title, description, requester name, prayer status
- **Timing**: Sent **only** when admin initiates bulk send
- **Purpose**: Notify subscribers about new approved prayer (decoupled from approval action)

### 2. Prayer Denial Notifications

- **Trigger**: Admin denies a prayer
- **Recipients**: Prayer requester only
- **Template Key**: `denied_prayer`
- **Method**: `sendDeniedPrayerNotification()`
- **Content**: Denial reason, original submission

### 3. Update Approval Notifications

- **Trigger**: Admin approves an update
- **Recipients**: All active email subscribers
- **Template Key**: `approved_update` or `prayer_answered` (if marked as answered)
- **Method**: `sendApprovedUpdateNotification()`
- **Content**: Update content, author, prayer title
- **Special**: Different styling for answered prayers

### 4. Update Denial Notifications

- **Trigger**: Admin denies an update
- **Recipients**: Update author only
- **Template Key**: `denied_update`
- **Method**: `sendDeniedUpdateNotification()`
- **Content**: Denial reason, original update content

## Integration

### PrayerService Integration

Location: `src/app/services/prayer.service.ts`

#### Modified Methods:

1. **`addPrayer()`**
   - Submits prayer to database with `approval_status: 'pending'`
   - Auto-subscribes user to email notifications (if email provided)
   - **Sends admin notification** to all admins
   - Errors don't block prayer submission (logged only)

2. **`addPrayerUpdate()`**
   - Submits update to database with `approval_status: 'pending'`
   - Fetches prayer title for notification context
   - **Sends admin notification** to all admins
   - Errors don't block update submission (logged only)

### AdminDataService Integration

Location: `src/app/services/admin-data.service.ts`

#### Modified Methods:

1. **`approvePrayer(id: string)`**
   - Fetches prayer details before approval
   - Updates database
   - **Sends personal requester notification immediately** to acknowledge approval
   - Does NOT send bulk subscriber notifications (reserved for explicit "Send Emails" action)
   - Errors don't block approval (logged only)

2. **`sendApprovedPrayerEmails(id: string)`**
   - **NEW**: Explicit method for sending bulk emails to all subscribers
   - Called when admin clicks "Send Emails" button in UI
   - Sends broadcast notification to all active subscribers
   - Triggers email processor to handle delivery
   - Errors don't block operation (logged only)

3. **`denyPrayer(id: string, reason: string)`**
   - Fetches prayer details before denial
   - Updates database with denial reason
   - Sends denial notification to requester
   - Errors don't block denial (logged only)

4. **`approveUpdate(id: string)`**
   - Fetches update and prayer details
   - Updates database
   - Updates prayer status if needed (answered/current)
   - **Sends personal author approval notification immediately**
   - Does NOT send bulk subscriber notifications automatically
   - Errors don't block approval (logged only)

5. **`denyUpdate(id: string, reason: string)`**
   - Fetches update and prayer details
   - Updates database with denial reason
   - Sends denial notification to author
   - Errors don't block denial (logged only)

6. **`approvePreferenceChange(id: string)`**
   - Fetches preference change details before approval
   - Updates database
   - **Sends personal approval notification to user immediately**
   - Errors don't block approval (logged only)

7. **`denyPreferenceChange(id: string, reason: string)`**
   - Fetches preference change details before denial
   - Updates database with denial reason
   - Sends denial notification to user
   - Errors don't block denial (logged only)

### UserSettingsComponent Integration

Location: `src/app/components/user-settings/user-settings.component.ts`

#### Modified Methods:

1. **`savePreferences()`**
   - Validates email and name input
   - Saves user info to localStorage
   - Submits preference change to database as pending
   - **Sends admin notification** to all admins
   - Errors don't block preference submission (logged only)
   - Shows success message with approval instructions

## Mass Email Send Process

### Background

Previously, when an admin approved a prayer or update, the system would automatically send bulk emails to all subscribers immediately. This was coupled with the approval action, which could cause issues if:
- Email service was experiencing delays
- Admin wanted to approve without notifying subscribers yet
- Bulk notifications needed to be sent at a specific time

### New Behavior (January 10, 2026)

The mass email send process has been **decoupled from approval actions**. Here's how it now works:

#### For Prayer Approvals:

1. **Admin clicks "Approve" on a pending prayer**
   - Prayer status changes to `approved`
   - **Requester receives personal notification immediately** (acknowledgment)
   - **No bulk emails sent to subscribers**

2. **Admin clicks "Send Emails" button for the approved prayer**
   - **Then** bulk emails are sent to all active subscribers
   - Email processor is triggered for handling delivery
   - This step is now optional and manual

#### For Update Approvals:

1. **Admin clicks "Approve" on a pending update**
   - Update status changes to `approved`
   - Prayer status updates if needed (answered/current)
   - **Author receives personal notification immediately** (acknowledgment)
   - **No bulk emails sent to subscribers**

2. **Admin clicks "Send Emails" button for the approved update**
   - **Then** bulk emails are sent to all active subscribers
   - Different email templates used for answered prayers vs. regular updates
   - Email processor is triggered

### Benefits

- **Separation of concerns**: Approval and notification are now separate actions
- **Flexibility**: Admins can approve without immediately notifying all subscribers
- **Control**: Bulk sends are intentional, not automatic side effects
- **Better UX**: Requesters/authors get immediate feedback on their submission
- **Reduced email volume**: Accidental bulk sends are prevented
- **Scalability**: Decouples approval operations from email throughput

### Implementation Details

#### Code Changes in AdminDataService:

```typescript
// Approval now sends only to requester/author
async approvePrayer(id: string): Promise<void> {
  // ... update logic ...
  
  // Send personal requester notification immediately
  this.emailNotification.sendRequesterApprovalNotification({...})
    .catch(err => console.error('Failed to send requester approval notification:', err));
}

// New explicit method for bulk sends
async sendApprovedPrayerEmails(id: string): Promise<void> {
  // Fetch prayer details
  const { data: prayer } = await supabaseClient
    .from('prayers')
    .select('*')
    .eq('id', id)
    .single();
  
  // Send to all subscribers
  this.emailNotification.sendApprovedPrayerNotification({...})
    .catch(err => console.error('Failed to send broadcast notification:', err));
  
  // Trigger email processor
  await this.triggerEmailProcessor();
}
```

### Migration Notes

- All existing prayers and updates continue to work normally
- No database schema changes required
- UI components were updated to provide "Send Emails" button for approved items
- Email templates remain unchanged

## Error Handling

All email operations use `.catch()` to prevent email failures from blocking database operations:

```typescript
this.emailNotification.sendApprovedPrayerNotification({...})
  .catch(err => console.error('Failed to send broadcast notification:', err));
```

This ensures:
- Database updates always complete
- UI updates happen regardless of email status
- Email failures are logged for debugging
- Users can continue working even if email service is down

## Email Templates

### Database Templates

Templates are stored in the `email_templates` table with these keys:
#### Admin Notification Templates
- `admin_notification_prayer` - New prayer pending approval
- `admin_notification_update` - New update pending approval
- `admin_notification_deletion` - Deletion request pending approval

#### Approval/Denial Templates
- `approved_prayer` - New prayer broadcast to subscribers
- `denied_prayer` - Prayer denial notice to requester
- `approved_update` - Update broadcast to subscribers
- `prayer_answered` - Answered prayer broadcast (special styling)
- `denied_update` - Update denial notice to author

### Template Variables

Templates support these variable patterns:

- `{{prayerTitle}}` - Prayer title
- `{{prayerFor}}` - Prayer for person
- `{{requesterName}}` - Requester name
- `{{prayerDescription}}` - Prayer description
- `{{authorName}}` - Update author name
- `{{updateContent}}` - Update content
- `{{denialReason}}` - Reason for denial
- `{{appLink}}` - Link to app
- `{{userName}}` - User name (for preference changes)
- `{{userEmail}}` - User email (for preference changes)
- `{{preferenceType}}` - Subscribe or unsubscribe (for preference changes)

### Fallback Templates

When database templates aren't found, the service uses built-in HTML templates with:
- Responsive design
- Dark mode compatibility
- Professional styling
- Inline CSS for email clients
- Proper semantic HTML

## HTML Email Features

All HTML emails include:

1. **Gradient Headers**: Color-coded by action type
   - Green: Approvals
   - Red: Denials
   - Blue: Updates
   - Purple: Status changes

2. **Responsive Layout**: Max-width 600px, centered

3. **Call-to-Action Buttons**: Styled links to app

4. **Branded Footer**: App name and notification context

5. **Accessibility**: Proper semantic HTML, good contrast ratios

## Testing Checklist

When testing email notifications:

### Admin Notification Emails
1. ✅ Submit new prayer → Check all admin inboxes
2. ✅ Submit update to prayer → Check all admin inboxes
3. ✅ Request prayer deletion → Check all admin inboxes
4. ✅ Submit preference change → Check all admin inboxes
5. ✅ Verify only admins with `receive_admin_emails=true` get notifications
6. ✅ Verify HTML email formatting and styling
7. ✅ Check that submission still works if email fails

### Approval/Denial Emails
8. ✅ Approve prayer → Check subscriber inboxes + requester inbox
9. ✅ Deny prayer → Check requester inbox only
10. ✅ Approve update → Check subscriber inboxes
11. ✅ Deny update → Check author inbox only
12. ✅ Approve preference change → Check user inbox
13. ✅ Deny preference change → Check user inbox with reason
14. ✅ Mark update as answered → Check special styling in email
15. ✅ Verify email failures don't block operations
16. ✅ Check spam folders if emails not received
17. ✅ Verify template variable substitution
18. ✅ Test with/without database templates
19. ✅ Verify HTML rendering in multiple email clients

## Configuration

### Supabase Edge Function

The `send-email` edge function must be deployed with:
- Microsoft Graph API credentials
- Proper sender configuration
- Rate limiting
- Error handling

### Email Subscribers

Subscribers are managed in `email_subscribers` table:
- `is_active` = true to receive emails
- `receive_new_prayer_notifications` controls prayer broadcasts
- `receive_admin_emails` controls admin notifications

### Admin Email Settings

Configure in Admin Portal → Settings → Email:
- From name
- Reply-to address
- Email templates
- Subscriber management

## Future Enhancements

Potential improvements:

1. **Email Queuing**: Queue emails for retry on failure
2. **Notification Log**: Track all sent emails in database
3. **Preference Controls**: Per-user notification preferences
4. **Rich Text Editor**: Visual template editor in admin portal
5. **Email Preview**: Preview emails before sending
6. **A/B Testing**: Test different email formats
7. **Analytics**: Track email opens and clicks
8. **Scheduling**: Schedule email sends for specific times

## Troubleshooting

### Emails Not Sending

1. Check Supabase edge function logs
2. Verify Microsoft Graph API credentials
3. Check rate limits
4. Verify subscriber `is_active` status
5. Check spam folders

### Template Errors

1. Verify template exists in `email_templates` table
2. Check template_key matches exactly
3. Verify all required variables are provided
4. Check console for template loading errors

### Styling Issues

1. Test in multiple email clients (Gmail, Outlook, Apple Mail)
2. Use inline CSS (already implemented)
3. Avoid complex CSS features
4. Test on mobile devices

## Related Files

- `/src/app/services/email-notification.service.ts` - Email service
- `/src/app/services/admin-data.service.ts` - Admin operations with email integration
- `/supabase/functions/send-email/` - Supabase edge function
- `/docs/EMAIL_GUIDE.md` - Email system documentation
- Table: `email_templates` - Template storage
- Table: `email_subscribers` - Subscriber management
