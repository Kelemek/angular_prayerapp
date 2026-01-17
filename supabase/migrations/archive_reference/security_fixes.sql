-- Security Fixes: Add SET search_path = public to all functions with mutable search_path
-- This prevents schema hijacking attacks by locking function execution to the public schema

-- Fix 1: cleanup_expired_verification_codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW()  -- Delete expired codes immediately
  OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '1 hour');  -- Delete used codes after 1 hour
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 2: update_admin_last_sign_in
CREATE OR REPLACE FUNCTION update_admin_last_sign_in(admin_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_subscribers
  SET last_sign_in_at = TIMEZONE('utc', NOW())
  WHERE email = admin_email AND is_admin = true;
END;
$$;

-- Fix 3: update_prayer_types_updated_at
CREATE OR REPLACE FUNCTION update_prayer_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 4: update_email_templates_updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 5: update_email_subscribers_updated_at
CREATE OR REPLACE FUNCTION update_email_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 6: update_user_preferences_updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Fix 7: update_pending_preference_changes_updated_at
CREATE OR REPLACE FUNCTION update_pending_preference_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Fix 8: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Fix 9: is_admin
CREATE OR REPLACE FUNCTION is_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN user_email IN ('admin@prayerapp.com', 'admin@example.com');
END;
$$;
