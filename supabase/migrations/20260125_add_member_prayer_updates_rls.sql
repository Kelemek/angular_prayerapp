-- Add RLS policies for member_prayer_updates table

-- Enable RLS on this table
ALTER TABLE "public"."member_prayer_updates" ENABLE ROW LEVEL SECURITY;

-- Create permissive policies to allow all operations (security handled at application level)
CREATE POLICY "Allow all select on member_prayer_updates" 
ON "public"."member_prayer_updates" 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all insert on member_prayer_updates" 
ON "public"."member_prayer_updates" 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all update on member_prayer_updates" 
ON "public"."member_prayer_updates" 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all delete on member_prayer_updates" 
ON "public"."member_prayer_updates" 
FOR DELETE 
USING (true);

-- Grant roles access to the table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."member_prayer_updates" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."member_prayer_updates" TO "authenticated";

