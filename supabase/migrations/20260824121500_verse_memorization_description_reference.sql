-- Append verse_reference to description for legacy clients that only render prayers.description.

UPDATE public.prayers
SET description = TRIM(description) || ' ' || TRIM(verse_reference)
WHERE content_kind = 'verse_memorization'
  AND verse_reference IS NOT NULL
  AND TRIM(verse_reference) <> ''
  AND description IS NOT NULL
  AND TRIM(description) <> ''
  AND RIGHT(TRIM(description), LENGTH(TRIM(verse_reference))) <> TRIM(verse_reference);
