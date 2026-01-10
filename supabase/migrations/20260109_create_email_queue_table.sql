-- Create email_queue table for managing email sending with retry logic
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  template_key TEXT NOT NULL,
  template_variables JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on status and created_at for efficient queue processing
CREATE INDEX idx_email_queue_status ON email_queue(status, created_at);

-- Create index on recipient for batch operations
CREATE INDEX idx_email_queue_recipient ON email_queue(recipient);

-- Enable RLS (Row Level Security)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Only service_role (via Supabase) can access email_queue
-- This table should only be accessed through scheduled jobs and edge functions
CREATE POLICY "Email queue only accessible via service role" ON email_queue
  FOR ALL
  USING (false)
  WITH CHECK (false);
