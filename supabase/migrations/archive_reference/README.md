# Supabase Migrations

This directory contains all database migrations for the Prayer App.

## Overview

Migrations are applied in chronological order based on their filename timestamps. Once a migration is executed, it's tracked in Supabase's `_schema_migrations` table and never run again.

## Current Migration Structure

```
migrations/
├── SCHEMA_SNAPSHOT_20260116.sql          # Reference snapshot of current schema
├── supabase-schema.sql                   # Base schema (for fresh deployments)
├── 20251022000002_add_denied_at_columns.sql
├── 20251224073050_create_account_approval_requests.sql
├── 20260116_remove_approved_by.sql       # Latest: Removes unused column
└── archive/
    ├── database_migration_approval_system.sql
    └── (historical migrations - not re-executed)
```

## Migration History

### Current (as of Jan 16, 2026)

| File | Date | Purpose |
|------|------|---------|
| `20260116_remove_approved_by.sql` | Jan 16, 2026 | Remove unused `approved_by` column from 3 tables |
| `20251224073050_create_account_approval_requests.sql` | Dec 24, 2025 | Create account approval workflow table |
| `20251022000002_add_denied_at_columns.sql` | Oct 22, 2025 | Add denial timestamp tracking |
| `supabase-schema.sql` | Initial | Create base schema (prayers, prayer_updates, deletion_requests) |

## Important Notes

### Schema Snapshot
`SCHEMA_SNAPSHOT_20260116.sql` is a **reference document** showing the current database state after all migrations. It is **NOT** meant to be executed. Use it for:
- Documentation purposes
- Schema comparison
- Understanding the complete structure
- Onboarding new developers

### Archive Folder
The `archive/` folder contains old migrations that have already been executed. They are kept for historical reference but will not be re-executed when deploying to new environments.

### Fresh Deployments
For fresh Supabase projects:
1. Run `supabase-schema.sql` (creates base schema)
2. Then all numbered migrations will run in order

## To Run a Migration in Supabase

1. Go to your Supabase project SQL editor
2. Create a new query
3. Copy the entire contents of the migration file
4. Execute the query

**Note**: Only execute migrations that haven't been run yet. Supabase tracks executed migrations automatically.

## To Check Applied Migrations

In Supabase SQL editor:

```sql
SELECT * FROM _schema_migrations 
ORDER BY installed_on DESC;
```

This shows all migrations that have been applied to your database.

## Naming Convention

Migrations use timestamp prefixes for ordering:
- `20251022000002_` = October 22, 2025
- `20251224073050_` = December 24, 2025
- `20260116_` = January 16, 2026

Followed by a descriptive name separated by underscores.

## Database Tables

Current tables in database:
- `prayers` - Prayer requests
- `prayer_updates` - Updates to prayers
- `deletion_requests` - Deletion request workflow
- `account_approval_requests` - Account approval workflow

See `SCHEMA_SNAPSHOT_20260116.sql` for complete schema details.

## Unused/Removed Columns

The following columns have been removed as they were never used:
- `prayers.approved_by` (removed Jan 16, 2026)
- `prayer_updates.approved_by` (removed Jan 16, 2026)
- `account_approval_requests.approved_by` (removed Jan 16, 2026)

Reason: Application uses `approved_at` timestamp instead.
