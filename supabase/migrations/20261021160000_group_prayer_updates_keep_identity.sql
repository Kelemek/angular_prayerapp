-- Author updates cannot move the row to another prayer or another email.
-- A removed member cannot edit an old update.

CREATE OR REPLACE FUNCTION public.group_prayer_updates_keep_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.group_prayer_id IS DISTINCT FROM OLD.group_prayer_id
     OR lower(NEW.author_email) IS DISTINCT FROM lower(OLD.author_email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_prayer_updates_keep_identity
  ON public.group_prayer_updates;
CREATE TRIGGER trg_group_prayer_updates_keep_identity
  BEFORE UPDATE ON public.group_prayer_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.group_prayer_updates_keep_identity();

REVOKE ALL ON FUNCTION public.group_prayer_updates_keep_identity()
  FROM PUBLIC, anon;

DROP POLICY IF EXISTS group_prayer_updates_update_author ON public.group_prayer_updates;
CREATE POLICY group_prayer_updates_update_author ON public.group_prayer_updates
  FOR UPDATE TO authenticated
  USING (
    lower(author_email) = public.current_jwt_email()
    AND EXISTS (
      SELECT 1
      FROM public.group_prayers gp
      WHERE gp.id = group_prayer_id
        AND public.is_prayer_group_member(gp.group_id)
    )
  )
  WITH CHECK (
    lower(author_email) = public.current_jwt_email()
    AND EXISTS (
      SELECT 1
      FROM public.group_prayers gp
      WHERE gp.id = group_prayer_id
        AND public.is_prayer_group_member(gp.group_id)
    )
  );

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_group_prayer_updates_keep_identity ON public.group_prayer_updates;
-- DROP FUNCTION IF EXISTS public.group_prayer_updates_keep_identity();
-- DROP POLICY IF EXISTS group_prayer_updates_update_author ON public.group_prayer_updates;
-- CREATE POLICY group_prayer_updates_update_author ON public.group_prayer_updates
--   FOR UPDATE TO authenticated
--   USING (lower(author_email) = public.current_jwt_email())
--   WITH CHECK (lower(author_email) = public.current_jwt_email());
