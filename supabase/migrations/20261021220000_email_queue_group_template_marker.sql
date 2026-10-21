-- Group vs church email_queue gate uses email_templates.is_group, not appLink heuristics.

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.email_templates.is_group IS
  'When true, queue inserts to group-only subscribers are allowed (group activity mail).';

UPDATE public.email_templates
SET is_group = true
WHERE template_key = 'group_welcome';

INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  description,
  is_group
)
SELECT
  v.new_key,
  v.display_name,
  t.subject,
  t.html_body,
  t.text_body,
  'Group activity: ' || coalesce(t.description, v.new_key),
  true
FROM (
  VALUES
    ('group_prayer_added', 'approved_prayer', 'Group prayer added'),
    ('group_prayer_update', 'approved_update', 'Group prayer update'),
    ('group_prayer_answered', 'prayer_answered', 'Group prayer answered')
) AS v(new_key, source_key, display_name)
JOIN public.email_templates t ON t.template_key = v.source_key
ON CONFLICT (template_key) DO UPDATE
  SET is_group = true;

CREATE OR REPLACE FUNCTION public.email_queue_reject_group_only_church_mail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_group boolean;
  v_church boolean;
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

REVOKE ALL ON FUNCTION public.email_queue_reject_group_only_church_mail()
  FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.group_prayer_updates_keep_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.group_prayer_updates_keep_identity()
  FROM PUBLIC, anon;

-- ROLLBACK
-- DROP FUNCTION public.group_prayer_updates_keep_identity() and restore non-definer body from 20261021160000;
-- DROP FUNCTION public.email_queue_reject_group_only_church_mail() and restore 20261021140000 body;
-- DELETE FROM email_templates WHERE template_key IN ('group_prayer_added', 'group_prayer_update', 'group_prayer_answered');
-- ALTER TABLE public.email_templates DROP COLUMN IF EXISTS is_group;
