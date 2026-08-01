import { describe, it, expect } from 'vitest';
import {
  getPersonalCategoryColor,
  hashPersonalCategoryColor,
  normalizePersonalCategoryHexColor,
  personalCategoryPillStyles,
  sanitizePersonalCategoryName,
} from './personalCategoryColor';

describe('personalCategoryColor', () => {
  describe('sanitizePersonalCategoryName', () => {
    it('returns null for empty values', () => {
      expect(sanitizePersonalCategoryName(null)).toBeNull();
      expect(sanitizePersonalCategoryName('   ')).toBeNull();
    });

    it('truncates names longer than 50 characters', () => {
      const long = 'a'.repeat(55);
      expect(sanitizePersonalCategoryName(long)?.length).toBe(50);
    });
  });

  describe('normalizePersonalCategoryHexColor', () => {
    it('normalizes hex colors', () => {
      expect(normalizePersonalCategoryHexColor('2563eb')).toBe('#2563EB');
      expect(normalizePersonalCategoryHexColor('#dc2626')).toBe('#DC2626');
    });

    it('rejects invalid values', () => {
      expect(normalizePersonalCategoryHexColor('red')).toBeNull();
      expect(normalizePersonalCategoryHexColor('#abc')).toBeNull();
    });
  });

  describe('getPersonalCategoryColor', () => {
    it('uses stored color when present', () => {
      expect(
        getPersonalCategoryColor('Health', { Health: '#111111' })
      ).toBe('#111111');
    });

    it('falls back to named or hash color', () => {
      expect(getPersonalCategoryColor('Health')).toBe('#DC2626');
      expect(getPersonalCategoryColor('Custom Category')).toMatch(/^hsl\(/);
    });
  });

  describe('hashPersonalCategoryColor', () => {
    it('is stable for the same category', () => {
      expect(hashPersonalCategoryColor('Work')).toBe(
        hashPersonalCategoryColor('Work')
      );
    });
  });

  describe('personalCategoryPillStyles', () => {
    it('returns color-mix styles for hex colors', () => {
      const styles = personalCategoryPillStyles('#2563EB');
      expect(styles.backgroundColor).toContain('color-mix');
      expect(styles.borderColor).toContain('color-mix');
      expect(styles.color).toBe('#2563EB');
    });
  });
});
