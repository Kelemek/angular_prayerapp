-- Complete migration to support dynamic prayer types
-- Run this in Supabase SQL Editor

-- Step 1: Add new prayer types
INSERT INTO prayer_types (name, display_order) VALUES
  ('ACTS', 10),
  ('Bible', 11),
  ('Church', 12),
  ('Cities', 13),
  ('Country', 14),
  ('Puritans', 15)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Remove CHECK constraint from prayer_prompts
ALTER TABLE prayer_prompts 
DROP CONSTRAINT IF EXISTS prayer_prompts_type_check;

-- Update comment
COMMENT ON COLUMN prayer_prompts.type IS 'Category of prayer prompt. Valid types are managed in the prayer_types table.';

-- Verify types
SELECT name, display_order, is_active 
FROM prayer_types 
ORDER BY display_order;
