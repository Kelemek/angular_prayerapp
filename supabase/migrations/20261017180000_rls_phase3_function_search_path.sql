DO $$
DECLARE
  r record;
  fn regprocedure;
BEGIN
  FOR r IN
    SELECT signature
    FROM (
      VALUES
        ('public.reorder_personal_prayers_unchecked(text, text[], text)'),
        ('public.reorder_personal_prayer_categories_unchecked(text, text[])'),
        ('public.swap_personal_prayer_categories_unchecked(text, text, text)'),
        ('public.jsonb_union_string_arrays(jsonb, jsonb)'),
        ('public.merge_badge_read_prayers_data(jsonb, jsonb)'),
        ('public.merge_badge_read_prompts_data(jsonb, jsonb)'),
        ('public.touch_memorized_items_updated_at()'),
        ('public.update_branding_last_modified()'),
        ('public.update_member_prayer_updates_timestamp()')
    ) AS fns(signature)
  LOOP
    fn := to_regprocedure(r.signature);
    IF fn IS NULL THEN
      RAISE EXCEPTION 'missing function %', r.signature;
    END IF;

    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
  END LOOP;
END $$;

-- ROLLBACK
-- ALTER FUNCTION public.reorder_personal_prayers_unchecked(text, text[], text) RESET search_path;
-- ALTER FUNCTION public.reorder_personal_prayer_categories_unchecked(text, text[]) RESET search_path;
-- ALTER FUNCTION public.swap_personal_prayer_categories_unchecked(text, text, text) RESET search_path;
-- ALTER FUNCTION public.jsonb_union_string_arrays(jsonb, jsonb) RESET search_path;
-- ALTER FUNCTION public.merge_badge_read_prayers_data(jsonb, jsonb) RESET search_path;
-- ALTER FUNCTION public.merge_badge_read_prompts_data(jsonb, jsonb) RESET search_path;
-- ALTER FUNCTION public.touch_memorized_items_updated_at() RESET search_path;
-- ALTER FUNCTION public.update_branding_last_modified() RESET search_path;
-- ALTER FUNCTION public.update_member_prayer_updates_timestamp() RESET search_path;
