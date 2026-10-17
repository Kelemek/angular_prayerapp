DO $$
DECLARE
  r record;
  target text;
  target_tables text[] := ARRAY[
    'scripture_cache',
    'memorization_recite_usage',
    'backup_tables'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'memorization_recite_usage'
      AND policyname = 'memorization_recite_usage_admin_select'
  ) THEN
    RAISE EXCEPTION 'missing policy memorization_recite_usage_admin_select';
  END IF;

  FOREACH target IN ARRAY target_tables LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', target);
  END LOOP;

  FOR r IN
    SELECT table_name, column_name, privilege_type
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND grantee = 'anon'
      AND table_name = ANY (target_tables)
  LOOP
    IF r.privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES') THEN
      RAISE EXCEPTION 'unexpected column privilege % on %.%', r.privilege_type, r.table_name, r.column_name;
    END IF;

    EXECUTE format(
      'REVOKE %s (%I) ON TABLE public.%I FROM anon',
      r.privilege_type,
      r.column_name,
      r.table_name
    );
  END LOOP;
END $$;

ALTER POLICY memorization_recite_usage_admin_select
  ON public.memorization_recite_usage
  TO authenticated;

-- ROLLBACK
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.scripture_cache TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.memorization_recite_usage TO anon;
-- GRANT SELECT ON TABLE public.backup_tables TO anon;
-- ALTER POLICY memorization_recite_usage_admin_select ON public.memorization_recite_usage TO anon, authenticated;
