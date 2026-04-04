-- Per-user visibility for Pray For and praying count on prayer cards (viewer-only UI).
ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS show_pray_for_button boolean NOT NULL DEFAULT true;

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS show_praying_count boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.email_subscribers.show_pray_for_button IS 'When false, this user does not see the Pray For / Prayed For controls on community prayer cards.';
COMMENT ON COLUMN public.email_subscribers.show_praying_count IS 'When false, this user does not see the N Praying count chip on prayer cards (requester/admin visibility still suppressed for that user).';
