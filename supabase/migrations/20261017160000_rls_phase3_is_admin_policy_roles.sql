DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT *
    FROM (
      VALUES
        ('deletion_requests', 'Admins can manage deletion_requests'),
        ('prayer_updates', 'Admins can manage prayer_updates'),
        ('prayers', 'Admins can modify all prayers'),
        ('prayers', 'Admins can view all prayers')
    ) AS policy_role(table_name, policy_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = r.table_name
        AND policyname = r.policy_name
    ) THEN
      RAISE EXCEPTION 'missing policy % on public.%', r.policy_name, r.table_name;
    END IF;

    EXECUTE format(
      'ALTER POLICY %I ON public.%I TO authenticated',
      r.policy_name,
      r.table_name
    );
  END LOOP;
END $$;

-- ROLLBACK
-- ALTER POLICY "Admins can manage deletion_requests" ON public.deletion_requests TO public;
-- ALTER POLICY "Admins can manage prayer_updates" ON public.prayer_updates TO public;
-- ALTER POLICY "Admins can modify all prayers" ON public.prayers TO public;
-- ALTER POLICY "Admins can view all prayers" ON public.prayers TO public;
