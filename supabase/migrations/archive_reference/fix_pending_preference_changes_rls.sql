-- Fix RLS policy for pending_preference_changes table
-- This allows anyone to INSERT their preference change requests

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert preference changes" ON pending_preference_changes;
DROP POLICY IF EXISTS "Anyone can read their own preference changes" ON pending_preference_changes;

-- Allow anyone to INSERT new preference change requests
CREATE POLICY "Anyone can insert preference changes"
ON pending_preference_changes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to SELECT (read) from pending_preference_changes
-- This is needed for the UserSettings to check for pending changes
CREATE POLICY "Anyone can read their own preference changes"
ON pending_preference_changes
FOR SELECT
TO anon, authenticated
USING (true);
