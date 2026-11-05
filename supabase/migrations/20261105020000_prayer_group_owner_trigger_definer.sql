-- The owner-floor trigger runs when the role change commits. It is not the
-- security-definer RPC, so it ran as the signed-in user. That user cannot
-- execute is_prayer_group_member_row, and Make owner failed at commit with
-- "permission denied for function is_prayer_group_member_row".
-- The trigger now runs as its owner. Callers still cannot execute it.

CREATE OR REPLACE FUNCTION public.prayer_group_members_keep_an_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group uuid := OLD.group_id;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role = 'owner'
     AND coalesce(NEW.is_active, true)
     AND NEW.group_id IS NOT DISTINCT FROM OLD.group_id
     AND public.is_prayer_group_member_row(NEW.group_id, NEW.user_email) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.prayer_groups g WHERE g.id = v_group) THEN
    RETURN NULL;
  END IF;

  IF public.prayer_group_active_owner_count(v_group) < 1 THEN
    RAISE EXCEPTION 'Transfer ownership before removing an owner';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.prayer_group_members_keep_an_owner() FROM PUBLIC, anon, authenticated;
