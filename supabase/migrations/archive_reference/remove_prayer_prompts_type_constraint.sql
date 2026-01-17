-- Remove the CHECK constraint on prayer_prompts.type
-- This allows dynamic types from the prayer_types table

-- Drop the existing constraint
ALTER TABLE prayer_prompts 
DROP CONSTRAINT IF EXISTS prayer_prompts_type_check;

-- Add a comment explaining the validation
COMMENT ON COLUMN prayer_prompts.type IS 'Category of prayer prompt. Valid types are managed in the prayer_types table.';
