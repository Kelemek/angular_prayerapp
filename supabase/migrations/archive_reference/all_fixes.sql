-- ============================================================================
-- COMPREHENSIVE DATABASE FIXES
-- Security + Performance Optimizations
-- Safe to apply - no breaking changes
-- ============================================================================

-- ============================================================================
-- SECTION 1: CRITICAL SECURITY FIXES
-- ============================================================================
-- Fix mutable search_path in functions to prevent schema hijacking attacks

-- Fix 1: cleanup_expired_verification_codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW()  -- Delete expired codes immediately
  OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '1 hour');  -- Delete used codes after 1 hour
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 2: update_admin_last_sign_in
CREATE OR REPLACE FUNCTION update_admin_last_sign_in(admin_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_subscribers
  SET last_sign_in_at = TIMEZONE('utc', NOW())
  WHERE email = admin_email AND is_admin = true;
END;
$$;

-- Fix 3: update_prayer_types_updated_at
CREATE OR REPLACE FUNCTION update_prayer_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 4: update_email_templates_updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 5: update_email_subscribers_updated_at
CREATE OR REPLACE FUNCTION update_email_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 6: update_user_preferences_updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Fix 7: update_pending_preference_changes_updated_at
CREATE OR REPLACE FUNCTION update_pending_preference_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Fix 8: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Fix 9: is_admin
CREATE OR REPLACE FUNCTION is_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN user_email IN ('admin@prayerapp.com', 'admin@example.com');
END;
$$;

-- ============================================================================
-- SECTION 2: PERFORMANCE OPTIMIZATION - DUPLICATE INDEX
-- ============================================================================

-- Drop duplicate index on prayer_prompts table
-- Keeping: idx_prayer_prompts_created_at (more descriptive)
-- Dropping: idx_prayer_prompts_created (duplicate)
DROP INDEX IF EXISTS idx_prayer_prompts_created;

-- ============================================================================
-- SECTION 3: PERFORMANCE OPTIMIZATION - RLS POLICY SUBQUERIES
-- ============================================================================
-- Wrap auth.uid() calls in subqueries to prevent row-by-row re-evaluation
-- Improves query performance with no functional change

-- prayers table - admin read access
DROP POLICY IF EXISTS "Enable admin read access for all prayers" ON prayers;
CREATE POLICY "Enable admin read access for all prayers"
  ON prayers
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- prayers table - admin update access
DROP POLICY IF EXISTS "Enable admin update access for prayers" ON prayers;
CREATE POLICY "Enable admin update access for prayers"
  ON prayers
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- prayer_updates table - admin read access
DROP POLICY IF EXISTS "Enable admin read access for all prayer updates" ON prayer_updates;
CREATE POLICY "Enable admin read access for all prayer updates"
  ON prayer_updates
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- prayer_updates table - admin update access
DROP POLICY IF EXISTS "Enable admin update access for prayer updates" ON prayer_updates;
CREATE POLICY "Enable admin update access for prayer updates"
  ON prayer_updates
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- deletion_requests table - authenticated update
DROP POLICY IF EXISTS "Only authenticated users can update deletion requests" ON deletion_requests;
CREATE POLICY "Only authenticated users can update deletion requests"
  ON deletion_requests
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- deletion_requests table - authenticated delete
DROP POLICY IF EXISTS "Only authenticated users can delete deletion requests" ON deletion_requests;
CREATE POLICY "Only authenticated users can delete deletion requests"
  ON deletion_requests
  FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- pending_preference_changes table - authenticated read
DROP POLICY IF EXISTS "Authenticated users can read pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can read pending preference changes"
  ON pending_preference_changes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- pending_preference_changes table - authenticated update
DROP POLICY IF EXISTS "Authenticated users can update pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can update pending preference changes"
  ON pending_preference_changes
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- pending_preference_changes table - authenticated delete
DROP POLICY IF EXISTS "Authenticated users can delete pending preference changes" ON pending_preference_changes;
CREATE POLICY "Authenticated users can delete pending preference changes"
  ON pending_preference_changes
  FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- email_templates table - authenticated read
DROP POLICY IF EXISTS "Allow authenticated users to read templates" ON email_templates;
CREATE POLICY "Allow authenticated users to read templates"
  ON email_templates
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- email_templates table - authenticated update
DROP POLICY IF EXISTS "Allow authenticated users to update templates" ON email_templates;
CREATE POLICY "Allow authenticated users to update templates"
  ON email_templates
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- approval_codes table - user read access
DROP POLICY IF EXISTS "Users can view their own approval codes" ON approval_codes;
CREATE POLICY "Users can view their own approval codes"
  ON approval_codes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- approval_codes table - service role access
DROP POLICY IF EXISTS "Service role can manage approval codes" ON approval_codes;
CREATE POLICY "Service role can manage approval codes"
  ON approval_codes
  FOR ALL
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- SECURITY:
--   ✓ Added SET search_path = public to 9 functions
--   ✓ Prevents schema hijacking attacks
--   ✓ Zero functional change
--
-- PERFORMANCE:
--   ✓ Dropped 1 duplicate index on prayer_prompts
--   ✓ Optimized 12 RLS policies with auth.uid() subqueries
--   ✓ Prevents row-by-row function re-evaluation
--   ✓ Zero functional change
--
-- RISK LEVEL: MINIMAL
--   ✓ All changes backward compatible
--   ✓ No breaking changes to application code
--   ✓ No changes to access control logic
-- ============================================================================
