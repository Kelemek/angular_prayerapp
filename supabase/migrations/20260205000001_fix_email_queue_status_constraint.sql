-- Fix email_queue status check constraint to include 'processing' status
-- This is needed for the concurrent execution safety feature

-- Drop the old constraint
ALTER TABLE "public"."email_queue" DROP CONSTRAINT IF EXISTS "email_queue_status_check";

-- Add new constraint with 'processing' status included
ALTER TABLE "public"."email_queue" ADD CONSTRAINT "email_queue_status_check" CHECK (status IN ('pending', 'processing', 'failed'));
