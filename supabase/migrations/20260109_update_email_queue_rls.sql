-- Update RLS policies for email_queue table
-- Allow anyone to insert into the queue (security is enforced at the approval layer - only admins can approve)
-- Allow service role to read/update for the background processor

-- Drop all existing policies
DROP POLICY IF EXISTS "Email queue only accessible via service role" ON email_queue;
DROP POLICY IF EXISTS "Allow authenticated users to enqueue emails" ON email_queue;
DROP POLICY IF EXISTS "Only admins can enqueue emails" ON email_queue;
DROP POLICY IF EXISTS "Only admins and service role can enqueue emails" ON email_queue;
DROP POLICY IF EXISTS "Service role can process queue" ON email_queue;

-- Allow anyone to insert (security at approval layer)
CREATE POLICY "Anyone can enqueue emails" ON email_queue
  FOR INSERT
  WITH CHECK (true);

-- Service role can read and update (for the background processor)
CREATE POLICY "Service role can process queue" ON email_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
