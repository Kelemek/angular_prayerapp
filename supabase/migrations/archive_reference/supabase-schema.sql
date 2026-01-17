-- Prayer Manager Database Schema for Supabase
-- Run this SQL in your Supabase SQL editor to create the necessary tables

-- Create prayers table
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

-- Create prayer_updates table
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

-- Create deletion_requests table
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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Create trigger for prayers table
CREATE TRIGGER update_prayers_updated_at 
    BEFORE UPDATE ON prayers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for prayer_updates table
CREATE TRIGGER update_prayer_updates_updated_at 
    BEFORE UPDATE ON prayer_updates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
-- Note: These policies allow anyone to view approved prayers/updates and insert new ones
-- Admin operations require additional policies (see other migrations)

CREATE POLICY "Anyone can view approved prayers" ON prayers
    FOR SELECT USING (approval_status = 'approved');

CREATE POLICY "Anyone can insert prayers" ON prayers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view approved updates" ON prayer_updates
    FOR SELECT USING (approval_status = 'approved');

CREATE POLICY "Anyone can insert updates" ON prayer_updates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all operations on deletion_requests" ON deletion_requests
    FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayers_status ON prayers(status);
CREATE INDEX IF NOT EXISTS idx_prayers_approval_status ON prayers(approval_status);
CREATE INDEX IF NOT EXISTS idx_prayers_prayer_for ON prayers(prayer_for);
CREATE INDEX IF NOT EXISTS idx_prayers_is_anonymous ON prayers(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_prayers_email ON prayers(email);
CREATE INDEX IF NOT EXISTS idx_prayers_created_at ON prayers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_updates_prayer_id ON prayer_updates(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_updates_approval_status ON prayer_updates(approval_status);
CREATE INDEX IF NOT EXISTS idx_prayer_updates_created_at ON prayer_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_prayer_id ON deletion_requests(prayer_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_approval_status ON deletion_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_created_at ON deletion_requests(created_at DESC);

-- Insert some sample data (optional)
-- Note: Sample prayers are inserted with approval_status='approved' so they're visible
-- Email addresses are required (NOT NULL), so they must be included
INSERT INTO prayers (title, description, requester, prayer_for, email, approval_status) VALUES 
  ('Healing for John', 'Please pray for John''s recovery from surgery', 'Sarah Johnson', 'John', 'sarah.johnson@example.com', 'approved'),
  ('Guidance for Career Decision', 'Seeking God''s wisdom for a new job opportunity', 'Michael Chen', 'Michael', 'michael.chen@example.com', 'approved'),
  ('Thanksgiving for Safe Travel', 'Praising God for safe arrival after long journey', 'Pastor David', 'Pastor David', 'pastor.david@example.com', 'approved');

-- Add a sample update (with approval_status='approved' so it's visible)
-- author_email is required (NOT NULL), so it must be included
INSERT INTO prayer_updates (prayer_id, content, author, author_email, approval_status) 
SELECT id, 'John is recovering well and should be home soon!', 'Sarah Johnson', 'sarah.johnson@example.com', 'approved'
FROM prayers WHERE title = 'Healing for John' LIMIT 1;