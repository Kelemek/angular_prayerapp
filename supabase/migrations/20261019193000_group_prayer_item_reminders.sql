-- Per-prayer reminders for group prayers (prayer_kind = group).

ALTER TABLE public.user_prayer_item_reminders
  DROP CONSTRAINT IF EXISTS user_prayer_item_reminders_prayer_kind_check;

ALTER TABLE public.user_prayer_item_reminders
  ADD CONSTRAINT user_prayer_item_reminders_prayer_kind_check CHECK (
    prayer_kind = ANY (
      ARRAY[
        'community'::text,
        'personal'::text,
        'pc_member'::text,
        'prompt'::text,
        'group'::text
      ]
    )
  );

COMMENT ON TABLE public.user_prayer_item_reminders IS
  'Per-user reminders for community, personal, Planning Center member, prompt, and group prayers.';

CREATE OR REPLACE FUNCTION public.trg_purge_item_reminders_on_group_prayer_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.purge_user_prayer_item_reminders('group', OLD.id::text);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_item_reminders_on_group_prayer_delete ON public.group_prayers;
CREATE TRIGGER trg_purge_item_reminders_on_group_prayer_delete
  AFTER DELETE ON public.group_prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purge_item_reminders_on_group_prayer_delete();

CREATE OR REPLACE FUNCTION public.trg_purge_item_reminders_on_group_prayer_answered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'answered' THEN
    PERFORM public.purge_user_prayer_item_reminders('group', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_item_reminders_on_group_prayer_answered ON public.group_prayers;
CREATE TRIGGER trg_purge_item_reminders_on_group_prayer_answered
  AFTER UPDATE OF status ON public.group_prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purge_item_reminders_on_group_prayer_answered();
