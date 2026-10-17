-- Login calls these before a subscriber session exists.
-- verify-code mints a JWT only for an active email_subscribers row.
-- The approval request can be spammed or used to probe emails. Rate limiting is later work.

GRANT EXECUTE ON FUNCTION public.has_pending_account_approval(text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_account_approval_request(text, text, text, text) TO anon;

-- ROLLBACK
-- REVOKE EXECUTE ON FUNCTION public.has_pending_account_approval(text) FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.create_account_approval_request(text, text, text, text) FROM anon;
