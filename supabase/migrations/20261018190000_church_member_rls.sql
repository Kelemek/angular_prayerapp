-- Phase 4 / Phase A: church reads, church writes, and church counters require
-- is_church_member(). Own-row policies and admin policies stay. is_admin()
-- already requires is_church_member, so an admin is still a church member.
-- prayer_types SELECT is church-only. email_templates SELECT stays any
-- signed-in user. Templates are not church prayers, and the service role
-- sends mail without this policy.

DROP POLICY IF EXISTS "prayers_select_approved_authenticated" ON public.prayers;
CREATE POLICY "prayers_select_approved_authenticated"
  ON public.prayers FOR SELECT TO authenticated
  USING (
    (approval_status)::text = 'approved'::text
    AND public.is_church_member()
  );

DROP POLICY IF EXISTS "prayers_insert_member" ON public.prayers;
CREATE POLICY "prayers_insert_member"
  ON public.prayers FOR INSERT TO authenticated
  WITH CHECK (
    public.is_church_member()
    AND (approval_status)::text = 'pending'::text
    AND (
      email IS NULL
      OR lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "prayer_updates_select_approved" ON public.prayer_updates;
CREATE POLICY "prayer_updates_select_approved"
  ON public.prayer_updates
  FOR SELECT
  TO authenticated
  USING (
    (approval_status)::text = 'approved'
    AND public.is_church_member()
  );

DROP POLICY IF EXISTS "prayer_updates_insert_pending" ON public.prayer_updates;
CREATE POLICY "prayer_updates_insert_pending"
  ON public.prayer_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_church_member()
    AND (approval_status)::text = 'pending'
    AND author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "prayer_prompts_select_authenticated" ON public.prayer_prompts;
CREATE POLICY "prayer_prompts_select_authenticated"
  ON public.prayer_prompts FOR SELECT TO authenticated
  USING (public.is_church_member());

DROP POLICY IF EXISTS "prayer_types_select_authenticated" ON public.prayer_types;
CREATE POLICY "prayer_types_select_authenticated"
  ON public.prayer_types FOR SELECT TO authenticated
  USING (public.is_church_member());

DROP POLICY IF EXISTS "member_prayer_updates_select_authenticated" ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_select_authenticated"
  ON public.member_prayer_updates
  FOR SELECT
  TO authenticated
  USING (public.is_church_member());

DROP POLICY IF EXISTS "member_prayer_updates_insert_authenticated" ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_insert_authenticated"
  ON public.member_prayer_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_church_member()
    AND author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "member_prayer_updates_update_own" ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_update_own"
  ON public.member_prayer_updates
  FOR UPDATE
  TO authenticated
  USING (
    public.is_church_member()
    AND author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    public.is_church_member()
    AND author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "member_prayer_updates_delete_own" ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_delete_own"
  ON public.member_prayer_updates
  FOR DELETE
  TO authenticated
  USING (
    public.is_church_member()
    AND author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "Allow select on member_prayed_for_counts" ON public.member_prayed_for_counts;
CREATE POLICY "Allow select on member_prayed_for_counts"
  ON public.member_prayed_for_counts FOR SELECT TO authenticated
  USING (public.is_church_member());

DROP POLICY IF EXISTS "Allow select own prompt prayed counts" ON public.prompt_prayed_for_counts;
CREATE POLICY "Allow select own prompt prayed counts"
  ON public.prompt_prayed_for_counts
  FOR SELECT
  TO authenticated
  USING (
    public.is_church_member()
    AND lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "booklet_insert_pages_authenticated_read" ON public.booklet_insert_pages;
CREATE POLICY "booklet_insert_pages_authenticated_read"
  ON public.booklet_insert_pages FOR SELECT TO authenticated
  USING (public.is_church_member());

CREATE OR REPLACE FUNCTION public.increment_prayed_for_count(prayer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_count integer;
BEGIN
  IF NOT public.is_church_member() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE prayers
  SET prayed_for_count = COALESCE(prayed_for_count, 0) + 1
  WHERE id = prayer_id
  RETURNING prayed_for_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_member_prayed_for_count(p_person_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_count integer;
  trimmed_id text;
BEGIN
  IF NOT public.is_church_member() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  trimmed_id := nullif(trim(p_person_id), '');
  IF trimmed_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO member_prayed_for_counts (person_id, prayed_for_count, updated_at)
  VALUES (trimmed_id, 1, now())
  ON CONFLICT (person_id) DO UPDATE
    SET prayed_for_count = member_prayed_for_counts.prayed_for_count + 1,
        updated_at = now()
  RETURNING prayed_for_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_prompt_prayed_for_counts(
  p_prompt_ids uuid[],
  p_user_email text DEFAULT NULL
)
RETURNS TABLE (prompt_id uuid, prayed_for_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_email text;
BEGIN
  IF NOT public.is_church_member() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  caller_email := lower(
    nullif(trim(coalesce(auth.jwt() ->> 'email', p_user_email)), '')
  );
  IF caller_email IS NULL OR p_prompt_ids IS NULL OR cardinality(p_prompt_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.prompt_id, c.prayed_for_count
  FROM prompt_prayed_for_counts c
  WHERE c.user_email = caller_email
    AND c.prompt_id = ANY (p_prompt_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_prompt_prayed_for_count(
  p_prompt_id uuid,
  p_user_email text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_count integer;
  caller_email text;
BEGIN
  IF NOT public.is_church_member() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  caller_email := lower(
    nullif(trim(coalesce(auth.jwt() ->> 'email', p_user_email)), '')
  );
  IF caller_email IS NULL OR p_prompt_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM prayer_prompts WHERE id = p_prompt_id) THEN
    RETURN NULL;
  END IF;

  INSERT INTO prompt_prayed_for_counts (prompt_id, user_email, prayed_for_count, updated_at)
  VALUES (p_prompt_id, caller_email, 1, now())
  ON CONFLICT (prompt_id, user_email) DO UPDATE
    SET prayed_for_count = prompt_prayed_for_counts.prayed_for_count + 1,
        updated_at = now()
  RETURNING prayed_for_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_user_badge_read_state(
  p_user_email text,
  p_prayers_data jsonb,
  p_prompts_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_church_member() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public.require_session_email(p_user_email);
  PERFORM public.upsert_user_badge_read_state_unchecked(
    p_user_email,
    p_prayers_data,
    p_prompts_data
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_prayed_for_count(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_member_prayed_for_count(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_prompt_prayed_for_counts(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_prompt_prayed_for_count(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.increment_prayed_for_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_member_prayed_for_count(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_prompt_prayed_for_counts(uuid[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_prompt_prayed_for_count(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) TO authenticated, service_role;

-- ROLLBACK
-- Restore the policies and function bodies from:
-- 20261015180000_rls_phase2_jwt_lockdown.sql (prayers, prompts, types, booklet, member counts)
-- 20261016140000_rls_lockdown_leftover_policies.sql (prayer_updates, member_prayer_updates select)
-- 20261016150000_member_prayer_update_author.sql (member update insert/update/delete)
-- 20260727170000_prompt_prayed_for_counts.sql (prompt count policy and RPCs)
-- 20260224_prayer_encouragement.sql (increment_prayed_for_count)
-- 20260727160000_member_prayed_for_counts.sql (increment_member_prayed_for_count)
-- 20261016200000_lock_email_queue_and_session_writes.sql (upsert_user_badge_read_state)
-- Then re-apply the Phase 3 execute grants in 20261017170000_rls_phase3_function_execute.sql.
