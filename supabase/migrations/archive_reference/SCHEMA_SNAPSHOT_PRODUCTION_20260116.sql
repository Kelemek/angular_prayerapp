-- Production Database Schema Snapshot
-- Generated: January 16, 2026
-- Purpose: Reference documentation for current production database state
-- Use for: Onboarding, validation, and setting up new databases
-- 
-- ============================================================================
-- MIGRATION HISTORY (Applied to Production)
-- ============================================================================
-- Base schema created with core tables and RLS policies
-- 2025-10-22: add_denied_at_columns - Added denied_at to prayers and prayer_updates
-- 2025-12-24: create_account_approval_requests - Added account approval workflow
-- 2026-01-03: add_github_settings - Added GitHub integration config to admin_settings
-- 2026-01-07: add_affiliation_reason_to_account_approval_requests - Added reason field
-- 2026-01-07: add_anon_read_to_account_approval_requests - Updated RLS for login flow
-- 2026-01-07: update_account_approval_rpc_with_reason - Updated RPC function
-- 2026-01-08: add_last_activity_date - Added activity tracking to email_subscribers
-- 2026-01-08: remove_last_sign_in_at - Removed obsolete sign_in column
-- 2026-01-09: add_unsubscribe_links_to_email_templates - Updated email templates
-- 2026-01-09: create_email_queue_table - Added email queue for background processing
-- 2026-01-09: update_email_queue_rls - Set up RLS for email queue
-- 2026-01-11: add_badge_functionality_column - Added notification badges to subscribers
-- 2026-01-16: remove_approved_by - Removed unused approved_by columns

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- PRAYERS TABLE
-- Core prayer requests submitted by users
CREATE TABLE IF NOT EXISTS prayers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'ongoing', 'answered', 'closed')),
  requester TEXT NOT NULL,
  prayer_for VARCHAR(255) NOT NULL DEFAULT 'General Prayer',
  email VARCHAR(255) NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  date_requested TIMESTAMPTZ DEFAULT NOW(),
  date_answered TIMESTAMPTZ,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  approved_at TIMESTAMPTZ,
  denial_reason TEXT,
  denied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prayers_status ON prayers(status);
CREATE INDEX idx_prayers_approval_status ON prayers(approval_status);
CREATE INDEX idx_prayers_email ON prayers(email);
CREATE INDEX idx_prayers_created_at ON prayers(created_at DESC);

-- PRAYER_UPDATES TABLE
-- Updates/intercessions for existing prayers
CREATE TABLE IF NOT EXISTS prayer_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  approved_at TIMESTAMPTZ,
  denial_reason TEXT,
  denied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prayer_updates_prayer_id ON prayer_updates(prayer_id);
CREATE INDEX idx_prayer_updates_approval_status ON prayer_updates(approval_status);
CREATE INDEX idx_prayer_updates_created_at ON prayer_updates(created_at DESC);

-- DELETION_REQUESTS TABLE
-- Requests to delete prayers with audit trail
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  reason TEXT,
  requested_by TEXT NOT NULL,
  requested_email VARCHAR(255) NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deletion_requests_prayer_id ON deletion_requests(prayer_id);
CREATE INDEX idx_deletion_requests_status ON deletion_requests(approval_status);

-- ACCOUNT_APPROVAL_REQUESTS TABLE
-- New user account approval workflow
CREATE TABLE IF NOT EXISTS account_approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  affiliation_reason TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_account_approval_requests_email ON account_approval_requests(email);
CREATE INDEX idx_account_approval_requests_status ON account_approval_requests(approval_status);
CREATE INDEX idx_account_approval_requests_created_at ON account_approval_requests(created_at DESC);
CREATE INDEX idx_account_approval_requests_reason ON account_approval_requests(affiliation_reason);

-- ============================================================================
-- ADMIN & CONFIGURATION TABLES
-- ============================================================================

-- EMAIL_SUBSCRIBERS TABLE
-- Users subscribed to prayer notifications
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_approved BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  last_activity_date TIMESTAMP WITH TIME ZONE,
  badge_functionality_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX idx_email_subscribers_approved ON email_subscribers(is_approved);

-- ADMIN_SETTINGS TABLE
-- Application configuration and integrations
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  github_token TEXT DEFAULT NULL,
  github_repo_owner TEXT DEFAULT '',
  github_repo_name TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_settings_key ON admin_settings(setting_key);

-- EMAIL_TEMPLATES TABLE
-- Customizable email templates with unsubscribe links
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_key ON email_templates(template_key);

-- EMAIL_QUEUE TABLE
-- Background email processing with retry logic
CREATE TABLE IF NOT EXISTS email_queue (
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

CREATE INDEX idx_email_queue_status ON email_queue(status, created_at);
CREATE INDEX idx_email_queue_recipient ON email_queue(recipient);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Public read access to approved prayers
CREATE POLICY "Anyone can view approved prayers" ON prayers
    FOR SELECT USING (approval_status = 'approved');

-- Public insert access to prayers
CREATE POLICY "Anyone can insert prayers" ON prayers
    FOR INSERT WITH CHECK (true);

-- Public read access to approved updates
CREATE POLICY "Anyone can view approved updates" ON prayer_updates
    FOR SELECT USING (approval_status = 'approved');

-- Public insert access to updates
CREATE POLICY "Anyone can insert updates" ON prayer_updates
    FOR INSERT WITH CHECK (true);

-- Allow all operations on deletion_requests
CREATE POLICY "Allow all operations on deletion_requests" ON deletion_requests
    FOR ALL USING (true) WITH CHECK (true);

-- Read account approval requests (anonymous and authenticated can check status during login)
CREATE POLICY "Read account approval requests" ON account_approval_requests
    FOR SELECT TO anon, authenticated USING (true);

-- Anyone can enqueue emails
CREATE POLICY "Anyone can enqueue emails" ON email_queue
    FOR INSERT WITH CHECK (true);

-- Service role can process queue
CREATE POLICY "Service role can process queue" ON email_queue
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for prayers table
CREATE TRIGGER update_prayers_updated_at 
    BEFORE UPDATE ON prayers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for prayer_updates table
CREATE TRIGGER update_prayer_updates_updated_at 
    BEFORE UPDATE ON prayer_updates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for deletion_requests table
CREATE TRIGGER update_deletion_requests_updated_at 
    BEFORE UPDATE ON deletion_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for email_subscribers table
CREATE TRIGGER update_email_subscribers_updated_at 
    BEFORE UPDATE ON email_subscribers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for admin_settings table
CREATE TRIGGER update_admin_settings_updated_at 
    BEFORE UPDATE ON admin_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for email_templates table
CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for email_queue table
CREATE TRIGGER update_email_queue_updated_at 
    BEFORE UPDATE ON email_queue 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STORED PROCEDURES / RPC FUNCTIONS
-- ============================================================================

-- Create account approval request with affiliation reason
CREATE OR REPLACE FUNCTION create_account_approval_request(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_affiliation_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO account_approval_requests (email, first_name, last_name, affiliation_reason, approval_status)
  VALUES (p_email, p_first_name, p_last_name, p_affiliation_reason, 'pending')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================================================
-- SCHEMA DOCUMENTATION
-- ============================================================================

-- REMOVED COLUMNS:
-- - prayers.approved_by (removed by 20260116_remove_approved_by.sql)
-- - prayer_updates.approved_by (removed by 20260116_remove_approved_by.sql)
-- - account_approval_requests.approved_by (removed by 20260116_remove_approved_by.sql)
-- Reason: Never used in application; approved_at timestamp is used instead

-- REMOVED COLUMNS:
-- - email_subscribers.last_sign_in_at (removed by 20260108_remove_last_sign_in_at.sql)
-- Reason: Consolidated into last_activity_date for unified activity tracking

-- KEY COLUMN PURPOSES:
-- Approval Workflow:
--   approval_status: 'pending' (waiting for admin), 'approved' (visible to users), 'denied' (hidden)
--   approved_at: Timestamp when approved by admin
--   denied_at: Timestamp when denied by admin
--   denial_reason: Explanation shown to users why it was denied

-- Activity Tracking:
--   last_activity_date: Last time user performed an action (loaded page, etc)
--   badge_functionality_enabled: User opt-in for notification badges

-- Admin Integration:
--   github_token: GitHub PAT for feedback issues (encrypted at application level)
--   github_repo_owner: GitHub username/org for feedback repo
--   github_repo_name: GitHub repository name for feedback issues

-- Email Configuration:
--   email_queue.status: Controls retry logic ('pending' = will retry, 'sent' = success, 'failed' = max retries)
--   email_queue.attempts: Incremented on each send attempt, used to enforce retry limits
--   template_variables: JSONB map of available variables for template substitution

-- FOREIGN KEY RELATIONSHIPS:
-- - prayer_updates.prayer_id -> prayers.id (CASCADE DELETE)
-- - deletion_requests.prayer_id -> prayers.id (CASCADE DELETE)

-- TIMESTAMP CONVENTIONS:
-- All timestamps use TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ) except:
--   account_approval_requests: Uses explicit TIMEZONE('utc', NOW())
-- This ensures consistent UTC storage and timezone-aware retrieval

-- INDEXES:
-- Status/approval columns are indexed for fast filtering (admin dashboard queries)
-- created_at is indexed DESC for efficient sorting/pagination
-- Foreign key columns are indexed for join performance
-- Email columns are indexed for lookup and uniqueness enforcement

-- RLS SECURITY MODEL:
-- Public (anon) users:
--   - Can read: approved prayers and updates
--   - Can insert: new prayers and updates (approval workflow applies)
--   - Can check: pending account approval requests
--   - Can enqueue: emails

-- Authenticated (logged-in) users:
--   - Same as public until admin workflow is implemented
--   - Future: May have additional write permissions for own prayers/updates

-- Service role (background processes):
--   - Can read/update: email_queue for background email processor
--   - No direct table access for end users via this role

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Getting all approved prayers with their updates:
-- SELECT p.*, COUNT(u.id) as update_count
-- FROM prayers p
-- LEFT JOIN prayer_updates u ON u.prayer_id = p.id AND u.approval_status = 'approved'
-- WHERE p.approval_status = 'approved'
-- GROUP BY p.id
-- ORDER BY p.created_at DESC

-- Getting pending approval items for admin dashboard:
-- SELECT 'prayer' as type, id, title as content, created_at
-- FROM prayers
-- WHERE approval_status = 'pending'
-- UNION ALL
-- SELECT 'update' as type, id, content, created_at
-- FROM prayer_updates
-- WHERE approval_status = 'pending'
-- ORDER BY created_at DESC

-- Getting users subscribed to notifications:
-- SELECT email, is_approved, preferences, badge_functionality_enabled
-- FROM email_subscribers
-- WHERE is_approved = true
-- ORDER BY last_activity_date DESC NULLS LAST

-- Processing email queue (background job):
-- SELECT * FROM email_queue
-- WHERE status = 'pending' AND attempts < 3
-- ORDER BY created_at ASC
-- LIMIT 10

