-- Drop pending_preference_changes table
-- This table is no longer used - functionality has been moved to verification_codes table
-- which handles preference change requests with action_type: 'preference_change'

DROP TABLE IF EXISTS pending_preference_changes CASCADE;
