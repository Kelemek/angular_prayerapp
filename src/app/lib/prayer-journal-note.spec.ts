import { describe, expect, it } from 'vitest';
import { sanitizeJournalNoteContent } from './prayer-journal-note';

const SQL_LIKE = "'); drop table x;--";

describe('sanitizeJournalNoteContent', () => {
  it('keeps SQL-like text as the exact stored string', () => {
    expect(sanitizeJournalNoteContent(SQL_LIKE)).toBe(SQL_LIKE);
  });

  it('strips raw script tags through the shared HTML sanitizer', () => {
    const sanitized = sanitizeJournalNoteContent('<script>alert(1)</script>');
    expect(sanitized.toLowerCase()).not.toContain('<script');
  });
});
