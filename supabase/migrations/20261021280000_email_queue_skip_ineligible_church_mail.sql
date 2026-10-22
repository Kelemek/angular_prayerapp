-- Rule 7b. Skip ineligible church-mail rows. Do not abort the rest of a multi-row insert.

CREATE OR REPLACE FUNCTION public.email_queue_reject_group_only_church_mail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_group boolean;
  v_church boolean;
  v_has_row boolean;
BEGIN
  SELECT coalesce(et.is_group, false)
    INTO v_is_group
  FROM public.email_templates et
  WHERE et.template_key = NEW.template_key;

  IF coalesce(v_is_group, false) THEN
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

  SELECT es.is_church_member, true
    INTO v_church, v_has_row
  FROM public.email_subscribers es
  WHERE lower(es.email) = lower(NEW.recipient);

  IF v_church IS TRUE THEN
    RETURN NEW;
  END IF;

  IF v_has_row IS NOT TRUE THEN
    IF NEW.template_key IN (
      'approved_prayer',
      'approved_update',
      'prayer_answered'
    ) THEN
      RETURN NEW;
    END IF;
    RETURN NULL;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.email_queue_reject_group_only_church_mail() IS
  'Rule 7b. Group template → allow. Group-only subscriber → skip (RETURN NULL). No subscriber row → allow transactional church mail (approved_prayer, approved_update, prayer_answered) and skip blasts (verse_memorization_prayer, admin_subscriber_manual_broadcast). Church member → allow.';

REVOKE ALL ON FUNCTION public.email_queue_reject_group_only_church_mail()
  FROM PUBLIC, anon;

-- ROLLBACK
-- Restore email_queue_reject_group_only_church_mail from 20261021220000_email_queue_group_template_marker.sql.
