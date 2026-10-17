-- Close leftover USING (true) policies that Phase 2 did not drop.
-- Permissive policies are OR'd, so an older allow-all policy overrides a tighter one.
-- Replacement policies match the PostgREST calls the app already makes.
-- Apply on the test project before production. Do not use supabase db push for this
-- repo: local migration versions and the remote history are not the same set.

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so a self-update check can read the current row
-- without recursing through RLS on the same table.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.subscriber_self_update_keeps_privileges(
  p_email text,
  p_is_admin boolean,
  p_is_blocked boolean,
  p_auth_user_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(es.email) = lower(p_email)
      AND es.is_admin IS NOT DISTINCT FROM p_is_admin
      AND coalesce(es.is_blocked, false) IS NOT DISTINCT FROM coalesce(p_is_blocked, false)
      AND es.auth_user_id IS NOT DISTINCT FROM p_auth_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.prayer_self_update_keeps_approval(
  p_id uuid,
  p_approval_status text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prayers p
    WHERE p.id = p_id
      AND p.approval_status::text IS NOT DISTINCT FROM p_approval_status
  );
$$;

REVOKE ALL ON FUNCTION public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prayer_self_update_keeps_approval(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prayer_self_update_keeps_approval(uuid, text) TO authenticated;

-- Admin emails and the two notification flags only. Members and the logged-out
-- approval form need this so they do not SELECT every column of every admin row.
CREATE OR REPLACE FUNCTION public.admin_notification_recipients()
RETURNS TABLE (
  email text,
  receive_admin_emails boolean,
  receive_admin_push boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    es.email,
    coalesce(es.receive_admin_emails, false),
    coalesce(es.receive_admin_push, false)
  FROM public.email_subscribers es
  WHERE es.is_admin IS TRUE
    AND coalesce(es.is_blocked, false) IS NOT TRUE;
$$;

CREATE OR REPLACE FUNCTION public.has_pending_account_approval(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_approval_requests r
    WHERE lower(r.email) = lower(trim(p_email))
      AND r.approval_status = 'pending'
  );
$$;

CREATE OR REPLACE FUNCTION public.account_approval_request_for_link(p_email text)
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  approval_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.email,
    r.first_name,
    r.last_name,
    r.approval_status
  FROM public.account_approval_requests r
  WHERE lower(r.email) = lower(trim(p_email))
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.admin_notification_recipients() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_pending_account_approval(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.account_approval_request_for_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_notification_recipients() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_pending_account_approval(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_approval_request_for_link(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- email_subscribers: own row cannot promote itself or change the auth link.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "email_subscribers_update_own" ON public.email_subscribers;
CREATE POLICY "email_subscribers_update_own"
  ON public.email_subscribers
  FOR UPDATE
  TO authenticated
  USING (lower(email) = lower((auth.jwt() ->> 'email')))
  WITH CHECK (
    lower(email) = lower((auth.jwt() ->> 'email'))
    AND public.subscriber_self_update_keeps_privileges(
      email,
      is_admin,
      is_blocked,
      auth_user_id
    )
  );

DROP POLICY IF EXISTS "email_subscribers_insert_own" ON public.email_subscribers;
CREATE POLICY "email_subscribers_insert_own"
  ON public.email_subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lower(email) = lower((auth.jwt() ->> 'email'))
    AND coalesce(is_admin, false) = false
    AND coalesce(is_blocked, false) = false
    AND auth_user_id IS NULL
  );

DROP POLICY IF EXISTS "email_subscribers_delete_own" ON public.email_subscribers;
CREATE POLICY "email_subscribers_delete_own"
  ON public.email_subscribers
  FOR DELETE
  TO authenticated
  USING (lower(email) = lower((auth.jwt() ->> 'email')));

-- ---------------------------------------------------------------------------
-- prayers: own update cannot approve itself. Own select lets insert..returning
-- see the pending row the member just submitted.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable read access for approved prayers" ON public.prayers;
DROP POLICY IF EXISTS "Users can view approved prayers" ON public.prayers;

DROP POLICY IF EXISTS "prayers_select_own" ON public.prayers;
CREATE POLICY "prayers_select_own"
  ON public.prayers
  FOR SELECT
  TO authenticated
  USING (lower((email)::text) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "prayers_update_own" ON public.prayers;
CREATE POLICY "prayers_update_own"
  ON public.prayers
  FOR UPDATE
  TO authenticated
  USING (lower((email)::text) = lower((auth.jwt() ->> 'email')))
  WITH CHECK (
    lower((email)::text) = lower((auth.jwt() ->> 'email'))
    AND public.prayer_self_update_keeps_approval(id, (approval_status)::text)
  );

DROP POLICY IF EXISTS "prayers_delete_own" ON public.prayers;
CREATE POLICY "prayers_delete_own"
  ON public.prayers
  FOR DELETE
  TO authenticated
  USING (lower((email)::text) = lower((auth.jwt() ->> 'email')));

-- ---------------------------------------------------------------------------
-- prayer_updates: drop allow-all and "any signed-in user" admin policies.
-- Approved rows stay readable. Pending inserts stay pending and are attributed
-- to the JWT email when the client omits author_email.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prayer_updates_fill_author_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.author_email IS NULL OR btrim(NEW.author_email) = '' THEN
    NEW.author_email := nullif(btrim(auth.jwt() ->> 'email'), '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prayer_updates_fill_author_email ON public.prayer_updates;
CREATE TRIGGER trg_prayer_updates_fill_author_email
  BEFORE INSERT ON public.prayer_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.prayer_updates_fill_author_email();

REVOKE ALL ON FUNCTION public.prayer_updates_fill_author_email() FROM PUBLIC;

DROP POLICY IF EXISTS "Allow all operations on prayer_updates" ON public.prayer_updates;
DROP POLICY IF EXISTS "Enable admin read access for all prayer updates" ON public.prayer_updates;
DROP POLICY IF EXISTS "Enable admin update access for prayer updates" ON public.prayer_updates;
DROP POLICY IF EXISTS "Enable read access for approved updates" ON public.prayer_updates;

DROP POLICY IF EXISTS "prayer_updates_select_approved" ON public.prayer_updates;
CREATE POLICY "prayer_updates_select_approved"
  ON public.prayer_updates
  FOR SELECT
  TO authenticated
  USING ((approval_status)::text = 'approved');

DROP POLICY IF EXISTS "prayer_updates_select_own" ON public.prayer_updates;
CREATE POLICY "prayer_updates_select_own"
  ON public.prayer_updates
  FOR SELECT
  TO authenticated
  USING (
    author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "prayer_updates_insert_pending" ON public.prayer_updates;
CREATE POLICY "prayer_updates_insert_pending"
  ON public.prayer_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (approval_status)::text = 'pending'
    AND author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "prayer_updates_delete_own" ON public.prayer_updates;
CREATE POLICY "prayer_updates_delete_own"
  ON public.prayer_updates
  FOR DELETE
  TO authenticated
  USING (
    author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

REVOKE ALL ON TABLE public.prayer_updates FROM anon;

-- ---------------------------------------------------------------------------
-- personal_prayer_updates: drop allow-all and any-signed-in-user policies.
-- Own-row and admin policies from earlier migrations stay.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all personal_prayer_updates access" ON public.personal_prayer_updates;
DROP POLICY IF EXISTS "Authenticated users can delete personal prayer updates" ON public.personal_prayer_updates;
DROP POLICY IF EXISTS "Authenticated users can insert personal prayer updates" ON public.personal_prayer_updates;
DROP POLICY IF EXISTS "Authenticated users can select personal prayer updates" ON public.personal_prayer_updates;
DROP POLICY IF EXISTS "Authenticated users can update personal prayer updates" ON public.personal_prayer_updates;

REVOKE ALL ON TABLE public.personal_prayer_updates FROM anon;

-- ---------------------------------------------------------------------------
-- prayer_prompts / prayer_types: signed-in read stays. Writes are admin-only.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can manage prompts" ON public.prayer_prompts;
DROP POLICY IF EXISTS "Anyone can read prayer prompts" ON public.prayer_prompts;

DROP POLICY IF EXISTS "prayer_prompts_admin_insert" ON public.prayer_prompts;
CREATE POLICY "prayer_prompts_admin_insert"
  ON public.prayer_prompts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "prayer_prompts_admin_update" ON public.prayer_prompts;
CREATE POLICY "prayer_prompts_admin_update"
  ON public.prayer_prompts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')))
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "prayer_prompts_admin_delete" ON public.prayer_prompts;
CREATE POLICY "prayer_prompts_admin_delete"
  ON public.prayer_prompts
  FOR DELETE
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "Allow all deletes" ON public.prayer_types;
DROP POLICY IF EXISTS "Allow all inserts" ON public.prayer_types;
DROP POLICY IF EXISTS "Allow all updates" ON public.prayer_types;
DROP POLICY IF EXISTS "Allow public reads" ON public.prayer_types;
DROP POLICY IF EXISTS "Anyone can manage prayer types" ON public.prayer_types;
DROP POLICY IF EXISTS "Anyone can read prayer types" ON public.prayer_types;

DROP POLICY IF EXISTS "prayer_types_admin_insert" ON public.prayer_types;
CREATE POLICY "prayer_types_admin_insert"
  ON public.prayer_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "prayer_types_admin_update" ON public.prayer_types;
CREATE POLICY "prayer_types_admin_update"
  ON public.prayer_types
  FOR UPDATE
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')))
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "prayer_types_admin_delete" ON public.prayer_types;
CREATE POLICY "prayer_types_admin_delete"
  ON public.prayer_types
  FOR DELETE
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')));

-- ---------------------------------------------------------------------------
-- email_templates: logged-out approval mail still reads templates.
-- Writes are admin-only.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all deletes" ON public.email_templates;
DROP POLICY IF EXISTS "Allow all inserts" ON public.email_templates;
DROP POLICY IF EXISTS "Allow all updates" ON public.email_templates;
DROP POLICY IF EXISTS "Allow authenticated users to update templates" ON public.email_templates;

DROP POLICY IF EXISTS "email_templates_admin_write" ON public.email_templates;
CREATE POLICY "email_templates_admin_write"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')))
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.email_templates FROM anon;

-- ---------------------------------------------------------------------------
-- member_prayer_updates has no author column. Any signed-in member can still
-- read and edit rows (the current UI). Anon cannot.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all delete on member_prayer_updates" ON public.member_prayer_updates;
DROP POLICY IF EXISTS "Allow all insert on member_prayer_updates" ON public.member_prayer_updates;
DROP POLICY IF EXISTS "Allow all select on member_prayer_updates" ON public.member_prayer_updates;
DROP POLICY IF EXISTS "Allow all update on member_prayer_updates" ON public.member_prayer_updates;
DROP POLICY IF EXISTS "Allow authenticated users to insert member updates" ON public.member_prayer_updates;
DROP POLICY IF EXISTS "Allow authenticated users to read member updates" ON public.member_prayer_updates;

DROP POLICY IF EXISTS "member_prayer_updates_select_authenticated" ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_select_authenticated"
  ON public.member_prayer_updates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "member_prayer_updates_insert_authenticated" ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_insert_authenticated"
  ON public.member_prayer_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "member_prayer_updates_update_authenticated" ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_update_authenticated"
  ON public.member_prayer_updates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "member_prayer_updates_delete_authenticated" ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_delete_authenticated"
  ON public.member_prayer_updates
  FOR DELETE
  TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.member_prayer_updates FROM anon;

-- ---------------------------------------------------------------------------
-- Deletion requests: members insert their own and read that row back.
-- Admins keep the existing manage policy on deletion_requests.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can submit deletion requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Anyone can view deletion requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Only authenticated users can delete deletion requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Only authenticated users can update deletion requests" ON public.deletion_requests;

DROP POLICY IF EXISTS "deletion_requests_insert_own" ON public.deletion_requests;
CREATE POLICY "deletion_requests_insert_own"
  ON public.deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (lower(requested_email) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "deletion_requests_select_own" ON public.deletion_requests;
CREATE POLICY "deletion_requests_select_own"
  ON public.deletion_requests
  FOR SELECT
  TO authenticated
  USING (lower(requested_email) = lower((auth.jwt() ->> 'email')));

REVOKE ALL ON TABLE public.deletion_requests FROM anon;

DROP POLICY IF EXISTS "Allow all operations on update_deletion_requests" ON public.update_deletion_requests;

DROP POLICY IF EXISTS "update_deletion_requests_admin_all" ON public.update_deletion_requests;
CREATE POLICY "update_deletion_requests_admin_all"
  ON public.update_deletion_requests
  FOR ALL
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')))
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "update_deletion_requests_insert_own" ON public.update_deletion_requests;
CREATE POLICY "update_deletion_requests_insert_own"
  ON public.update_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (lower(requested_email) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "update_deletion_requests_select_own" ON public.update_deletion_requests;
CREATE POLICY "update_deletion_requests_select_own"
  ON public.update_deletion_requests
  FOR SELECT
  TO authenticated
  USING (lower(requested_email) = lower((auth.jwt() ->> 'email')));

REVOKE ALL ON TABLE public.update_deletion_requests FROM anon;

-- ---------------------------------------------------------------------------
-- account_approval_requests: table access is admin-only.
-- Logged-out login and the emailed link use the functions above.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow delete account approval requests" ON public.account_approval_requests;
DROP POLICY IF EXISTS "Allow read account approval requests" ON public.account_approval_requests;
DROP POLICY IF EXISTS "Allow update account approval requests" ON public.account_approval_requests;
DROP POLICY IF EXISTS "Anon users can create account approval request" ON public.account_approval_requests;
DROP POLICY IF EXISTS "Authenticated users can create account approval request" ON public.account_approval_requests;
DROP POLICY IF EXISTS "Read account approval requests" ON public.account_approval_requests;

DROP POLICY IF EXISTS "account_approval_requests_admin_all" ON public.account_approval_requests;
CREATE POLICY "account_approval_requests_admin_all"
  ON public.account_approval_requests
  FOR ALL
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')))
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));

REVOKE ALL ON TABLE public.account_approval_requests FROM anon;

-- ---------------------------------------------------------------------------
-- memorized_items: admins can read every row for analytics.
-- Members stay on the own-row policies.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "memorized_items_admin_select" ON public.memorized_items;
CREATE POLICY "memorized_items_admin_select"
  ON public.memorized_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')));

-- ---------------------------------------------------------------------------
-- admin_settings: anon keeps SELECT for the login code length.
-- Anon writes are revoked. github_token stays on the row and is already null;
-- punching it out of a table-level SELECT would break every named-column read
-- that shares that grant.
-- ---------------------------------------------------------------------------

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.admin_settings FROM anon;
