-- Per-user colors for personal prayer category names.
-- MFA/anon clients use the anon API key (no Supabase JWT) — same RLS pattern as personal_prayers.

CREATE TABLE IF NOT EXISTS public.personal_prayer_category_colors (
  user_email text NOT NULL,
  category text NOT NULL,
  color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT personal_prayer_category_colors_color_check CHECK (
    color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT personal_prayer_category_colors_category_check CHECK (
    char_length(category) > 0 AND char_length(category) <= 50
  ),
  PRIMARY KEY (user_email, category)
);

ALTER TABLE public.personal_prayer_category_colors
  DROP CONSTRAINT IF EXISTS personal_prayer_category_colors_user_email_fkey;

CREATE INDEX IF NOT EXISTS idx_personal_prayer_category_colors_user_email
  ON public.personal_prayer_category_colors (user_email);

COMMENT ON TABLE public.personal_prayer_category_colors IS
  'User-chosen hex colors for personal prayer category labels (one row per category name).';

ALTER TABLE public.personal_prayer_category_colors ENABLE ROW LEVEL SECURITY;

-- Clean up policies from earlier migration drafts (safe if this file is applied once).
DROP POLICY IF EXISTS "personal_prayer_category_colors_select_own" ON public.personal_prayer_category_colors;
DROP POLICY IF EXISTS "personal_prayer_category_colors_insert_own" ON public.personal_prayer_category_colors;
DROP POLICY IF EXISTS "personal_prayer_category_colors_update_own" ON public.personal_prayer_category_colors;
DROP POLICY IF EXISTS "personal_prayer_category_colors_delete_own" ON public.personal_prayer_category_colors;
DROP POLICY IF EXISTS "anon_personal_prayer_category_colors_mfa_access" ON public.personal_prayer_category_colors;
DROP POLICY IF EXISTS "Allow all personal_prayer_category_colors access" ON public.personal_prayer_category_colors;

CREATE POLICY "Allow all personal_prayer_category_colors access"
  ON public.personal_prayer_category_colors
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Allow all personal_prayer_category_colors access" ON public.personal_prayer_category_colors IS
  'Matches personal_prayers: MFA/anon clients pass user_email from the app; no JWT row checks.';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personal_prayer_category_colors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personal_prayer_category_colors TO authenticated;
GRANT ALL ON TABLE public.personal_prayer_category_colors TO service_role;

DROP FUNCTION IF EXISTS public.upsert_personal_prayer_category_color(text, text, text);
