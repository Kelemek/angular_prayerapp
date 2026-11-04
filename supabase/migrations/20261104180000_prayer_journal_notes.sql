-- Private scratchpad: one note per user per prayer.
-- Note text is a normal column. Callers pass it as a bound value.
-- This file does not build SQL from that text.

CREATE TABLE IF NOT EXISTS public.prayer_journal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  prayer_kind text NOT NULL,
  prayer_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT prayer_journal_notes_kind_check CHECK (
    prayer_kind IN ('community', 'group', 'personal', 'member')
  ),
  CONSTRAINT prayer_journal_notes_prayer_id_check CHECK (
    char_length(prayer_id) BETWEEN 1 AND 200
  ),
  CONSTRAINT prayer_journal_notes_content_check CHECK (
    char_length(content) BETWEEN 1 AND 20000
  ),
  CONSTRAINT prayer_journal_notes_user_prayer_key UNIQUE (user_id, prayer_kind, prayer_id)
);

COMMENT ON TABLE public.prayer_journal_notes IS
  'Private per-user scratchpad for one prayer. Owner-only RLS. Content is sanitized HTML or plain text written as a column value.';

CREATE INDEX IF NOT EXISTS idx_prayer_journal_notes_user_prayer_id
  ON public.prayer_journal_notes (user_id, prayer_id);

CREATE OR REPLACE FUNCTION public.prayer_journal_notes_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prayer_journal_notes_set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prayer_journal_notes_set_updated_at() FROM anon;

DROP TRIGGER IF EXISTS trg_prayer_journal_notes_set_updated_at
  ON public.prayer_journal_notes;
CREATE TRIGGER trg_prayer_journal_notes_set_updated_at
  BEFORE UPDATE ON public.prayer_journal_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.prayer_journal_notes_set_updated_at();

ALTER TABLE public.prayer_journal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prayer_journal_notes_select_own ON public.prayer_journal_notes;
CREATE POLICY prayer_journal_notes_select_own
  ON public.prayer_journal_notes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS prayer_journal_notes_insert_own ON public.prayer_journal_notes;
CREATE POLICY prayer_journal_notes_insert_own
  ON public.prayer_journal_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS prayer_journal_notes_update_own ON public.prayer_journal_notes;
CREATE POLICY prayer_journal_notes_update_own
  ON public.prayer_journal_notes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS prayer_journal_notes_delete_own ON public.prayer_journal_notes;
CREATE POLICY prayer_journal_notes_delete_own
  ON public.prayer_journal_notes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.prayer_journal_notes FROM PUBLIC;
REVOKE ALL ON TABLE public.prayer_journal_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prayer_journal_notes TO authenticated;
GRANT ALL ON TABLE public.prayer_journal_notes TO service_role;
