-- Non-admins must not delete email_subscribers through PostgREST.
-- Account deletion stays on delete_own_subscriber_account / admin_delete_email_subscriber.

DROP POLICY IF EXISTS "email_subscribers_delete_own" ON public.email_subscribers;

CREATE OR REPLACE FUNCTION public.email_subscribers_keep_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked
     OR NEW.church_downgraded_at IS DISTINCT FROM OLD.church_downgraded_at
     OR NEW.is_church_member IS DISTINCT FROM OLD.is_church_member THEN
    IF auth.role() = 'service_role' OR public.is_admin() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_subscribers_keep_privilege_columns
  ON public.email_subscribers;
CREATE TRIGGER trg_email_subscribers_keep_privilege_columns
  BEFORE UPDATE ON public.email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.email_subscribers_keep_privilege_columns();

REVOKE ALL ON FUNCTION public.email_subscribers_keep_privilege_columns()
  FROM PUBLIC, anon;

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_email_subscribers_keep_privilege_columns ON public.email_subscribers;
-- DROP FUNCTION IF EXISTS public.email_subscribers_keep_privilege_columns();
-- CREATE POLICY "email_subscribers_delete_own"
--   ON public.email_subscribers
--   FOR DELETE
--   TO authenticated
--   USING (lower(email) = lower((auth.jwt() ->> 'email')));
