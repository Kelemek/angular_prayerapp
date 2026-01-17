# Supabase Migrations - Archive Reference

This directory contains **reference files and legacy migrations**. These files are **NOT executed by Supabase CLI** (which only runs timestamped files in the parent directory: `/supabase/migrations/`).

## Files in This Folder

| File | Purpose |
|------|---------|
| `SCHEMA_SNAPSHOT_PRODUCTION_20260116.sql` | **Current** - Complete production schema with docs (use this for reference) |
| `SCHEMA_SNAPSHOT_20260116.sql` | Previous snapshot (kept for comparison) |
| `actual_schema.sql` | Last dumped production schema |
| `supabase-schema.sql` | Original base schema |
| `README.md` | This file |
| Other `*.sql` files | Legacy migrations (already applied, not re-executed) |

## Production Status (Jan 16, 2026)

✅ **56 timestamped migrations applied**  
✅ **8 core tables deployed**  
✅ **RLS policies configured**  
✅ **Email system with queue implemented**  
✅ **Account approval workflow active**  
✅ **Notification badges enabled**  
✅ **GitHub integration ready**

### Core Tables:
1. **prayers** - Prayer requests with approval workflow
2. **prayer_updates** - Intercessions/updates for prayers
3. **deletion_requests** - Audit trail for prayer deletions
4. **account_approval_requests** - New user account approval
5. **email_subscribers** - Users subscribed to notifications
6. **admin_settings** - App config (GitHub integration, etc)
7. **email_templates** - Customizable email templates
8. **email_queue** - Background email processor with retries

## Timeline of Recent Changes

| Date | Migration | Change |
|------|-----------|--------|
| Jan 16, 2026 | 20260116 | Removed unused `approved_by` columns (from 3 tables) |
| Jan 11, 2026 | 20260111 | Added notification badge functionality |
| Jan 9, 2026 | 20260109 | Email queue + template unsubscribe links |
| Jan 8, 2026 | 20260108 | Activity tracking + removed obsolete last_sign_in_at |
| Jan 7, 2026 | 20260107 | Account approval affiliation reason + RLS updates |
| Jan 3, 2026 | 20260103 | GitHub feedback integration config |
| Dec 31, 2025 | 20251231 | Planning Center integration |
| Dec 24, 2025 | 20251224 | Account approval system |
| Dec 3, 2025 | 20251203 | Various RLS fixes |
| Oct 22, 2025 | 20251022 | Added denial workflow (denied_at, denial_reason) |

## How to Use These Files

### ✅ For Understanding Current Schema
```bash
# Open this file for comprehensive documentation with examples:
SCHEMA_SNAPSHOT_PRODUCTION_20260116.sql
```

Includes:
- All table definitions with comments
- All indexes and triggers
- RLS security policies
- Foreign key relationships
- Usage examples with sample queries

### ✅ For New Database Setup
```bash
# Use the timestamped migrations in parent directory:
cd /supabase/migrations/
supabase db push

# Then verify schema:
supabase db pull --schema public > /tmp/check.sql
diff archive_reference/SCHEMA_SNAPSHOT_PRODUCTION_20260116.sql /tmp/check.sql
```

### ✅ For Manual Schema Creation
If you need to set up without migrations:
```bash
# Import the snapshot directly:
psql -U postgres -h localhost -d your_db < SCHEMA_SNAPSHOT_PRODUCTION_20260116.sql
```

### ✅ For Syncing With Production
```bash
# Check what needs repair:
supabase migration list

# Repair any mismatches:
supabase migration repair --status applied 20260116

# Pull and compare:
supabase db pull --schema public > /tmp/prod_current.sql
diff SCHEMA_SNAPSHOT_PRODUCTION_20260116.sql /tmp/prod_current.sql
```

### ✅ For Code Review
When reviewing database-related code:
1. Open `SCHEMA_SNAPSHOT_PRODUCTION_20260116.sql`
2. Find the table definition (ctrl+F)
3. Read the comments explaining column purposes
4. Review the RLS policies section
5. Check the usage examples at the bottom

## Folder Structure Explained

```
/supabase/
├── migrations/                          # Main migrations (TIMESTAMPED ONLY)
│   ├── 20250101_initial.sql            # Executed by Supabase CLI
│   ├── 20251022000002_*.sql            # Executed by Supabase CLI
│   ├── 20260116_remove_approved_by.sql # Executed by Supabase CLI
│   └── archive_reference/              # This folder (REFERENCE ONLY)
│       ├── SCHEMA_SNAPSHOT_PRODUCTION_20260116.sql  # ← Use for reference
│       ├── SCHEMA_SNAPSHOT_20260116.sql
│       ├── supabase-schema.sql
│       └── README.md                   # This file
└── functions/                          # Edge functions
```

**Why separate?**
- **Parent folder**: Only timestamped files; Supabase CLI tracks these automatically
- **archive_reference**: Reference docs; safe to delete (but keep for documentation)

## Recently Completed Work

### ✅ Removed Unused `approved_by` Column (20260116)
- Removed from: `prayers`, `prayer_updates`, `account_approval_requests`
- Reason: Application uses `approved_at` timestamp instead; `approved_by` was never referenced in code
- Status: Migration created, applied to production via migration system

### ✅ Email System Enhancements (20260109)
- Created `email_queue` table for background email processing with retry logic
- Updated email templates with unsubscribe links for compliance
- Indexes created for efficient queue processing

### ✅ Notification Badges (20260111)
- Added `badge_functionality_enabled` column to `email_subscribers`
- Users can opt-in to notification badge functionality
- When enabled, all current items marked as read, badges show only new items

### ✅ User Onboarding Improvements (20260107)
- Added `affiliation_reason` field to `account_approval_requests`
- Updated RLS policies to allow anonymous users to check approval status during login
- Updated `create_account_approval_request()` RPC function with reason parameter

### ✅ Activity Tracking (20260108)
- Added `last_activity_date` to email_subscribers
- Removed obsolete `last_sign_in_at` column (consolidated into activity tracking)
- Dropped `update_admin_last_sign_in()` function

### ✅ Admin Configuration (20260103)
- Added GitHub settings to `admin_settings` table
- Supports: github_token, github_repo_owner, github_repo_name, enabled flag
- Ready for GitHub feedback integration

## Key Database Design Decisions

| Pattern | Implementation | Reason |
|---------|----------------|--------|
| **Timestamps** | TIMESTAMP WITH TIME ZONE | Ensures UTC consistency across timezones |
| **Approval** | approval_status + approved_at | Supports both tracking status and approval time |
| **Cascading** | ON DELETE CASCADE | prayer_updates/deletion_requests deleted with parent prayer |
| **RLS Security** | Public read/insert, service role process | Separates user submissions from admin approval |
| **Email Queue** | Separate table + retry logic | Asynchronous processing with retry support |
| **Soft vs Hard Deletes** | Hard delete with audit trail | deletion_requests table provides audit log |

## Checking What's in Production

To see current migration status:

```bash
# List all applied migrations
supabase migration list

# Check database directly
supabase sql -- -c "SELECT * FROM _schema_migrations ORDER BY installed_on DESC"

# Count applied migrations
supabase sql -- -c "SELECT COUNT(*) FROM _schema_migrations WHERE name LIKE '20%'"
```

## Next Steps for Future Updates

1. **Create new migration**: Add file to `/supabase/migrations/` with timestamp prefix
2. **Follow naming**: `<timestamp>_descriptive_name.sql`
3. **Test locally**: Run `supabase db push` to test
4. **Push to production**: CLI automatically tracks in `_schema_migrations`
5. **Update snapshot**: After each major change, recreate `SCHEMA_SNAPSHOT_PRODUCTION_*.sql`

## Questions?

Refer to `SCHEMA_SNAPSHOT_PRODUCTION_20260116.sql` for:
- Complete table definitions with comments
- Foreign key relationships  
- RLS security policies
- Index details
- Trigger implementations
- Usage examples and queries
