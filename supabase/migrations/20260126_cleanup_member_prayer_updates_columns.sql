-- Remove unnecessary columns from member_prayer_updates table
-- Keep only: id, person_id, content, created_at, updated_at

-- First, drop any policies that depend on author_email
DROP POLICY IF EXISTS "Allow users to update their own updates" ON "public"."member_prayer_updates";
DROP POLICY IF EXISTS "Allow users to delete their own updates" ON "public"."member_prayer_updates";

-- Then drop the columns
ALTER TABLE "public"."member_prayer_updates"
DROP COLUMN IF EXISTS "member_name",
DROP COLUMN IF EXISTS "author",
DROP COLUMN IF EXISTS "author_email",
DROP COLUMN IF EXISTS "is_anonymous",
DROP COLUMN IF EXISTS "approval_status";
