-- Migration: Add status change requests table to prayer management

-- Create status_change_requests table
CREATE TABLE IF NOT EXISTS status_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
    requested_status VARCHAR(20) NOT NULL CHECK (requested_status IN ('current', 'answered', 'ongoing', 'closed')),
    reason TEXT,
    requested_by VARCHAR(255) NOT NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    denial_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for status_change_requests table
CREATE INDEX IF NOT EXISTS idx_status_change_requests_prayer_id ON status_change_requests(prayer_id);
CREATE INDEX IF NOT EXISTS idx_status_change_requests_approval_status ON status_change_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_status_change_requests_created_at ON status_change_requests(created_at DESC);

-- Enable RLS on status_change_requests
ALTER TABLE status_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for status_change_requests
DROP POLICY IF EXISTS "Anyone can submit status change requests" ON status_change_requests;
CREATE POLICY "Anyone can submit status change requests" ON status_change_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view status change requests" ON status_change_requests;
CREATE POLICY "Anyone can view status change requests" ON status_change_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only authenticated users can update status change requests" ON status_change_requests;
CREATE POLICY "Only authenticated users can update status change requests" ON status_change_requests
    FOR UPDATE USING (auth.role() = 'authenticated');