-- Create personal_prayers table for user-specific prayer requests
-- These prayers are private to each user with no admin approval workflow
CREATE TABLE IF NOT EXISTS personal_prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prayer_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'answered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_email for efficient filtering
CREATE INDEX IF NOT EXISTS idx_personal_prayers_user_email ON personal_prayers(user_email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_personal_prayers_created_at ON personal_prayers(created_at DESC);

-- Create personal_prayer_updates table for tracking updates to personal prayers
CREATE TABLE IF NOT EXISTS personal_prayer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_prayer_id UUID NOT NULL REFERENCES personal_prayers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_email TEXT NOT NULL,
  mark_as_answered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on personal_prayer_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_personal_prayer_updates_personal_prayer_id ON personal_prayer_updates(personal_prayer_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_personal_prayer_updates_created_at ON personal_prayer_updates(created_at DESC);

-- Enable RLS (Row Level Security)
-- Note: Real security is enforced at the application level (prayer.service.ts)
-- RLS policies are permissive because custom MFA auth doesn't populate Supabase JWT
ALTER TABLE personal_prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_prayer_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all access (app layer enforces user_email filtering)
CREATE POLICY "Allow all personal_prayers access" ON personal_prayers
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all personal_prayer_updates access" ON personal_prayer_updates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- NOTE: Security is handled at the application level (prayer.service.ts)
-- All queries filter by user_email to ensure users only access their own personal prayers
-- RLS is enabled but permissive because the custom auth system doesn't populate Supabase session claims
