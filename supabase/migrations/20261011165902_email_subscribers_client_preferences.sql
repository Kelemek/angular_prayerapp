ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS client_preferences jsonb;

COMMENT ON COLUMN public.email_subscribers.client_preferences IS
  'Per-user UI preferences synced from the client (theme, text size, Pray page settings, memorization UI, Pray For modal skip). Null until first sync.';
