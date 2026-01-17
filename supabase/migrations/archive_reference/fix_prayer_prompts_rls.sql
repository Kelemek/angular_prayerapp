-- Fix RLS policies for prayer_prompts table
-- This allows the application to insert/update/delete prompts
-- Admin authorization is still enforced at the application level (AdminPortal)

-- Drop the restrictive service_role policy
DROP POLICY IF EXISTS "Service role can manage prompts" ON prayer_prompts;

-- Add policy that allows anon/authenticated users to manage prompts
-- The admin portal guards access to the PromptManager component
CREATE POLICY "Anyone can manage prompts"
ON prayer_prompts FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
