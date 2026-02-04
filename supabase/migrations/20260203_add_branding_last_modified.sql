-- Add last_modified column to admin_settings for branding cache optimization
ALTER TABLE "public"."admin_settings" ADD COLUMN "branding_last_modified" timestamp with time zone DEFAULT now();

-- Create a function to automatically update branding_last_modified when branding fields change
CREATE OR REPLACE FUNCTION update_branding_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update branding_last_modified if branding-related fields actually changed
  IF (
    OLD.use_logo IS DISTINCT FROM NEW.use_logo OR
    OLD.light_mode_logo_blob IS DISTINCT FROM NEW.light_mode_logo_blob OR
    OLD.dark_mode_logo_blob IS DISTINCT FROM NEW.dark_mode_logo_blob OR
    OLD.app_title IS DISTINCT FROM NEW.app_title OR
    OLD.app_subtitle IS DISTINCT FROM NEW.app_subtitle
  ) THEN
    NEW.branding_last_modified = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update branding_last_modified on admin_settings changes
DROP TRIGGER IF EXISTS admin_settings_branding_modified_trigger ON "public"."admin_settings";

CREATE TRIGGER admin_settings_branding_modified_trigger
BEFORE UPDATE ON "public"."admin_settings"
FOR EACH ROW
EXECUTE FUNCTION update_branding_last_modified();
