-- Planning Center member Pray For: shared prayed_for_count per person_id + increment RPC.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.member_prayed_for_counts (
  person_id text PRIMARY KEY,
  prayed_for_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.member_prayed_for_counts IS
  'Anonymous shared Pray For counts for Planning Center member cards, keyed by PC person_id.';
COMMENT ON COLUMN public.member_prayed_for_counts.person_id IS
  'Planning Center person ID (same key as member_prayer_updates.person_id).';

CREATE INDEX IF NOT EXISTS idx_member_prayed_for_counts_person_id
  ON public.member_prayed_for_counts (person_id);

ALTER TABLE public.member_prayed_for_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on member_prayed_for_counts" ON public.member_prayed_for_counts;
CREATE POLICY "Allow select on member_prayed_for_counts"
  ON public.member_prayed_for_counts
  FOR SELECT
  USING (true);

GRANT SELECT ON TABLE public.member_prayed_for_counts TO anon;
GRANT SELECT ON TABLE public.member_prayed_for_counts TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_member_prayed_for_count(p_person_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
  trimmed_id text;
BEGIN
  trimmed_id := nullif(trim(p_person_id), '');
  IF trimmed_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO member_prayed_for_counts (person_id, prayed_for_count, updated_at)
  VALUES (trimmed_id, 1, now())
  ON CONFLICT (person_id) DO UPDATE
    SET prayed_for_count = member_prayed_for_counts.prayed_for_count + 1,
        updated_at = now()
  RETURNING prayed_for_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_member_prayed_for_count(text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_member_prayed_for_count(text) TO authenticated;
