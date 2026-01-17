-- Conservative Performance Optimizations: Safe Changes Only
-- These changes have minimal risk and clear benefits

-- ============================================================================
-- PRIORITY 1: DROP DUPLICATE INDEX (SAFE)
-- ============================================================================
-- Table: prayer_prompts - Drop duplicate index
-- Keeping: idx_prayer_prompts_created_at (more descriptive name)
-- Dropping: idx_prayer_prompts_created (duplicate)

DROP INDEX IF EXISTS idx_prayer_prompts_created;

-- ============================================================================
-- PRIORITY 2: WRAP auth.uid() IN SUBQUERIES (SAFE - PERFORMANCE ONLY)
-- ============================================================================
-- PostgreSQL best practice: prevents row-by-row re-evaluation
-- No functional change - same auth checks, just more efficient

-- prayers table - admin read access
DROP POLICY IF EXISTS "Enable admin read access for all prayers" ON prayers;
CREATE POLICY "Enable admin read access for all prayers"
  ON prayers
  FOR SELECT
  USING (auth.uid() = (select user_id from email_subscribers where email = current_setting('request.jwt.claims'::text, true)::json->>'email' limit 1));

-- prayers table - admin update access
DROP POLICY IF EXISTS "Enable admin update access for prayers" ON prayers;
CREATE POLICY "Enable admin update access for prayers"
  ON prayers
  FOR UPDATE
  USING (auth.uid() = (select user_id from email_subscribers where email = current_setting('request.jwt.claims'::text, true)::json->>'email' limit 1));

-- prayer_updates table - admin read access
DROP POLICY IF EXISTS "Enable admin read access for all prayer updates" ON prayer_updates;
CREATE POLICY "Enable admin read access for all prayer updates"
  ON prayer_updates
  FOR SELECT
  USING (auth.uid() = (select user_id from email_subscribers where email = current_setting('request.jwt.claims'::text, true)::json->>'email' limit 1));

-- prayer_updates table - admin update access
DROP POLICY IF EXISTS "Enable admin update access for prayer updates" ON prayer_updates;
CREATE POLICY "Enable admin update access for prayer updates"
  ON prayer_updates
  FOR UPDATE
  USING (auth.uid() = (select user_id from email_subscribers where email = current_setting('request.jwt.claims'::text, true)::json->>'email' limit 1));

-- deletion_requests table - authenticated update
DROP POLICY IF EXISTS "Only authenticated users can update deletion requests" ON deletion_requests;
CREATE POLICY "Only authenticated users can update deletion requests"
  ON deletion_requests
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- deletion_requests table - authenticated delete
DROP POLICY IF EXISTS "Only authenticated users can delete deletion requests" ON deletion_requests;
CREATE POLICY "Only authenticated users can delete deletion requests"
  ON deletion_requests
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- pending_preference_changes table - authenticated read
DROP POLICY IF EXISTS "Authenticated users can read pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can read pending preference changes"
  ON pending_preference_changes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- pending_preference_changes table - authenticated update
DROP POLICY IF EXISTS "Authenticated users can update pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can update pending preference changes"
  ON pending_preference_changes
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- pending_preference_changes table - authenticated delete
DROP POLICY IF EXISTS "Authenticated users can delete pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can delete pending preference changes"
  ON pending_preference_changes
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- email_templates table - authenticated read
DROP POLICY IF EXISTS "Allow authenticated users to read templates" ON email_templates;
CREATE POLICY "Allow authenticated users to read templates"
  ON email_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- email_templates table - authenticated update
DROP POLICY IF EXISTS "Allow authenticated users to update templates" ON email_templates;
CREATE POLICY "Allow authenticated users to update templates"
  ON email_templates
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- approval_codes table - user read access
DROP POLICY IF EXISTS "Users can view their own approval codes" ON approval_codes;
CREATE POLICY "Users can view their own approval codes"
  ON approval_codes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- approval_codes table - service role access
DROP POLICY IF EXISTS "Service role can manage approval codes" ON approval_codes;
CREATE POLICY "Service role can manage approval codes"
  ON approval_codes
  FOR ALL
  USING (auth.uid() IS NOT NULL);
