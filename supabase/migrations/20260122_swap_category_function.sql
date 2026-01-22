-- Create a function to swap category ranges in a single transaction
-- This reduces egress by doing all updates server-side instead of 39+ client queries

CREATE OR REPLACE FUNCTION swap_personal_prayer_categories(
  p_user_email TEXT,
  p_category_a TEXT,
  p_category_b TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix_a INTEGER;
  v_prefix_b INTEGER;
  v_count_a INTEGER;
  v_count_b INTEGER;
BEGIN
  -- Get the prefixes and counts for both categories
  SELECT 
    FLOOR(MIN(display_order) / 1000)::INTEGER,
    COUNT(*)
  INTO v_prefix_a, v_count_a
  FROM personal_prayers
  WHERE user_email = p_user_email 
    AND category = p_category_a;

  SELECT 
    FLOOR(MIN(display_order) / 1000)::INTEGER,
    COUNT(*)
  INTO v_prefix_b, v_count_b
  FROM personal_prayers
  WHERE user_email = p_user_email 
    AND category = p_category_b;

  -- Validate that both categories exist
  IF v_prefix_a IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Category A not found: ' || p_category_a;
    RETURN;
  END IF;

  IF v_prefix_b IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Category B not found: ' || p_category_b;
    RETURN;
  END IF;

  -- Step 1: Move category A to temp (prefix 999)
  UPDATE personal_prayers
  SET display_order = 999000 + (display_order % 1000)
  WHERE user_email = p_user_email 
    AND category = p_category_a;

  -- Step 2: Move category B to A's prefix
  UPDATE personal_prayers
  SET display_order = (v_prefix_a * 1000) + (display_order % 1000)
  WHERE user_email = p_user_email 
    AND category = p_category_b;

  -- Step 3: Move category A from temp to B's prefix
  UPDATE personal_prayers
  SET display_order = (v_prefix_b * 1000) + (display_order % 1000)
  WHERE user_email = p_user_email 
    AND category = p_category_a;

  RETURN QUERY SELECT TRUE, 
    'Successfully swapped ' || v_count_a || ' prayers in ' || p_category_a || 
    ' with ' || v_count_b || ' prayers in ' || p_category_b;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION swap_personal_prayer_categories(TEXT, TEXT, TEXT) TO authenticated;
