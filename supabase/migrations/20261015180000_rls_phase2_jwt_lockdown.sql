-- RLS Phase 2: drop anon/MFA bypass policies; require Supabase JWT for signed-in PostgREST.
-- Idempotent: safe to re-run (e.g. test DB that applied an earlier revision of this file).
-- Pair with client waitForDataAccessReady() and admin backup using JWT bearer.
-- verification_codes stays service-role only (prior migration).

-- ---------------------------------------------------------------------------
-- Hour / item reminders (drop anon MFA "allow all")
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anon_user_prayer_hour_reminders_mfa_access" ON public.user_prayer_hour_reminders;
DROP POLICY IF EXISTS "Allow all user_prayer_hour_reminders access" ON public.user_prayer_hour_reminders;

DROP POLICY IF EXISTS "anon_user_memorization_hour_reminders_mfa_access" ON public.user_memorization_hour_reminders;
DROP POLICY IF EXISTS "Allow all user_memorization_hour_reminders access" ON public.user_memorization_hour_reminders;

DROP POLICY IF EXISTS "anon_user_prayer_item_reminders_mfa_access" ON public.user_prayer_item_reminders;
DROP POLICY IF EXISTS "Allow all user_prayer_item_reminders access" ON public.user_prayer_item_reminders;

REVOKE ALL ON TABLE public.user_prayer_hour_reminders FROM anon;
REVOKE ALL ON TABLE public.user_memorization_hour_reminders FROM anon;
REVOKE ALL ON TABLE public.user_prayer_item_reminders FROM anon;

REVOKE EXECUTE ON FUNCTION public.purge_user_prayer_item_reminders(text, text) FROM anon;

-- ---------------------------------------------------------------------------
-- Memorization
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anon_memorized_items_mfa_access" ON public.memorized_items;

REVOKE ALL ON TABLE public.memorized_items FROM anon;

DROP POLICY IF EXISTS "Allow all user_badge_read_state access" ON public.user_badge_read_state;

DROP POLICY IF EXISTS "user_badge_read_state_select_own" ON public.user_badge_read_state;
CREATE POLICY "user_badge_read_state_select_own"
  ON public.user_badge_read_state FOR SELECT TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "user_badge_read_state_insert_own" ON public.user_badge_read_state;
CREATE POLICY "user_badge_read_state_insert_own"
  ON public.user_badge_read_state FOR INSERT TO authenticated
  WITH CHECK (lower(user_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "user_badge_read_state_update_own" ON public.user_badge_read_state;
CREATE POLICY "user_badge_read_state_update_own"
  ON public.user_badge_read_state FOR UPDATE TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(user_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "user_badge_read_state_delete_own" ON public.user_badge_read_state;
CREATE POLICY "user_badge_read_state_delete_own"
  ON public.user_badge_read_state FOR DELETE TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "user_badge_read_state_admin_all" ON public.user_badge_read_state;
CREATE POLICY "user_badge_read_state_admin_all"
  ON public.user_badge_read_state FOR ALL TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));

REVOKE ALL ON TABLE public.user_badge_read_state FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) TO authenticated;

DROP POLICY IF EXISTS "Allow all personal_prayer_category_colors access" ON public.personal_prayer_category_colors;

DROP POLICY IF EXISTS "personal_prayer_category_colors_own" ON public.personal_prayer_category_colors;
CREATE POLICY "personal_prayer_category_colors_own"
  ON public.personal_prayer_category_colors FOR ALL TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(user_email) = lower(auth.jwt() ->> 'email'));

REVOKE ALL ON TABLE public.personal_prayer_category_colors FROM anon;

-- ---------------------------------------------------------------------------
-- Device tokens
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "device_tokens_anon_all" ON public.device_tokens;

REVOKE ALL ON TABLE public.device_tokens FROM anon;
REVOKE ALL ON TABLE public.push_notification_log FROM anon;

-- ---------------------------------------------------------------------------
-- Personal prayers — remove permissive public/anon paths
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all personal_prayers access" ON public.personal_prayers;
DROP POLICY IF EXISTS "Authenticated users can delete personal prayers" ON public.personal_prayers;
DROP POLICY IF EXISTS "Authenticated users can insert personal prayers" ON public.personal_prayers;
DROP POLICY IF EXISTS "Authenticated users can select personal prayers" ON public.personal_prayers;
DROP POLICY IF EXISTS "Authenticated users can update personal prayers" ON public.personal_prayers;
DROP POLICY IF EXISTS "Users can delete their own personal prayers" ON public.personal_prayers;
DROP POLICY IF EXISTS "Users can insert their own personal prayers" ON public.personal_prayers;
DROP POLICY IF EXISTS "Users can see their own personal prayers" ON public.personal_prayers;
DROP POLICY IF EXISTS "Users can update their own personal prayers" ON public.personal_prayers;

DROP POLICY IF EXISTS "personal_prayers_select_own" ON public.personal_prayers;
CREATE POLICY "personal_prayers_select_own"
  ON public.personal_prayers FOR SELECT TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "personal_prayers_insert_own" ON public.personal_prayers;
CREATE POLICY "personal_prayers_insert_own"
  ON public.personal_prayers FOR INSERT TO authenticated
  WITH CHECK (lower(user_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "personal_prayers_update_own" ON public.personal_prayers;
CREATE POLICY "personal_prayers_update_own"
  ON public.personal_prayers FOR UPDATE TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(user_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "personal_prayers_delete_own" ON public.personal_prayers;
CREATE POLICY "personal_prayers_delete_own"
  ON public.personal_prayers FOR DELETE TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'));

REVOKE ALL ON TABLE public.personal_prayers FROM anon;

-- ---------------------------------------------------------------------------
-- Community prayers — drop open anon; members read approved via JWT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all operations on prayers" ON public.prayers;
DROP POLICY IF EXISTS "Enable admin read access for all prayers" ON public.prayers;
DROP POLICY IF EXISTS "Enable admin update access for prayers" ON public.prayers;

DROP POLICY IF EXISTS "prayers_select_approved_authenticated" ON public.prayers;
CREATE POLICY "prayers_select_approved_authenticated"
  ON public.prayers FOR SELECT TO authenticated
  USING ((approval_status)::text = 'approved'::text);

DROP POLICY IF EXISTS "prayers_insert_member" ON public.prayers;
CREATE POLICY "prayers_insert_member"
  ON public.prayers FOR INSERT TO authenticated
  WITH CHECK (
    (approval_status)::text = 'pending'::text
    AND (
      email IS NULL
      OR lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "prayers_update_own" ON public.prayers;
CREATE POLICY "prayers_update_own"
  ON public.prayers FOR UPDATE TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

REVOKE ALL ON TABLE public.prayers FROM anon;

-- ---------------------------------------------------------------------------
-- email_subscribers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all deletes" ON public.email_subscribers;
DROP POLICY IF EXISTS "Allow all updates" ON public.email_subscribers;
DROP POLICY IF EXISTS "Allow public inserts" ON public.email_subscribers;
DROP POLICY IF EXISTS "Allow public reads" ON public.email_subscribers;
DROP POLICY IF EXISTS "Anonymous users can check approval status" ON public.email_subscribers;
DROP POLICY IF EXISTS "Allow authenticated to delete email subscribers" ON public.email_subscribers;
DROP POLICY IF EXISTS "Allow authenticated to insert email subscribers" ON public.email_subscribers;
DROP POLICY IF EXISTS "Allow authenticated to select email subscribers" ON public.email_subscribers;
DROP POLICY IF EXISTS "Allow authenticated to update email subscribers" ON public.email_subscribers;

DROP POLICY IF EXISTS "email_subscribers_select_own" ON public.email_subscribers;
CREATE POLICY "email_subscribers_select_own"
  ON public.email_subscribers FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "email_subscribers_update_own" ON public.email_subscribers;
CREATE POLICY "email_subscribers_update_own"
  ON public.email_subscribers FOR UPDATE TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "email_subscribers_insert_own" ON public.email_subscribers;
CREATE POLICY "email_subscribers_insert_own"
  ON public.email_subscribers FOR INSERT TO authenticated
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "email_subscribers_admin_all" ON public.email_subscribers;
CREATE POLICY "email_subscribers_admin_all"
  ON public.email_subscribers FOR ALL TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));

REVOKE ALL ON TABLE public.email_subscribers FROM anon;

-- Email approval links (logged-out admin); gated by pending account_approval_requests row.
CREATE OR REPLACE FUNCTION public.complete_account_approval_from_link(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_in_planning_center boolean DEFAULT NULL,
  p_planning_center_checked_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_request_id uuid;
BEGIN
  SELECT id INTO v_request_id
  FROM public.account_approval_requests
  WHERE lower(email) = v_email
    AND approval_status = 'pending'
  LIMIT 1;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'pending approval request not found';
  END IF;

  INSERT INTO public.email_subscribers (
    email,
    name,
    is_active,
    is_admin,
    receive_admin_emails,
    in_planning_center,
    planning_center_checked_at
  )
  VALUES (
    v_email,
    trim(p_first_name) || ' ' || trim(p_last_name),
    true,
    false,
    false,
    p_in_planning_center,
    p_planning_center_checked_at
  )
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true,
    in_planning_center = COALESCE(EXCLUDED.in_planning_center, public.email_subscribers.in_planning_center),
    planning_center_checked_at = COALESCE(
      EXCLUDED.planning_center_checked_at,
      public.email_subscribers.planning_center_checked_at
    );

  DELETE FROM public.account_approval_requests WHERE id = v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.deny_account_approval_from_link(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_request_id uuid;
BEGIN
  SELECT id INTO v_request_id
  FROM public.account_approval_requests
  WHERE lower(email) = v_email
    AND approval_status = 'pending'
  LIMIT 1;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'pending approval request not found';
  END IF;

  DELETE FROM public.account_approval_requests WHERE id = v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_account_approval_from_link(
  text, text, text, boolean, timestamptz
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.deny_account_approval_from_link(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_settings — login page anon read; signed-in read; admin write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all inserts on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow all updates on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow public reads on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated users can insert admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated users can read admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated users can update admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "authenticated_all_access" ON public.admin_settings;
DROP POLICY IF EXISTS "public_read_access" ON public.admin_settings;

DROP POLICY IF EXISTS "anon_read_admin_settings_login" ON public.admin_settings;
CREATE POLICY "anon_read_admin_settings_login"
  ON public.admin_settings FOR SELECT TO anon
  USING (id = 1);

DROP POLICY IF EXISTS "authenticated_read_admin_settings" ON public.admin_settings;
CREATE POLICY "authenticated_read_admin_settings"
  ON public.admin_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_settings_admin_write" ON public.admin_settings;
CREATE POLICY "admin_settings_admin_write"
  ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "admin_settings_admin_insert" ON public.admin_settings;
CREATE POLICY "admin_settings_admin_insert"
  ON public.admin_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));

-- ---------------------------------------------------------------------------
-- backup_logs — admin JWT only (manual backup + GitHub uses service_role)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all deletes" ON public.backup_logs;
DROP POLICY IF EXISTS "Allow all inserts" ON public.backup_logs;
DROP POLICY IF EXISTS "Allow all updates" ON public.backup_logs;
DROP POLICY IF EXISTS "Allow public reads" ON public.backup_logs;
DROP POLICY IF EXISTS "Anyone can read backup logs" ON public.backup_logs;
DROP POLICY IF EXISTS "Service role can insert backup logs" ON public.backup_logs;

DROP POLICY IF EXISTS "backup_logs_admin_select" ON public.backup_logs;
CREATE POLICY "backup_logs_admin_select"
  ON public.backup_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "backup_logs_admin_insert" ON public.backup_logs;
CREATE POLICY "backup_logs_admin_insert"
  ON public.backup_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));

REVOKE ALL ON TABLE public.backup_logs FROM anon;

-- ---------------------------------------------------------------------------
-- Prayed-for RPCs — authenticated only
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.increment_prayed_for_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_personal_prayed_for_count(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_member_prayed_for_count(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_prompt_prayed_for_counts(uuid[], text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_prompt_prayed_for_count(uuid, text) FROM anon;

-- ---------------------------------------------------------------------------
-- Memorization catalog — authenticated read; admin write (drop anon write)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all inserts on memorization_recommendations" ON public.memorization_recommendations;
DROP POLICY IF EXISTS "Allow all updates on memorization_recommendations" ON public.memorization_recommendations;
DROP POLICY IF EXISTS "Allow all deletes on memorization_recommendations" ON public.memorization_recommendations;

DROP POLICY IF EXISTS "Allow all inserts on memorization_recommendation_categories" ON public.memorization_recommendation_categories;
DROP POLICY IF EXISTS "Allow all updates on memorization_recommendation_categories" ON public.memorization_recommendation_categories;
DROP POLICY IF EXISTS "Allow all deletes on memorization_recommendation_categories" ON public.memorization_recommendation_categories;

DROP POLICY IF EXISTS "memorization_recommendations_select_authenticated" ON public.memorization_recommendations;
CREATE POLICY "memorization_recommendations_select_authenticated"
  ON public.memorization_recommendations FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "memorization_recommendations_admin_write" ON public.memorization_recommendations;
CREATE POLICY "memorization_recommendations_admin_write"
  ON public.memorization_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));
DROP POLICY IF EXISTS "memorization_recommendations_admin_update" ON public.memorization_recommendations;
CREATE POLICY "memorization_recommendations_admin_update"
  ON public.memorization_recommendations FOR UPDATE TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));
DROP POLICY IF EXISTS "memorization_recommendations_admin_delete" ON public.memorization_recommendations;
CREATE POLICY "memorization_recommendations_admin_delete"
  ON public.memorization_recommendations FOR DELETE TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "memorization_recommendation_categories_select_authenticated" ON public.memorization_recommendation_categories;
CREATE POLICY "memorization_recommendation_categories_select_authenticated"
  ON public.memorization_recommendation_categories FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "memorization_recommendation_categories_admin_write" ON public.memorization_recommendation_categories;
CREATE POLICY "memorization_recommendation_categories_admin_write"
  ON public.memorization_recommendation_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));
DROP POLICY IF EXISTS "memorization_recommendation_categories_admin_update" ON public.memorization_recommendation_categories;
CREATE POLICY "memorization_recommendation_categories_admin_update"
  ON public.memorization_recommendation_categories FOR UPDATE TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));
DROP POLICY IF EXISTS "memorization_recommendation_categories_admin_delete" ON public.memorization_recommendation_categories;
CREATE POLICY "memorization_recommendation_categories_admin_delete"
  ON public.memorization_recommendation_categories FOR DELETE TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'));

REVOKE ALL ON TABLE public.memorization_recommendations FROM anon;
REVOKE ALL ON TABLE public.memorization_recommendation_categories FROM anon;

-- Booklet inserts — admin write; authenticated read for print flows
DROP POLICY IF EXISTS "Allow all inserts on booklet_insert_pages" ON public.booklet_insert_pages;
DROP POLICY IF EXISTS "Allow all updates on booklet_insert_pages" ON public.booklet_insert_pages;
DROP POLICY IF EXISTS "Allow all deletes on booklet_insert_pages" ON public.booklet_insert_pages;

DROP POLICY IF EXISTS "booklet_insert_pages_admin_write" ON public.booklet_insert_pages;
CREATE POLICY "booklet_insert_pages_admin_write"
  ON public.booklet_insert_pages FOR ALL TO authenticated
  USING (public.is_admin(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "booklet_insert_pages_authenticated_read" ON public.booklet_insert_pages;
CREATE POLICY "booklet_insert_pages_authenticated_read"
  ON public.booklet_insert_pages FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.booklet_insert_pages FROM anon;

-- Member prayed-for counts (authenticated only)
REVOKE ALL ON TABLE public.member_prayed_for_counts FROM anon;
DROP POLICY IF EXISTS "Allow select on member_prayed_for_counts" ON public.member_prayed_for_counts;
CREATE POLICY "Allow select on member_prayed_for_counts"
  ON public.member_prayed_for_counts FOR SELECT TO authenticated
  USING (true);

-- Community prompts/types — authenticated read; drop anon
DROP POLICY IF EXISTS "Allow all deletes" ON public.prayer_prompts;
DROP POLICY IF EXISTS "Allow all inserts" ON public.prayer_prompts;
DROP POLICY IF EXISTS "Allow all updates" ON public.prayer_prompts;
DROP POLICY IF EXISTS "Allow all selects" ON public.prayer_prompts;
DROP POLICY IF EXISTS "Allow public reads" ON public.prayer_prompts;

REVOKE ALL ON TABLE public.prayer_prompts FROM anon;
REVOKE ALL ON TABLE public.prayer_types FROM anon;

DROP POLICY IF EXISTS "prayer_prompts_select_authenticated" ON public.prayer_prompts;
CREATE POLICY "prayer_prompts_select_authenticated"
  ON public.prayer_prompts FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "prayer_types_select_authenticated" ON public.prayer_types;
CREATE POLICY "prayer_types_select_authenticated"
  ON public.prayer_types FOR SELECT TO authenticated
  USING (true);

-- Admin SELECT for manual backup tables missing is_admin read policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'account_approval_requests',
      'approval_codes',
      'deletion_requests',
      'email_queue',
      'email_templates',
      'pending_preference_changes',
      'prayer_prompts',
      'prayer_types',
      'prayer_updates',
      'personal_prayer_updates',
      'update_deletion_requests',
      'user_preferences',
      'analytics'
    ])
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'rls_phase2_admin_select',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_admin(auth.jwt() ->> ''email''))',
      'rls_phase2_admin_select',
      tbl
    );
  END LOOP;
END $$;
