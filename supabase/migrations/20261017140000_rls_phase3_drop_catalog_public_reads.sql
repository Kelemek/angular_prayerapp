DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT *
    FROM (
      VALUES
        (
          'memorization_recommendations',
          'Allow public reads on memorization_recommendations',
          'memorization_recommendations_select_authenticated'
        ),
        (
          'memorization_recommendation_categories',
          'Allow public reads on memorization_recommendation_categories',
          'memorization_recommendation_categories_select_authenticated'
        ),
        (
          'booklet_insert_pages',
          'Allow public reads on booklet_insert_pages',
          'booklet_insert_pages_authenticated_read'
        )
    ) AS policy_drop(table_name, old_policy, replacement_policy)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = r.table_name
        AND policyname = r.replacement_policy
    ) THEN
      RAISE EXCEPTION 'missing replacement policy % on public.%', r.replacement_policy, r.table_name;
    END IF;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      r.old_policy,
      r.table_name
    );
  END LOOP;
END $$;

-- ROLLBACK
-- CREATE POLICY "Allow public reads on memorization_recommendations"
--   ON public.memorization_recommendations
--   FOR SELECT
--   TO anon, authenticated
--   USING (true);
-- CREATE POLICY "Allow public reads on memorization_recommendation_categories"
--   ON public.memorization_recommendation_categories
--   FOR SELECT
--   TO anon, authenticated
--   USING (true);
-- CREATE POLICY "Allow public reads on booklet_insert_pages"
--   ON public.booklet_insert_pages
--   FOR SELECT
--   TO anon, authenticated
--   USING (true);
