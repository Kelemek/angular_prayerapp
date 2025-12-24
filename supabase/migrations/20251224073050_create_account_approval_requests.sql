-- Create account_approval_requests table for managing new account requests
CREATE TABLE IF NOT EXISTS account_approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_account_approval_requests_email ON account_approval_requests(email);
CREATE INDEX idx_account_approval_requests_status ON account_approval_requests(approval_status);
CREATE INDEX idx_account_approval_requests_created_at ON account_approval_requests(created_at DESC);

-- Enable RLS
ALTER TABLE account_approval_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (admins) can read requests
CREATE POLICY "Authenticated users can read account approval requests"
  ON account_approval_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Anyone can insert their own request (during signup)
CREATE POLICY "Anyone can create account approval request"
  ON account_approval_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users (admins) can update requests
CREATE POLICY "Authenticated users can update account approval requests"
  ON account_approval_requests
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Only authenticated users (admins) can delete requests
CREATE POLICY "Authenticated users can delete account approval requests"
  ON account_approval_requests
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_approval_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for updated_at
CREATE TRIGGER account_approval_requests_updated_at
  BEFORE UPDATE ON account_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_account_approval_requests_updated_at();

-- Add email templates for account approval
INSERT INTO email_templates (template_key, name, subject, html_body, text_body, description)
VALUES 
  (
    'account_approval_request',
    'Account Approval Request',
    'New Account Access Request',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2F5F54;">New Account Access Request</h2>
      <p>A new user is requesting access to the prayer application:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Name:</strong> {{firstName}} {{lastName}}</p>
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>Requested:</strong> {{requestedDate}}</p>
      </div>
      <p>This email was not found in Planning Center. Please review and approve or deny this request:</p>
      <div style="margin: 30px 0;">
        <a href="{{approveLink}}" style="display: inline-block; padding: 12px 30px; background-color: #2F5F54; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">Approve Access</a>
        <a href="{{denyLink}}" style="display: inline-block; padding: 12px 30px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">Deny Access</a>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from your prayer application.</p>
    </div>',
    'New Account Access Request

A new user is requesting access to the prayer application:

Name: {{firstName}} {{lastName}}
Email: {{email}}
Requested: {{requestedDate}}

This email was not found in Planning Center. Please review and approve or deny this request.

Approve: {{approveLink}}
Deny: {{denyLink}}',
    'Sent to admins when a new user not in Planning Center requests account access'
  ),
  (
    'account_approved',
    'Account Approved',
    'Your Account Has Been Approved',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2F5F54;">Account Approved!</h2>
      <p>Hi {{firstName}},</p>
      <p>Great news! Your account access request has been approved by an administrator.</p>
      <p>You can now log in to the prayer application using your email address:</p>
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2F5F54;">
        <p><strong>Email:</strong> {{email}}</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{loginLink}}" style="display: inline-block; padding: 12px 30px; background-color: #2F5F54; color: white; text-decoration: none; border-radius: 5px;">Log In Now</a>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from your prayer application.</p>
    </div>',
    'Account Approved!

Hi {{firstName}},

Great news! Your account access request has been approved by an administrator.

You can now log in to the prayer application using your email address.

Log in here: {{loginLink}}',
    'Sent to user when their account request is approved'
  ),
  (
    'account_denied',
    'Account Request Denied',
    'Account Access Request Update',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #666;">Account Request Status</h2>
      <p>Hi {{firstName}},</p>
      <p>Thank you for your interest in accessing the prayer application.</p>
      <p>After review, we are unable to approve your account request at this time. If you believe this is an error or would like more information, please contact an administrator.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from your prayer application.</p>
    </div>',
    'Account Request Status

Hi {{firstName}},

Thank you for your interest in accessing the prayer application.

After review, we are unable to approve your account request at this time. If you believe this is an error or would like more information, please contact an administrator.',
    'Sent to user when their account request is denied'
  )
ON CONFLICT (template_key) DO NOTHING;
