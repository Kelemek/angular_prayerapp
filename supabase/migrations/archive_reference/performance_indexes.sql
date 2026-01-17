-- Performance optimization indexes
-- Run this migration to add composite indexes for common query patterns

-- Composite index for fetching approved prayers ordered by date
-- This supports: WHERE approval_status = 'approved' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_prayers_approval_created 
  ON prayers(approval_status, created_at DESC);

-- Composite index for prayer_updates to filter approved by prayer_id
-- This supports: WHERE prayer_id = ? AND approval_status = 'approved'
CREATE INDEX IF NOT EXISTS idx_prayer_updates_prayer_approval 
  ON prayer_updates(prayer_id, approval_status);

-- Composite index for admin queries fetching pending items
CREATE INDEX IF NOT EXISTS idx_prayers_pending_created 
  ON prayers(approval_status, created_at DESC) 
  WHERE approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_prayer_updates_pending_created 
  ON prayer_updates(approval_status, created_at DESC) 
  WHERE approval_status = 'pending';

-- Composite indexes for update deletion requests  
CREATE INDEX IF NOT EXISTS idx_update_deletion_approval_created 
  ON update_deletion_requests(approval_status, created_at DESC);

-- Index for verification codes cleanup query
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires 
  ON verification_codes(expires_at) 
  WHERE used_at IS NULL;

-- Indexes for prayer prompts and types
CREATE INDEX IF NOT EXISTS idx_prayer_types_active_order 
  ON prayer_types(is_active, display_order) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_prayer_prompts_created 
  ON prayer_prompts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prayer_prompts_type 
  ON prayer_prompts(type);

-- Comments
COMMENT ON INDEX idx_prayers_approval_created IS 'Optimizes main prayer list query';
COMMENT ON INDEX idx_prayer_updates_prayer_approval IS 'Optimizes prayer updates join filter';
COMMENT ON INDEX idx_prayers_pending_created IS 'Partial index for admin pending prayers';
COMMENT ON INDEX idx_prayer_updates_pending_created IS 'Partial index for admin pending updates';
COMMENT ON INDEX idx_prayer_types_active_order IS 'Optimizes active prayer types lookup';
COMMENT ON INDEX idx_prayer_prompts_type IS 'Optimizes prompt filtering by type';
