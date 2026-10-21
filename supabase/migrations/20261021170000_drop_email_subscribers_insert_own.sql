-- Signed-in users cannot create their own subscriber row.
-- Group-only rows come from invite_prayer_group_member.
-- Church rows come from register-planning-center-member or an admin insert.

DROP POLICY IF EXISTS "email_subscribers_insert_own" ON public.email_subscribers;

-- ROLLBACK
-- CREATE POLICY "email_subscribers_insert_own"
--   ON public.email_subscribers
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     lower(email) = lower((auth.jwt() ->> 'email'))
--     AND coalesce(is_admin, false) = false
--     AND coalesce(is_blocked, false) = false
--     AND auth_user_id IS NULL
--     AND is_church_member = false
--     AND church_downgraded_at IS NULL
--     AND coalesce(prayer_groups_enabled, false) = false
--   );
