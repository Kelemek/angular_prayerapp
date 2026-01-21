-- Migration: Update Members category prayers to 1000+ display_order range
-- Members is the second category (after Family) so uses 1000-1999 range
-- This migration updates all existing Members prayers to the new range
-- Also reverses the order (highest values become lowest and vice versa)

UPDATE "public"."personal_prayers"
SET display_order = 2038 - display_order,
    updated_at = NOW()
WHERE category = 'Members'
AND user_email = 'markdlarson@me.com'
AND display_order BETWEEN 1003 AND 1035;
