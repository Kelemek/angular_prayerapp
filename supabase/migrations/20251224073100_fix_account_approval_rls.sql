-- Fix RLS policy for account_approval_requests to allow inserts

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can read account approval requests" ON account_approval_requests;
DROP POLICY IF EXISTS "Anyone can create account approval request" ON account_approval_requests;
DROP POLICY IF EXISTS "Allow insert for account approval requests" ON account_approval_requests;
DROP POLICY IF EXISTS "Anon users can create account approval request" ON account_approval_requests;
DROP POLICY IF EXISTS "Authenticated users can create account approval request" ON account_approval_requests;
DROP POLICY IF EXISTS "Authenticated users can update account approval requests" ON account_approval_requests;
DROP POLICY IF EXISTS "Authenticated users can delete account approval requests" ON account_approval_requests;

-- Recreate all policies

-- Read policy: Allow anonymous reads (for admin portal queries)
CREATE POLICY "Allow read account approval requests"
  ON account_approval_requests
  FOR SELECT
  USING (true);

-- Insert policies: Separate policies for anon and authenticated users
CREATE POLICY "Anon users can create account approval request"
  ON account_approval_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create account approval request"
  ON account_approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update policy: Allow all updates (admin portal runs as anon)
CREATE POLICY "Allow update account approval requests"
  ON account_approval_requests
  FOR UPDATE
  USING (true);

-- Delete policy: Allow all deletes (admin portal runs as anon)
CREATE POLICY "Allow delete account approval requests"
  ON account_approval_requests
  FOR DELETE
  USING (true);

-- Create an RPC function to create approval requests (bypasses RLS)
CREATE OR REPLACE FUNCTION create_account_approval_request(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO account_approval_requests (email, first_name, last_name, approval_status)
  VALUES (p_email, p_first_name, p_last_name, 'pending')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;
