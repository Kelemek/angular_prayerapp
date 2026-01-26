-- Add is_answered column to member_prayer_updates table

ALTER TABLE "public"."member_prayer_updates"
ADD COLUMN "is_answered" BOOLEAN DEFAULT false NOT NULL;
