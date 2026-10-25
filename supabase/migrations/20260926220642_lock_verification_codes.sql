-- Login codes are written and checked only by Edge Functions (service role).
-- The public anon key must not read, insert, or update this table.

DROP POLICY IF EXISTS "Anyone can insert verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Anyone can read verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Anyone can update verification codes" ON public.verification_codes;

REVOKE ALL ON TABLE public.verification_codes FROM PUBLIC;
REVOKE ALL ON TABLE public.verification_codes FROM anon;
REVOKE ALL ON TABLE public.verification_codes FROM authenticated;

-- Outstanding and historical rows stored the code in plaintext. Clear them.
-- In-flight sign-ins must request a new code. Used admin_login rows stay for audit.
UPDATE public.verification_codes
SET code = 'redacted'
WHERE code IS DISTINCT FROM 'redacted';

COMMENT ON COLUMN public.verification_codes.code IS
  'HMAC-SHA256 hex of the one-time code, keyed with the service-role secret. Not the code itself.';

REVOKE ALL ON FUNCTION public.cleanup_expired_verification_codes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_verification_codes() TO service_role;
