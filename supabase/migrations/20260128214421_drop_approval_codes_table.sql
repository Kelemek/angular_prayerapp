-- Drop the approval_codes table and related objects
-- This table was used for one-time admin approval links but is no longer needed
-- Admin notifications now link directly to /admin portal requiring standard login

-- Drop the cleanup function first
DROP FUNCTION IF EXISTS cleanup_expired_approval_codes();

-- Drop the table (CASCADE will drop all dependent objects including indexes and constraints)
DROP TABLE IF EXISTS approval_codes CASCADE;
