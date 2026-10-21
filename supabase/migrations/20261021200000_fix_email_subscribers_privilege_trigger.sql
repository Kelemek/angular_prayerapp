-- Fix privilege-column trigger: is_admin(text) requires JWT email; service_role bypasses via role claim.

CREATE OR REPLACE FUNCTION public.email_subscribers_keep_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role');
  v_actor text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
BEGIN
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked
     OR NEW.church_downgraded_at IS DISTINCT FROM OLD.church_downgraded_at
     OR NEW.is_church_member IS DISTINCT FROM OLD.is_church_member THEN
    IF v_role = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF v_actor <> '' AND public.is_admin(v_actor) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.email_subscribers_keep_privilege_columns()
  FROM PUBLIC, anon;

-- ROLLBACK
-- Recreate broken body from 20261021150000 (public.is_admin() with no args) if reverting only this file.
