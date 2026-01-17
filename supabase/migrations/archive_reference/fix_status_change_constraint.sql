-- Fix: Update status_change_requests constraint from 'active' to 'current'
-- This aligns the database constraint with the application code

-- Drop the old constraint
ALTER TABLE status_change_requests 
DROP CONSTRAINT IF EXISTS status_change_requests_requested_status_check;

-- Add the correct constraint with 'current' instead of 'active'
ALTER TABLE status_change_requests 
ADD CONSTRAINT status_change_requests_requested_status_check 
CHECK (requested_status IN ('current', 'answered', 'ongoing', 'closed'));

-- Verify the fix
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'status_change_requests'::regclass 
AND conname = 'status_change_requests_requested_status_check';
