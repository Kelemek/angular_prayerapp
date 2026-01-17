-- Current Database Schema Snapshot
-- Generated: January 16, 2026
-- This represents the actual database schema after all migrations have been applied
-- 
-- Migrations Applied (in order):
-- 1. supabase-schema.sql (base schema)
-- 2. 20251022000002_add_denied_at_columns.sql (added denied_at columns)
-- 3. 20251224073050_create_account_approval_requests.sql (added account_approval_requests table)
-- 4. 20260116_remove_approved_by.sql (removes unused approved_by columns)
--
-- Use this for reference when:
-- - Understanding current schema structure
-- - Onboarding new developers
-- - Comparing against actual database state
-- - Validating migrations have been applied correctly

-- ============================================================================
-- PRAYERS TABLE
-- ============================================================================
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
  -- approved_by REMOVED - unused column (20260116_remove_approved_by.sql)
  approved_at TIMESTAMPTZ,
  denial_reason TEXT,
  denied_at TIMESTAMPTZ,  -- Added by 20251022000002_add_denied_at_columns.sql
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prayers_status ON prayers(status);
CREATE INDEX idx_prayers_approval_status ON prayers(approval_status);
CREATE INDEX idx_prayers_email ON prayers(email);
CREATE INDEX idx_prayers_created_at ON prayers(created_at DESC);

-- ============================================================================
-- PRAYER_UPDATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS prayer_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  -- approved_by REMOVED - unused column (20260116_remove_approved_by.sql)
  approved_at TIMESTAMPTZ,
  denial_reason TEXT,
  denied_at TIMESTAMPTZ,  -- Added by 20251022000002_add_denied_at_columns.sql
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prayer_updates_prayer_id ON prayer_updates(prayer_id);
CREATE INDEX idx_prayer_updates_approval_status ON prayer_updates(approval_status);
CREATE INDEX idx_prayer_updates_created_at ON prayer_updates(created_at DESC);

-- ============================================================================
-- DELETION_REQUESTS TABLE
-- ============================================================================
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

-- ============================================================================
-- ACCOUNT_APPROVAL_REQUESTS TABLE
-- Created by: 20251224073050_create_account_approval_requests.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS account_approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  -- approved_by REMOVED - unused column (20260116_remove_approved_by.sql)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_account_approval_requests_email ON account_approval_requests(email);
CREATE INDEX idx_account_approval_requests_status ON account_approval_requests(approval_status);
CREATE INDEX idx_account_approval_requests_created_at ON account_approval_requests(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_approval_requests ENABLE ROW LEVEL SECURITY;

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
$$ language 'plpgsql' SET search_path = public;

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

-- ============================================================================
-- SCHEMA NOTES
-- ============================================================================

-- Removed Columns:
-- - prayers.approved_by (removed by 20260116_remove_approved_by.sql)
-- - prayer_updates.approved_by (removed by 20260116_remove_approved_by.sql)
-- - account_approval_requests.approved_by (removed by 20260116_remove_approved_by.sql)
-- Reason: Never used in application logic. approved_at timestamp is used instead.

-- Key Columns:
-- - approved_at: Timestamp when prayer/update was approved (used by admin dashboard)
-- - denied_at: Timestamp when prayer/update was denied (used for sorting denials)
-- - denial_reason: Reason for denial (shown to users)
-- - approval_status: Current status (pending, approved, denied)

-- Foreign Keys:
-- - prayer_updates.prayer_id -> prayers.id (CASCADE DELETE)
-- - deletion_requests.prayer_id -> prayers.id (CASCADE Delete)

-- Timestamps:
-- - created_at: UTC timezone, set on creation
-- - updated_at: UTC timezone, auto-updated via trigger
-- - approved_at: UTC timezone, set when approved
-- - denied_at: UTC timezone, set when denied
-- - date_answered: User-set timezone-aware timestamp
-- - date_requested: UTC timezone, set on creation
