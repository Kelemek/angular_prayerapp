-- Add new prayer types for the import
-- This adds types used in the prayer_prompts_import.csv file

INSERT INTO prayer_types (name, display_order) VALUES
  ('ACTS', 10),
  ('Bible', 11),
  ('Church', 12),
  ('Cities', 13),
  ('Country', 14),
  ('Puritans', 15)
ON CONFLICT (name) DO NOTHING;

-- Update comment
COMMENT ON TABLE prayer_types IS 'Available types/categories for prayer prompts. Managed by administrators.';
