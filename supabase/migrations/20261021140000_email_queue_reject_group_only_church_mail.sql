-- Church mass mail inserted by an authenticated admin cannot target group-only
-- subscribers. Group activity uses the service role and stays allowed.

CREATE OR REPLACE FUNCTION public.email_queue_reject_group_only_church_mail()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_church boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.template_key NOT IN (
    'approved_prayer',
    'approved_update',
    'prayer_answered',
    'verse_memorization_prayer',
    'admin_subscriber_manual_broadcast'
  ) THEN
    RETURN NEW;
  END IF;
  SELECT es.is_church_member
    INTO v_church
  FROM public.email_subscribers es
  WHERE lower(es.email) = lower(NEW.recipient);
  IF v_church IS TRUE THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Not authorized';
END;
$$;

DROP TRIGGER IF EXISTS trg_email_queue_reject_group_only_church_mail
  ON public.email_queue;
CREATE TRIGGER trg_email_queue_reject_group_only_church_mail
  BEFORE INSERT ON public.email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.email_queue_reject_group_only_church_mail();

REVOKE ALL ON FUNCTION public.email_queue_reject_group_only_church_mail()
  FROM PUBLIC, anon;

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_email_queue_reject_group_only_church_mail ON public.email_queue;
-- DROP FUNCTION IF EXISTS public.email_queue_reject_group_only_church_mail();
