-- Add is_shared_personal_prayer column to prayers table
-- This column indicates when a prayer originated from a user's personal prayer share
-- When true: the prayer and its updates are treated as a single approval unit

ALTER TABLE "public"."prayers"
ADD COLUMN "is_shared_personal_prayer" boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "public"."prayers"."is_shared_personal_prayer" IS 'Indicates if this prayer was shared from a user''s personal prayer. When true, prayer and updates are approved as a single unit.';
