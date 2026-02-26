-- Don't advance prayers.updated_at when only prayed_for_count changes,
-- so reminder logic (based on last activity) isn't pushed out by "Pray For" clicks.

CREATE OR REPLACE FUNCTION public.update_prayers_updated_at_skip_prayed_for()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If the only change is prayed_for_count, keep the existing updated_at
  IF (OLD.prayed_for_count IS DISTINCT FROM NEW.prayed_for_count)
     AND (OLD.id IS NOT DISTINCT FROM NEW.id)
     AND (OLD.title IS NOT DISTINCT FROM NEW.title)
     AND (OLD.description IS NOT DISTINCT FROM NEW.description)
     AND (OLD.status IS NOT DISTINCT FROM NEW.status)
     AND (OLD.requester IS NOT DISTINCT FROM NEW.requester)
     AND (OLD.date_requested IS NOT DISTINCT FROM NEW.date_requested)
     AND (OLD.date_answered IS NOT DISTINCT FROM NEW.date_answered)
     AND (OLD.created_at IS NOT DISTINCT FROM NEW.created_at)
     AND (OLD.approval_status IS NOT DISTINCT FROM NEW.approval_status)
     AND (OLD.approved_at IS NOT DISTINCT FROM NEW.approved_at)
     AND (OLD.denial_reason IS NOT DISTINCT FROM NEW.denial_reason)
     AND (OLD.email IS NOT DISTINCT FROM NEW.email)
     AND (OLD.is_anonymous IS NOT DISTINCT FROM NEW.is_anonymous)
     AND (OLD.prayer_for IS NOT DISTINCT FROM NEW.prayer_for)
     AND (OLD.last_reminder_sent IS NOT DISTINCT FROM NEW.last_reminder_sent)
     AND (OLD.is_seed_data IS NOT DISTINCT FROM NEW.is_seed_data)
     AND (OLD.denied_at IS NOT DISTINCT FROM NEW.denied_at)
  THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_prayers_updated_at ON public.prayers;
CREATE TRIGGER update_prayers_updated_at
  BEFORE UPDATE ON public.prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prayers_updated_at_skip_prayed_for();
