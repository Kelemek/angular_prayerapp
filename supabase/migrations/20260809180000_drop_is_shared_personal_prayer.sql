-- Remove unused shared-personal-prayer flag (share-to-public feature removed).
ALTER TABLE "public"."prayers"
DROP COLUMN IF EXISTS "is_shared_personal_prayer";
