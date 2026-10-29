-- Per-user icon badge report used by send-push-notification.
-- report_icon_badge_unread is the signed-in writer.
-- icon_badge_new_since and admin_pending_item_total are service_role readers.

ALTER TABLE public.user_badge_read_state
  ADD COLUMN IF NOT EXISTS icon_unread integer,
  ADD COLUMN IF NOT EXISTS icon_badges_enabled boolean,
  ADD COLUMN IF NOT EXISTS icon_reported_at timestamptz;

CREATE OR REPLACE FUNCTION public.report_icon_badge_unread(
  p_user_email text,
  p_unread integer,
  p_badges_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_session_email(p_user_email);

  INSERT INTO public.user_badge_read_state (
    user_email,
    icon_unread,
    icon_badges_enabled,
    icon_reported_at
  ) VALUES (
    lower(trim(p_user_email)),
    greatest(coalesce(p_unread, 0), 0),
    coalesce(p_badges_enabled, false),
    now()
  )
  ON CONFLICT (user_email) DO UPDATE SET
    icon_unread = excluded.icon_unread,
    icon_badges_enabled = excluded.icon_badges_enabled,
    icon_reported_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.report_icon_badge_unread(text, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_icon_badge_unread(text, integer, boolean) TO authenticated, service_role;

-- Home pills count unread ids, not timestamps
-- (src/app/lib/badge-count.ts calculateBadgeCount,
-- src/app/services/badge.service.ts getDisplayedBadgeTotal).
-- This adds what those pills would gain after p_since:
-- approved prayers in status current or answered with approved_at > p_since,
-- excluding the recipient's own email (trimmed, case-insensitive; a blank email still counts);
-- approved prayer_updates on those prayers with approved_at > p_since,
-- excluding the recipient's author_email;
-- prayer_prompts with created_at > p_since whose type is an active prayer_types row.
-- BadgeService does not key prompts by created_at or updated_at. A read prompt stays
-- read when updated_at changes, and the prompt cache has no updates, so created_at is
-- the clock. A prompt whose type becomes active later, a prayer that moves from
-- archived to current without a new approved_at, and an update approved before p_since
-- that only becomes visible when its prayer is approved later are not included.
-- group_prayers and personal_prayers are other tables and are not queried.
-- Group-only accounts cannot see church content, so they gain nothing here.
CREATE OR REPLACE FUNCTION public.icon_badge_new_since(
  p_email text,
  p_since timestamptz
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN NOT public.is_church_member_row(lower(btrim(coalesce(p_email, '')))) THEN 0 ELSE (
    (SELECT count(*)
     FROM public.prayers pr
     WHERE pr.approval_status = 'approved'
       AND pr.status IN ('current', 'answered')
       AND pr.approved_at > p_since
       AND NOT (
         btrim(coalesce(pr.email::text, '')) <> ''
         AND lower(btrim(pr.email::text)) = lower(btrim(coalesce(p_email, '')))
       ))
    + (SELECT count(*)
       FROM public.prayer_updates u
       INNER JOIN public.prayers pr ON pr.id = u.prayer_id
       WHERE u.approval_status = 'approved'
         AND u.approved_at > p_since
         AND pr.approval_status = 'approved'
         AND pr.status IN ('current', 'answered')
         AND NOT (
           btrim(coalesce(u.author_email, '')) <> ''
           AND lower(btrim(u.author_email)) = lower(btrim(coalesce(p_email, '')))
         ))
    + (SELECT count(*)
       FROM public.prayer_prompts pp
       INNER JOIN public.prayer_types pt
         ON pt.name = pp.type
        AND pt.is_active
       WHERE pp.created_at > p_since)
  )::integer END;
$$;

REVOKE ALL ON FUNCTION public.icon_badge_new_since(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.icon_badge_new_since(text, timestamptz) TO service_role;

-- Same five queues and joins as AdminDataReadService.fetchPendingCounts.
CREATE OR REPLACE FUNCTION public.admin_pending_item_total()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    (SELECT count(*)
     FROM public.prayers
     WHERE approval_status = 'pending')
    + (SELECT count(*)
       FROM public.prayer_updates u
       INNER JOIN public.prayers p ON p.id = u.prayer_id
       WHERE u.approval_status = 'pending')
    + (SELECT count(*)
       FROM public.deletion_requests d
       INNER JOIN public.prayers p ON p.id = d.prayer_id
       WHERE d.approval_status = 'pending')
    + (SELECT count(*)
       FROM public.update_deletion_requests
       WHERE approval_status = 'pending')
    + (SELECT count(*)
       FROM public.account_approval_requests
       WHERE approval_status = 'pending')
  )::integer;
$$;

REVOKE ALL ON FUNCTION public.admin_pending_item_total() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pending_item_total() TO service_role;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS public.report_icon_badge_unread(text, integer, boolean);
-- DROP FUNCTION IF EXISTS public.icon_badge_new_since(text, timestamptz);
-- DROP FUNCTION IF EXISTS public.admin_pending_item_total();
-- ALTER TABLE public.user_badge_read_state
--   DROP COLUMN IF EXISTS icon_unread,
--   DROP COLUMN IF EXISTS icon_badges_enabled,
--   DROP COLUMN IF EXISTS icon_reported_at;
