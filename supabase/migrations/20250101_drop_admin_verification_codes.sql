-- Drop admin_verification_codes table
-- This table is no longer used - replaced by verification_codes table
-- which uses action_type field to handle all verification types including admin login

DROP TABLE IF EXISTS admin_verification_codes CASCADE;
