-- Per-user badge read state (prayers/prompts and their updates marked read).
-- MFA/anon clients use the anon API key (no Supabase JWT) — same RLS pattern as personal_prayer_category_colors.

CREATE TABLE IF NOT EXISTS public.user_badge_read_state (
  user_email text NOT NULL,
  prayers_data jsonb NOT NULL DEFAULT '{"prayers":[],"updates":[]}'::jsonb,
  prompts_data jsonb NOT NULL DEFAULT '{"prompts":[],"updates":[]}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_badge_read_state_pkey PRIMARY KEY (user_email),
  CONSTRAINT user_badge_read_state_prayers_data_check CHECK (
    jsonb_typeof(prayers_data) = 'object'
    AND jsonb_typeof(prayers_data -> 'prayers') = 'array'
    AND jsonb_typeof(prayers_data -> 'updates') = 'array'
  ),
  CONSTRAINT user_badge_read_state_prompts_data_check CHECK (
    jsonb_typeof(prompts_data) = 'object'
    AND jsonb_typeof(prompts_data -> 'prompts') = 'array'
    AND jsonb_typeof(prompts_data -> 'updates') = 'array'
  )
);

CREATE INDEX IF NOT EXISTS idx_user_badge_read_state_user_email
  ON public.user_badge_read_state (user_email);

COMMENT ON TABLE public.user_badge_read_state IS
  'Per-user read badge state for community prayers/prompts and their updates.';

ALTER TABLE public.user_badge_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all user_badge_read_state access" ON public.user_badge_read_state;

CREATE POLICY "Allow all user_badge_read_state access"
  ON public.user_badge_read_state
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Allow all user_badge_read_state access" ON public.user_badge_read_state IS
  'Matches personal_prayer_category_colors: MFA/anon clients pass user_email from the app; no JWT row checks.';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_badge_read_state TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_badge_read_state TO authenticated;
GRANT ALL ON TABLE public.user_badge_read_state TO service_role;

-- Union two JSON string arrays (distinct).
CREATE OR REPLACE FUNCTION public.jsonb_union_string_arrays(a jsonb, b jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_agg(DISTINCT elem ORDER BY elem), '[]'::jsonb)
  FROM (
    SELECT jsonb_array_elements_text(COALESCE(a, '[]'::jsonb)) AS elem
    UNION
    SELECT jsonb_array_elements_text(COALESCE(b, '[]'::jsonb)) AS elem
  ) merged;
$$;

-- Merge badge read JSON objects field-by-field (union of ID arrays).
CREATE OR REPLACE FUNCTION public.merge_badge_read_prayers_data(a jsonb, b jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'prayers', public.jsonb_union_string_arrays(a -> 'prayers', b -> 'prayers'),
    'updates', public.jsonb_union_string_arrays(a -> 'updates', b -> 'updates')
  );
$$;

CREATE OR REPLACE FUNCTION public.merge_badge_read_prompts_data(a jsonb, b jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'prompts', public.jsonb_union_string_arrays(a -> 'prompts', b -> 'prompts'),
    'updates', public.jsonb_union_string_arrays(a -> 'updates', b -> 'updates')
  );
$$;

-- Upsert with server-side union merge on conflict (multi-tab / multi-device safe).
CREATE OR REPLACE FUNCTION public.upsert_user_badge_read_state(
  p_user_email text,
  p_prayers_data jsonb,
  p_prompts_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_badge_read_state (user_email, prayers_data, prompts_data, updated_at)
  VALUES (
    lower(trim(p_user_email)),
    COALESCE(p_prayers_data, '{"prayers":[],"updates":[]}'::jsonb),
    COALESCE(p_prompts_data, '{"prompts":[],"updates":[]}'::jsonb),
    timezone('utc'::text, now())
  )
  ON CONFLICT (user_email) DO UPDATE SET
    prayers_data = public.merge_badge_read_prayers_data(
      user_badge_read_state.prayers_data,
      EXCLUDED.prayers_data
    ),
    prompts_data = public.merge_badge_read_prompts_data(
      user_badge_read_state.prompts_data,
      EXCLUDED.prompts_data
    ),
    updated_at = timezone('utc'::text, now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) TO service_role;
