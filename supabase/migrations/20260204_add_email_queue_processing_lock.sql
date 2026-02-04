-- Add processing_started_at column to email_queue for concurrent execution safety
-- This allows multiple instances of the email processor to safely work without duplicates

ALTER TABLE "public"."email_queue" ADD COLUMN "processing_started_at" timestamp with time zone;

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS email_queue_status_idx ON "public"."email_queue"(status);

-- Add comment explaining the processing workflow
COMMENT ON COLUMN "public"."email_queue"."processing_started_at" IS 'Timestamp when email processing started. Used to prevent duplicate processing if multiple instances run concurrently. Workflow: pending -> processing -> success/failed';
