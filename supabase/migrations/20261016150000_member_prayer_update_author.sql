-- Member prayer updates: only the author or an admin can change or delete a row.
-- Signed-in members can still read every row and add a new one. The church
-- settings updates_allowed and deletions_allowed stay application rules for
-- community prayers; they are not applied to this table.

ALTER TABLE public.member_prayer_updates
  ADD COLUMN IF NOT EXISTS author_email text;

COMMENT ON COLUMN public.member_prayer_updates.author_email IS
  'Email of the signed-in member who wrote the update. Null on rows created before this column; only an admin can change those rows.';

CREATE INDEX IF NOT EXISTS idx_member_prayer_updates_author_email
  ON public.member_prayer_updates (lower(author_email));

CREATE OR REPLACE FUNCTION public.member_prayer_updates_fill_author_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.author_email IS NULL OR btrim(NEW.author_email) = '' THEN
    NEW.author_email := nullif(btrim(auth.jwt() ->> 'email'), '');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.member_prayer_updates_fill_author_email() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_member_prayer_updates_fill_author_email
  ON public.member_prayer_updates;
CREATE TRIGGER trg_member_prayer_updates_fill_author_email
  BEFORE INSERT ON public.member_prayer_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.member_prayer_updates_fill_author_email();

DROP POLICY IF EXISTS "member_prayer_updates_insert_authenticated"
  ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_insert_authenticated"
  ON public.member_prayer_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "member_prayer_updates_update_authenticated"
  ON public.member_prayer_updates;
DROP POLICY IF EXISTS "member_prayer_updates_update_own"
  ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_update_own"
  ON public.member_prayer_updates
  FOR UPDATE
  TO authenticated
  USING (
    author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "member_prayer_updates_delete_authenticated"
  ON public.member_prayer_updates;
DROP POLICY IF EXISTS "member_prayer_updates_delete_own"
  ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_delete_own"
  ON public.member_prayer_updates
  FOR DELETE
  TO authenticated
  USING (
    author_email IS NOT NULL
    AND lower(author_email) = lower((auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "member_prayer_updates_admin_all"
  ON public.member_prayer_updates;
CREATE POLICY "member_prayer_updates_admin_all"
  ON public.member_prayer_updates
  FOR ALL
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')))
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));
