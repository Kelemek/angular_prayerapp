# Mass Email Send Process Changes - January 10, 2026

## Summary

The mass email send process has been refactored to **decouple approval actions from bulk email notifications**. This provides better control, flexibility, and user experience.

## What Changed

### Previous Behavior
- Admin approves prayer/update
- System automatically sends bulk emails to all subscribers immediately
- Approval and bulk notification were tightly coupled

### New Behavior
- Admin approves prayer/update
- **Requester/author receives immediate personal notification** (acknowledgment only)
- **Bulk emails to subscribers are NOT sent automatically**
- Admin must explicitly click "Send Emails" button to notify all subscribers

## Key Changes in Code

### File: `src/app/services/admin-data.service.ts`

#### Modified Method: `approvePrayer(id: string)`
**Before**: Sent both requester notification AND bulk subscriber notification
**After**: Sends ONLY requester notification immediately

```typescript
// Send approval email to requester immediately (don't let email failures block)
this.emailNotification.sendRequesterApprovalNotification({
  title: prayer.title,
  description: prayer.description,
  requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
  requesterEmail: prayer.email,
  prayerFor: prayer.prayer_for
}).catch(err => console.error('Failed to send requester approval notification:', err));
```

#### New Method: `sendApprovedPrayerEmails(id: string)`
**Purpose**: Explicitly send bulk emails to all subscribers for an approved prayer
**Triggered by**: Admin clicking "Send Emails" button in UI

```typescript
// Send email notifications to all subscribers (don't let email failures block)
this.emailNotification.sendApprovedPrayerNotification({...})
  .catch(err => console.error('Failed to send broadcast notification:', err));

// Trigger email processor immediately
await this.triggerEmailProcessor();
```

#### Modified Method: `approveUpdate(id: string)`
**Before**: Automatically sent bulk subscriber notifications
**After**: Sends ONLY author notification immediately
- Author receives acknowledgment via `sendRequesterApprovalNotification()`
- Subscriber bulk notifications handled separately via "Send Emails" button

## Benefits

1. **Separation of Concerns**: Approval and notification are distinct actions
2. **Flexibility**: Admins can approve without immediately spamming all subscribers
3. **Control**: Bulk sends are intentional, not automatic side effects
4. **Better UX**: Requesters/authors get immediate feedback
5. **Reduced Email Volume**: Prevents accidental or duplicate bulk sends
6. **Scalability**: Decouples approval operations from email throughput

## Affected Workflows

### Prayer Approval Workflow
1. Admin reviews pending prayer
2. Admin clicks "Approve"
   - ✅ Prayer status → `approved`
   - ✅ Requester email notification sent immediately
   - ❌ Subscribers NOT notified
3. Admin (optional) clicks "Send Emails" to notify all subscribers

### Update Approval Workflow
1. Admin reviews pending update
2. Admin clicks "Approve"
   - ✅ Update status → `approved`
   - ✅ Author email notification sent immediately
   - ❌ Subscribers NOT notified
3. Admin (optional) clicks "Send Emails" to notify all subscribers

## Testing Checklist

- [ ] Approve prayer → Verify requester gets email only
- [ ] Approve update → Verify author gets email only
- [ ] Click "Send Emails" button → Verify all subscribers get email
- [ ] Verify email processor triggers correctly
- [ ] Test with email service down → Operations complete, errors logged
- [ ] Verify pagination preserved in admin UI when sending bulk emails

## Documentation Location

Full details available in: [docs/EMAIL_NOTIFICATIONS.md](docs/EMAIL_NOTIFICATIONS.md#mass-email-send-process)

## Commit Reference

- Commit: `2c133bd`
- Date: Friday, January 9, 2026 @ 23:02:52
- Author: Kelemek
- Message: "Send requester approval email immediately on approval, bulk emails only on Send button click"
