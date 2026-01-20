-- Add display_order column to personal_prayers table
-- This column stores the user's preferred ordering for personal prayer cards
-- Default is 0 for existing prayers, new prayers get incremented values
-- Sorts with DESC so highest order appears first (newest at top)

ALTER TABLE personal_prayers
ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- Create index on display_order for efficient sorting
CREATE INDEX idx_personal_prayers_display_order ON personal_prayers(user_email, display_order DESC);

COMMENT ON COLUMN personal_prayers.display_order IS 'Display order for personal prayer cards. Used with DESC sorting so higher values appear first. Default 0 for existing prayers which then sort by created_at.';
