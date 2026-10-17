-- One transaction removes a subscriber, their prayers when asked, and their sign-in.
-- The caller cannot delete a second auth user when the linked id and the email disagree.

CREATE OR REPLACE FUNCTION public.delete_subscriber_account(
  p_subscriber_id uuid,
  p_delete_prayers boolean,
  p_session_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_linked uuid;
  v_by_email uuid;
  v_auth_id uuid;
BEGIN
  SELECT lower(trim(email)), auth_user_id
    INTO v_email, v_linked
  FROM public.email_subscribers
  WHERE id = p_subscriber_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscriber not found';
  END IF;

  SELECT id
    INTO v_by_email
  FROM auth.users
  WHERE email IS NOT NULL
    AND lower(email) = v_email
  LIMIT 1;

  IF v_linked IS NOT NULL
     AND v_by_email IS NOT NULL
     AND v_linked IS DISTINCT FROM v_by_email THEN
    RAISE EXCEPTION 'sign-in does not match the subscriber';
  END IF;

  v_auth_id := coalesce(v_by_email, v_linked);

  IF p_session_user_id IS NOT NULL
     AND v_auth_id IS NOT NULL
     AND v_auth_id IS DISTINCT FROM p_session_user_id THEN
    RAISE EXCEPTION 'sign-in does not match the subscriber';
  END IF;

  IF coalesce(p_delete_prayers, false) THEN
    DELETE FROM public.prayer_updates WHERE lower(trim(author_email)) = v_email;
    DELETE FROM public.prayers WHERE lower(trim(email)) = v_email;
    DELETE FROM public.personal_prayers WHERE lower(trim(user_email)) = v_email;
  END IF;

  IF v_auth_id IS NOT NULL THEN
    UPDATE public.deletion_requests
      SET reviewed_by = NULL
      WHERE reviewed_by = v_auth_id;
    UPDATE public.update_deletion_requests
      SET reviewed_by = NULL
      WHERE reviewed_by = v_auth_id;
  END IF;

  DELETE FROM public.email_subscribers WHERE id = p_subscriber_id;

  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_subscriber_account(p_delete_prayers boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(auth.jwt() ->> 'email'));
  v_uid uuid := auth.uid();
  v_subscriber_id uuid;
  v_user_email text;
BEGIN
  IF v_uid IS NULL OR v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id
    INTO v_subscriber_id
  FROM public.email_subscribers
  WHERE lower(trim(email)) = v_email;

  IF v_subscriber_id IS NOT NULL THEN
    PERFORM public.delete_subscriber_account(v_subscriber_id, p_delete_prayers, v_uid);
    RETURN;
  END IF;

  -- The subscriber row is already gone. Remove this session's sign-in only.

  SELECT lower(email)
    INTO v_user_email
  FROM auth.users
  WHERE id = v_uid;

  IF v_user_email IS NULL OR v_user_email <> v_email THEN
    RAISE EXCEPTION 'Subscriber not found';
  END IF;

  IF coalesce(p_delete_prayers, false) THEN
    DELETE FROM public.prayer_updates WHERE lower(trim(author_email)) = v_email;
    DELETE FROM public.prayers WHERE lower(trim(email)) = v_email;
    DELETE FROM public.personal_prayers WHERE lower(trim(user_email)) = v_email;
  END IF;

  UPDATE public.deletion_requests SET reviewed_by = NULL WHERE reviewed_by = v_uid;
  UPDATE public.update_deletion_requests SET reviewed_by = NULL WHERE reviewed_by = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_email_subscriber(p_subscriber_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(auth.jwt() ->> 'email'));
  v_target_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL OR v_email IS NULL OR v_email = '' OR p_subscriber_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT public.is_admin(v_email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT es.is_admin IS TRUE
    INTO v_target_is_admin
  FROM public.email_subscribers es
  WHERE es.id = p_subscriber_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscriber not found';
  END IF;
  IF v_target_is_admin THEN
    RAISE EXCEPTION 'Admin subscribers are unsubscribed, not deleted';
  END IF;

  PERFORM public.delete_subscriber_account(p_subscriber_id, false, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_subscriber_account(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_own_subscriber_account(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_email_subscriber(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_subscriber_account(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_email_subscriber(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.lookup_auth_user_id_by_email(text);

-- ROLLBACK
-- DROP FUNCTION IF EXISTS public.admin_delete_email_subscriber(uuid);
-- DROP FUNCTION IF EXISTS public.delete_own_subscriber_account(boolean);
-- DROP FUNCTION IF EXISTS public.delete_subscriber_account(uuid, boolean, uuid);
