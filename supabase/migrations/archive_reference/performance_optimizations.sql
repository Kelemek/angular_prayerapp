-- Performance Optimizations: Database Linter Fixes
-- Priority 1: Fix duplicate indexes
-- Priority 2: Wrap auth functions in subqueries for RLS policies
-- Priority 3: Consolidate multiple permissive policies

-- ============================================================================
-- PRIORITY 1: DROP DUPLICATE INDEX
-- ============================================================================

-- Table: prayer_prompts - Drop duplicate index (keep idx_prayer_prompts_created_at)
DROP INDEX IF EXISTS idx_prayer_prompts_created;

-- ============================================================================
-- PRIORITY 2: WRAP auth.uid() IN SUBQUERIES FOR RLS POLICIES
-- ============================================================================
-- This prevents re-evaluation of auth.uid() for each row and improves performance

-- prayers table - admin read policy
DROP POLICY IF EXISTS "Enable admin read access for all prayers" ON prayers;
CREATE POLICY "Enable admin read access for all prayers"
  ON prayers
  FOR SELECT
  USING ((select auth.uid()) = (select user_id from email_subscribers where email = current_setting('request.jwt.claims'::text, true)::json->>'email' limit 1));

-- prayers table - admin update policy
DROP POLICY IF EXISTS "Enable admin update access for prayers" ON prayers;
CREATE POLICY "Enable admin update access for prayers"
  ON prayers
  FOR UPDATE
  USING ((select auth.uid()) = (select user_id from email_subscribers where email = current_setting('request.jwt.claims'::text, true)::json->>'email' limit 1));

-- prayer_updates table - admin read policy
DROP POLICY IF EXISTS "Enable admin read access for all prayer updates" ON prayer_updates;
CREATE POLICY "Enable admin read access for all prayer updates"
  ON prayer_updates
  FOR SELECT
  USING ((select auth.uid()) = (select user_id from email_subscribers where email = current_setting('request.jwt.claims'::text, true)::json->>'email' limit 1));

-- prayer_updates table - admin update policy
DROP POLICY IF EXISTS "Enable admin update access for prayer updates" ON prayer_updates;
CREATE POLICY "Enable admin update access for prayer updates"
  ON prayer_updates
  FOR UPDATE
  USING ((select auth.uid()) = (select user_id from email_subscribers where email = current_setting('request.jwt.claims'::text, true)::json->>'email' limit 1));

-- deletion_requests table - update policy
DROP POLICY IF EXISTS "Only authenticated users can update deletion requests" ON deletion_requests;
CREATE POLICY "Only authenticated users can update deletion requests"
  ON deletion_requests
  FOR UPDATE
  USING ((select auth.uid()) IS NOT NULL);

-- deletion_requests table - delete policy
DROP POLICY IF EXISTS "Only authenticated users can delete deletion requests" ON deletion_requests;
CREATE POLICY "Only authenticated users can delete deletion requests"
  ON deletion_requests
  FOR DELETE
  USING ((select auth.uid()) IS NOT NULL);

-- pending_preference_changes table - read policy
DROP POLICY IF EXISTS "Authenticated users can read pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can read pending preference changes"
  ON pending_preference_changes
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- pending_preference_changes table - update policy
DROP POLICY IF EXISTS "Authenticated users can update pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can update pending preference changes"
  ON pending_preference_changes
  FOR UPDATE
  USING ((select auth.uid()) IS NOT NULL);

-- pending_preference_changes table - delete policy
DROP POLICY IF EXISTS "Authenticated users can delete pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can delete pending preference changes"
  ON pending_preference_changes
  FOR DELETE
  USING ((select auth.uid()) IS NOT NULL);

-- email_templates table - read policy
DROP POLICY IF EXISTS "Allow authenticated users to read templates" ON email_templates;
CREATE POLICY "Allow authenticated users to read templates"
  ON email_templates
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- email_templates table - update policy
DROP POLICY IF EXISTS "Allow authenticated users to update templates" ON email_templates;
CREATE POLICY "Allow authenticated users to update templates"
  ON email_templates
  FOR UPDATE
  USING ((select auth.uid()) IS NOT NULL);

-- approval_codes table - read policy
DROP POLICY IF EXISTS "Users can view their own approval codes" ON approval_codes;
CREATE POLICY "Users can view their own approval codes"
  ON approval_codes
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- approval_codes table - service role policy
DROP POLICY IF EXISTS "Service role can manage approval codes" ON approval_codes;
CREATE POLICY "Service role can manage approval codes"
  ON approval_codes
  FOR ALL
  USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PRIORITY 3: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ============================================================================
-- Combine overlapping policies to reduce query overhead

-- admin_settings - consolidate authenticated policies
DROP POLICY IF EXISTS "Authenticated users can insert admin settings" ON admin_settings;
DROP POLICY IF EXISTS "authenticated_all_access" ON admin_settings;
CREATE POLICY "Authenticated users can manage admin settings"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- prayer_types - consolidate read policies
DROP POLICY IF EXISTS "Anyone can read prayer types" ON prayer_types;
DROP POLICY IF EXISTS "Anyone can manage prayer types" ON prayer_types;
CREATE POLICY "Anyone can manage prayer types"
  ON prayer_types
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- prayer_prompts - consolidate read policies
DROP POLICY IF EXISTS "Anyone can read prayer prompts" ON prayer_prompts;
DROP POLICY IF EXISTS "Anyone can manage prompts" ON prayer_prompts;
CREATE POLICY "Anyone can manage prayer prompts"
  ON prayer_prompts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- email_templates - consolidate read policies
DROP POLICY IF EXISTS "Allow all to read templates" ON email_templates;
DROP POLICY IF EXISTS "Allow authenticated users to read templates" ON email_templates;
CREATE POLICY "Allow all to read email templates"
  ON email_templates
  FOR SELECT
  USING (true);

-- email_subscribers - consolidate read policies
DROP POLICY IF EXISTS "Anyone can read email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Authenticated users can read email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Anonymous users can check approval status" ON email_subscribers;
CREATE POLICY "Allow all to read email subscribers"
  ON email_subscribers
  FOR SELECT
  USING (true);

-- pending_preference_changes - consolidate insert policies
DROP POLICY IF EXISTS "Anyone can insert pending preference changes" ON pending_preference_changes;
DROP POLICY IF EXISTS "Anyone can insert preference changes" ON pending_preference_changes;
CREATE POLICY "Anyone can insert pending preference changes"
  ON pending_preference_changes
  FOR INSERT
  WITH CHECK (true);

-- pending_preference_changes - consolidate select policies
DROP POLICY IF EXISTS "Anyone can read their own preference changes" ON pending_preference_changes;
DROP POLICY IF EXISTS "Authenticated users can read pending preference changes" ON pending_preference_changes;
CREATE POLICY "Anyone can read pending preference changes"
  ON pending_preference_changes
  FOR SELECT
  USING (true);

-- status_change_requests - consolidate insert policies
DROP POLICY IF EXISTS "Anyone can submit status change requests" ON status_change_requests;
DROP POLICY IF EXISTS "Admins can manage status_change_requests" ON status_change_requests;
CREATE POLICY "Anyone can manage status change requests"
  ON status_change_requests
  FOR INSERT
  WITH CHECK (true);

-- status_change_requests - consolidate select policies
DROP POLICY IF EXISTS "Anyone can view status change requests" ON status_change_requests;
DROP POLICY IF EXISTS "Admins can manage status_change_requests" ON status_change_requests;
CREATE POLICY "Anyone can view status change requests"
  ON status_change_requests
  FOR SELECT
  USING (true);

-- status_change_requests - consolidate update policies
DROP POLICY IF EXISTS "Allow admin updates to status change requests" ON status_change_requests;
DROP POLICY IF EXISTS "Admins can manage status_change_requests" ON status_change_requests;
CREATE POLICY "Anyone can update status change requests"
  ON status_change_requests
  FOR UPDATE
  USING (true);

-- deletion_requests - consolidate policies
DROP POLICY IF EXISTS "Anyone can submit deletion requests" ON deletion_requests;
DROP POLICY IF EXISTS "Anyone can view deletion requests" ON deletion_requests;
DROP POLICY IF EXISTS "Admins can manage deletion_requests" ON deletion_requests;
DROP POLICY IF EXISTS "Only authenticated users can update deletion requests" ON deletion_requests;
DROP POLICY IF EXISTS "Only authenticated users can delete deletion requests" ON deletion_requests;
CREATE POLICY "Anyone can manage deletion requests"
  ON deletion_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- prayers - consolidate to single policy per action
DROP POLICY IF EXISTS "Admins can view all prayers" ON prayers;
DROP POLICY IF EXISTS "Enable admin read access for all prayers" ON prayers;
DROP POLICY IF EXISTS "Enable read access for approved prayers" ON prayers;
DROP POLICY IF EXISTS "Users can view approved prayers" ON prayers;
DROP POLICY IF EXISTS "Allow all operations on prayers" ON prayers;
CREATE POLICY "Anyone can view prayers"
  ON prayers
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can modify all prayers" ON prayers;
DROP POLICY IF EXISTS "Enable admin update access for prayers" ON prayers;
DROP POLICY IF EXISTS "Allow all operations on prayers" ON prayers;
CREATE POLICY "Anyone can manage prayers"
  ON prayers
  FOR INSERT, UPDATE, DELETE
  USING (true)
  WITH CHECK (true);

-- prayer_updates - consolidate to single policy per action
DROP POLICY IF EXISTS "Admins can manage prayer_updates" ON prayer_updates;
DROP POLICY IF EXISTS "Allow all operations on prayer_updates" ON prayer_updates;
DROP POLICY IF EXISTS "Enable admin read access for all prayer updates" ON prayer_updates;
DROP POLICY IF EXISTS "Enable read access for approved updates" ON prayer_updates;
CREATE POLICY "Anyone can view prayer updates"
  ON prayer_updates
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enable admin update access for prayer updates" ON prayer_updates;
DROP POLICY IF EXISTS "Allow all operations on prayer_updates" ON prayer_updates;
CREATE POLICY "Anyone can manage prayer updates"
  ON prayer_updates
  FOR INSERT, UPDATE, DELETE
  USING (true)
  WITH CHECK (true);
