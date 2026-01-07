-- Update RLS policy to allow anonymous users to check pending approval status
-- This is needed during login when users check if they have a pending approval request
DROP POLICY IF EXISTS "Authenticated users can read account approval requests" ON account_approval_requests;

CREATE POLICY "Read account approval requests"
  ON account_approval_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

