-- Create prayer_prompts table
-- These are admin-curated prayer prompts to inspire prayer
CREATE TABLE IF NOT EXISTS prayer_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Healing', 'Guidance', 'Thanksgiving', 'Protection', 'Family', 'Finances', 'Salvation', 'Missions', 'Other')),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_prayer_prompts_type ON prayer_prompts(type);
CREATE INDEX IF NOT EXISTS idx_prayer_prompts_created_at ON prayer_prompts(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_prayer_prompts_updated_at 
BEFORE UPDATE ON prayer_prompts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE prayer_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read prayer prompts (they are inspirational)
CREATE POLICY "Anyone can read prayer prompts"
ON prayer_prompts FOR SELECT
TO anon, authenticated
USING (true);

-- Allow insert/update/delete for all users
-- Admin authorization is enforced at the application level
CREATE POLICY "Anyone can manage prompts"
ON prayer_prompts FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Comments
COMMENT ON TABLE prayer_prompts IS 'Admin-curated prayer prompts to inspire prayer';
COMMENT ON COLUMN prayer_prompts.type IS 'Category matching prayer types: Healing, Guidance, Thanksgiving, Protection, Family, Finances, Salvation, Missions, Other';
