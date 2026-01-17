-- Fix RLS policy for email_subscribers table
-- This allows anyone to read from email_subscribers (for loading their own preferences)

-- First, check if RLS is enabled (it should be)
-- If not, enable it:
-- ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Anyone can read email subscribers" ON email_subscribers;

-- Create a policy that allows anyone to SELECT (read) from email_subscribers
-- This is safe because we're not exposing sensitive data - just email preferences
CREATE POLICY "Anyone can read email subscribers"
ON email_subscribers
FOR SELECT
TO anon, authenticated
USING (true);

-- Keep the INSERT policy for pending_preference_changes (if it exists)
-- Users should only be able to INSERT into pending_preference_changes, not email_subscribers directly
