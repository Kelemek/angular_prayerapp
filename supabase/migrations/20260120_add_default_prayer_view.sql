-- Add default_prayer_view column to email_subscribers table
-- This column stores the user's preference for default view when logging in
-- Can be either 'current' (for public prayers) or 'personal' (for personal prayers)

ALTER TABLE email_subscribers
ADD COLUMN default_prayer_view VARCHAR(20) NOT NULL DEFAULT 'current';

-- Add constraint to ensure only valid values are stored
ALTER TABLE email_subscribers
ADD CONSTRAINT default_prayer_view_check CHECK (default_prayer_view IN ('current', 'personal'));

COMMENT ON COLUMN email_subscribers.default_prayer_view IS 'User preference for default prayer view: "current" for public prayers or "personal" for personal prayers. Default is "current".';
