-- Create prayer_types table
CREATE TABLE IF NOT EXISTS prayer_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for active types ordered by display_order
CREATE INDEX idx_prayer_types_active_order ON prayer_types(is_active, display_order);

-- Add RLS policies
ALTER TABLE prayer_types ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read prayer types
CREATE POLICY "Anyone can read prayer types"
  ON prayer_types FOR SELECT
  USING (true);

-- Allow anyone to manage prayer types (admin check at application level)
CREATE POLICY "Anyone can manage prayer types"
  ON prayer_types FOR ALL
  USING (true);

-- Insert default prayer types
INSERT INTO prayer_types (name, display_order) VALUES
  ('Healing', 1),
  ('Guidance', 2),
  ('Thanksgiving', 3),
  ('Protection', 4),
  ('Family', 5),
  ('Finances', 6),
  ('Salvation', 7),
  ('Missions', 8),
  ('Other', 9)
ON CONFLICT (name) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prayer_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_prayer_types_timestamp
  BEFORE UPDATE ON prayer_types
  FOR EACH ROW
  EXECUTE FUNCTION update_prayer_types_updated_at();
