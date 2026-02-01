-- Drop status_change_requests table
-- This table was created to handle prayer status change approval requests but the feature was never fully implemented.
-- The admin UI never displays or handles these requests, so removing the table to simplify the schema.

-- Drop the table and its associated indexes
drop table if exists public.status_change_requests;
