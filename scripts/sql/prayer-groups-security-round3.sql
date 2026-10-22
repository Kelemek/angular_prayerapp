-- Round 3 security probes for TEST jcdhajfqtzipltvfslhu only.
-- Do not run against production eqiafsygvfaifhoaewxi.
-- Run: supabase db query --project-ref jcdhajfqtzipltvfslhu -f scripts/sql/prayer-groups-security-round3.sql
--
-- Disposable addresses use example.test. Each behavior block is BEGIN/ROLLBACK
-- except the rate-limit pair, which commits one hit so the next transaction sees it.

-- search_path includes pg_temp on the five named functions.
DO $$
DECLARE
  v_missing int;
BEGIN
  SELECT count(*) INTO v_missing
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_email_subscribers_updated_at',
      'update_prayers_updated_at_skip_prayed_for',
      'link_email_subscriber_auth',
      'trg_purge_item_reminders_on_prayer_delete',
      'trg_purge_item_reminders_on_prayer_status'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE cfg LIKE '%pg_temp%'
    );
  IF v_missing <> 0 THEN
    RAISE EXCEPTION 'search_path missing pg_temp on % named functions', v_missing;
  END IF;
END $$;

-- No JWT: granted helpers are false for any email.
BEGIN;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.role', '', true);
SELECT set_config('request.jwt.claim.email', '', true);
RESET ROLE;
DO $$
BEGIN
  IF public.is_church_member('anyone@example.test') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'no-jwt is_church_member was not false';
  END IF;
  IF public.is_prayer_group_member('00000000-0000-0000-0000-000000000001', 'anyone@example.test')
     IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'no-jwt is_prayer_group_member was not false';
  END IF;
  IF public.is_prayer_group_owner(
       '00000000-0000-0000-0000-000000000001',
       'anyone@example.test'
     ) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'no-jwt is_prayer_group_owner was not false';
  END IF;
  IF public.is_any_prayer_group_member('anyone@example.test') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'no-jwt is_any_prayer_group_member was not false';
  END IF;
END $$;
ROLLBACK;

-- Cross-transaction rate limit. Clean the probe bucket, then two commits.
DELETE FROM public.edge_function_rate_limit_hits WHERE bucket = 'r3_probe_rate';
BEGIN;
DO $$
BEGIN
  IF public.consume_rate_limit('r3_probe_rate', 'subj', 1, interval '15 minutes') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'first consume_rate_limit was not true';
  END IF;
END $$;
COMMIT;
BEGIN;
DO $$
BEGIN
  IF public.consume_rate_limit('r3_probe_rate', 'subj', 1, interval '15 minutes') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'second consume_rate_limit did not trip';
  END IF;
END $$;
DELETE FROM public.edge_function_rate_limit_hits WHERE bucket = 'r3_probe_rate';
COMMIT;

-- anon and authenticated cannot execute the policy functions.
DO $$
BEGIN
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM public.consume_rate_limit('r3_probe_rate', 'anon', 1, interval '1 minute');
    RAISE EXCEPTION 'anon executed consume_rate_limit';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.assert_group_invite_sendable(
      '00000000-0000-0000-0000-000000000001',
      'owner@example.test',
      'member@example.test'
    );
    RAISE EXCEPTION 'authenticated executed assert_group_invite_sendable';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM public.claim_group_activity_notify(
      'prayer_added',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'a@example.test'
    );
    RAISE EXCEPTION 'anon executed claim_group_activity_notify';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;

-- Membership, invite, notify, downgrade, queue. One transaction, then rollback.
BEGIN;

INSERT INTO public.email_subscribers (
  email, name, is_church_member, is_admin, is_blocked, prayer_groups_enabled, is_active
) VALUES
  ('r3-probe-admin@example.test', 'R3 Admin', true, true, false, true, true),
  ('r3-probe-owner@example.test', 'R3 Owner', true, false, false, true, true),
  ('r3-probe-next@example.test', 'R3 Next', true, false, false, true, true),
  ('r3-probe-only@example.test', 'R3 Only', true, false, false, true, true),
  ('r3-probe-church@example.test', 'R3 Church', true, false, false, true, true);

INSERT INTO public.prayer_groups (id, name, created_by_email)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'R3 Probe A', 'r3-probe-owner@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'R3 Probe B', 'r3-probe-owner@example.test');

INSERT INTO public.prayer_group_members (group_id, user_email, role, is_active, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'r3-probe-owner@example.test', 'owner', true, 0),
  ('10000000-0000-0000-0000-000000000001', 'r3-probe-next@example.test', 'member', true, 1),
  ('10000000-0000-0000-0000-000000000001', 'r3-probe-only@example.test', 'member', true, 2),
  ('10000000-0000-0000-0000-000000000002', 'r3-probe-owner@example.test', 'owner', true, 0),
  ('10000000-0000-0000-0000-000000000002', 'r3-probe-only@example.test', 'member', true, 1);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'role', 'authenticated',
    'email', 'r3-probe-owner@example.test'
  )::text,
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.email', 'r3-probe-owner@example.test', true);

DO $$
BEGIN
  BEGIN
    PERFORM public.assert_group_invite_sendable(
      '10000000-0000-0000-0000-000000000001',
      'r3-probe-owner@example.test',
      'missing@example.test'
    );
    RAISE EXCEPTION 'missing invite was sendable';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Not authorized%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM public.assert_group_invite_sendable(
      '10000000-0000-0000-0000-000000000001',
      'r3-probe-owner@example.test',
      'r3-probe-church@example.test'
    );
    RAISE EXCEPTION 'other-group invite was sendable';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Not authorized%' THEN
        RAISE;
      END IF;
  END;

  PERFORM public.assert_group_invite_sendable(
    '10000000-0000-0000-0000-000000000001',
    'r3-probe-owner@example.test',
    'r3-probe-next@example.test'
  );
END $$;

DO $$
DECLARE
  v_first boolean;
  v_second boolean;
BEGIN
  v_first := public.claim_group_activity_notify(
    'prayer_added',
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'R3-Probe-Next@example.test'
  );
  v_second := public.claim_group_activity_notify(
    'prayer_added',
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'r3-probe-next@example.test'
  );
  IF v_first IS DISTINCT FROM true OR v_second IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'notify claim duplicate returned % then %', v_first, v_second;
  END IF;
END $$;

-- Owner JWT must not probe another person's membership through granted helpers.
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.is_any_prayer_group_member('r3-probe-only@example.test') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'is_any_prayer_group_member answered for another email';
  END IF;
  IF public.is_prayer_group_owner(
       '10000000-0000-0000-0000-000000000001',
       'r3-probe-next@example.test'
     ) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'is_prayer_group_owner answered for another email';
  END IF;
  IF public.is_prayer_group_owner('10000000-0000-0000-0000-000000000001')
     IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'self is_prayer_group_owner was not true';
  END IF;
END $$;
RESET ROLE;

-- Owner removes the group-only member from group A while group B remains.
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_deleted boolean;
BEGIN
  v_deleted := public.remove_prayer_group_member(
    '10000000-0000-0000-0000-000000000001',
    'r3-probe-only@example.test'
  );
  IF v_deleted IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'remove deleted an account that still has another group';
  END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT public.transfer_prayer_group_ownership(
  '10000000-0000-0000-0000-000000000001',
  'r3-probe-next@example.test'
);
RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.prayer_group_members
    WHERE group_id = '10000000-0000-0000-0000-000000000001'
      AND user_email = 'r3-probe-next@example.test'
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'non-admin transfer did not move ownership';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.email_subscribers WHERE email = 'r3-probe-only@example.test'
  ) THEN
    RAISE EXCEPTION 'group-only account was deleted while another group remained';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.prayer_group_members
    WHERE group_id = '10000000-0000-0000-0000-000000000002'
      AND user_email = 'r3-probe-only@example.test'
  ) THEN
    RAISE EXCEPTION 'remaining group membership was removed';
  END IF;
END $$;

INSERT INTO public.email_queue (recipient, template_key, template_variables, status, attempts)
VALUES
  ('r3-probe-only@example.test', 'approved_prayer', '{"r3":"downgrade-church"}'::jsonb, 'pending', 0),
  ('r3-probe-only@example.test', 'group_prayer_added', '{"r3":"downgrade-group"}'::jsonb, 'pending', 0);

INSERT INTO public.user_prayer_item_reminders (
  user_email, prayer_kind, prayer_id, mode, iana_timezone, local_hour
) VALUES
  ('r3-probe-only@example.test', 'community', 'c1', 'daily', 'America/Chicago', 8),
  ('r3-probe-only@example.test', 'pc_member', 'pc1', 'daily', 'America/Chicago', 8),
  ('r3-probe-only@example.test', 'prompt', 'pr1', 'daily', 'America/Chicago', 8),
  ('r3-probe-only@example.test', 'personal', 'pe1', 'daily', 'America/Chicago', 8),
  ('r3-probe-only@example.test', 'group', 'g1', 'daily', 'America/Chicago', 8);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'role', 'authenticated',
    'email', 'r3-probe-admin@example.test'
  )::text,
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.email', 'r3-probe-admin@example.test', true);

DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.email_subscribers
  WHERE email = 'r3-probe-only@example.test';

  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.email_subscribers
    SET is_church_member = false
    WHERE id = v_id;
    RAISE EXCEPTION 'direct admin membership update did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Not authorized%' THEN
        RAISE;
      END IF;
  END;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.role', '', true);
SELECT set_config('request.jwt.claim.email', '', true);
UPDATE public.email_subscribers
SET is_church_member = false
WHERE email = 'r3-probe-church@example.test';
UPDATE public.email_subscribers
SET is_church_member = true
WHERE email = 'r3-probe-church@example.test';

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'role', 'authenticated',
    'email', 'r3-probe-admin@example.test'
  )::text,
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.email', 'r3-probe-admin@example.test', true);

DO $$
DECLARE
  v_id uuid;
  v_left int;
BEGIN
  SELECT id INTO v_id
  FROM public.email_subscribers
  WHERE email = 'r3-probe-only@example.test';
  PERFORM public.admin_downgrade_to_group_only(v_id);
  SELECT count(*) INTO v_left
  FROM public.user_prayer_item_reminders
  WHERE user_email = 'r3-probe-only@example.test'
    AND prayer_kind IN ('community', 'pc_member', 'prompt');
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'downgrade left % church reminders', v_left;
  END IF;
  SELECT count(*) INTO v_left
  FROM public.user_prayer_item_reminders
  WHERE user_email = 'r3-probe-only@example.test'
    AND prayer_kind IN ('personal', 'group');
  IF v_left <> 2 THEN
    RAISE EXCEPTION 'downgrade kept % personal/group reminders', v_left;
  END IF;
  SELECT count(*) INTO v_left
  FROM public.email_queue
  WHERE template_variables->>'r3' = 'downgrade-church';
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'downgrade left % pending church queue rows', v_left;
  END IF;
  SELECT count(*) INTO v_left
  FROM public.email_queue
  WHERE template_variables->>'r3' = 'downgrade-group';
  IF v_left <> 1 THEN
    RAISE EXCEPTION 'downgrade dropped group queue rows, left %', v_left;
  END IF;
END $$;

INSERT INTO public.email_queue (recipient, template_key, template_variables, status, attempts)
VALUES
  ('r3-probe-church@example.test', 'approved_prayer', '{"r3":"batch"}'::jsonb, 'pending', 0),
  ('r3-probe-only@example.test', 'approved_prayer', '{"r3":"batch"}'::jsonb, 'pending', 0),
  ('r3-probe-church@example.test', 'approved_prayer', '{"r3":"batch"}'::jsonb, 'pending', 0),
  ('unknown-requester@example.test', 'prayer_answered', '{"r3":"unknown"}'::jsonb, 'pending', 0),
  ('r3-probe-only@example.test', 'prayer_answered', '{"r3":"group-only"}'::jsonb, 'pending', 0);

DO $$
DECLARE
  v_batch int;
  v_unknown int;
  v_group int;
BEGIN
  SELECT count(*) INTO v_batch
  FROM public.email_queue
  WHERE template_variables->>'r3' = 'batch';
  SELECT count(*) INTO v_unknown
  FROM public.email_queue
  WHERE template_variables->>'r3' = 'unknown';
  SELECT count(*) INTO v_group
  FROM public.email_queue
  WHERE template_variables->>'r3' = 'group-only';
  IF v_batch <> 2 OR v_unknown <> 1 OR v_group <> 0 THEN
    RAISE EXCEPTION 'queue skip counts batch=% unknown=% group-only=%', v_batch, v_unknown, v_group;
  END IF;
END $$;

-- Church member and group-only cannot change membership columns. Service role can.
DO $$
DECLARE
  v_church uuid;
BEGIN
  SELECT id INTO v_church
  FROM public.email_subscribers
  WHERE email = 'r3-probe-church@example.test';

  PERFORM set_config('prayerapp.membership_rpc', '', true);

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role', 'authenticated', 'email', 'r3-probe-church@example.test')::text,
    true
  );
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.email_subscribers
    SET is_church_member = false
    WHERE id = v_church;
    RAISE EXCEPTION 'church member membership update did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Not authorized%' THEN
        RAISE;
      END IF;
  END;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role', 'authenticated', 'email', 'r3-probe-only@example.test')::text,
    true
  );
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.email_subscribers
    SET is_church_member = true
    WHERE email = 'r3-probe-only@example.test';
    RAISE EXCEPTION 'group-only membership update did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Not authorized%' THEN
        RAISE;
      END IF;
  END;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role', 'service_role', 'email', 'service@example.test')::text,
    true
  );
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  EXECUTE 'SET LOCAL ROLE service_role';
  UPDATE public.email_subscribers
  SET is_church_member = true
  WHERE id = v_church;
  IF NOT EXISTS (
    SELECT 1
    FROM public.email_subscribers
    WHERE id = v_church
      AND is_church_member IS TRUE
  ) THEN
    RAISE EXCEPTION 'service_role membership update did not stick';
  END IF;
END $$;

ROLLBACK;

SELECT 'round3-ok' AS probe;
