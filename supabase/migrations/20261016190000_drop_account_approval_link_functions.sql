-- Logged-out account approval links accepted an email as the secret.
-- Admins approve accounts in the portal, the same way they approve prayers.

DROP FUNCTION IF EXISTS public.complete_account_approval_from_link(text, text, text, boolean, timestamptz);
DROP FUNCTION IF EXISTS public.deny_account_approval_from_link(text);
DROP FUNCTION IF EXISTS public.account_approval_request_for_link(text);
