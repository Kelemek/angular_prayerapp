import { describe, it, expect } from 'vitest';
import {
  getPersonalCategoryColor,
  hashPersonalCategoryColor,
  normalizePersonalCategoryHexColor,
  personalCategoryPillStyles,
  personalCategoryHeaderBandStyles,
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
    it('returns CSS variables for light and dark pill themes', () => {
      const styles = personalCategoryPillStyles('#2563EB');
      expect(styles['--category-pill-bg']).toContain('color-mix');
      expect(styles['--category-pill-bg']).not.toContain('transparent');
      expect(styles['--category-pill-border']).toContain('color-mix');
      expect(styles['--category-pill-text']).toBe('#2563EB');
      expect(styles['--category-pill-bg-dark']).toContain('#1f2937');
      expect(styles['--category-pill-border-dark']).toContain('color-mix');
      expect(styles['--category-pill-text-dark']).toBe(
        styles['--category-pill-border-dark']
      );
    });
  });

  describe('personalCategoryHeaderBandStyles', () => {
    it('returns subtle tint CSS variables matching pill themes', () => {
      const styles = personalCategoryHeaderBandStyles('#2563EB');
      expect(styles['--category-pill-bg']).toContain('color-mix');
      expect(styles['--category-pill-text']).toBe('#2563EB');
      expect(styles['--category-pill-bg-dark']).toContain('#1f2937');
      expect(styles['--category-pill-text-dark']).toContain('color-mix');
    });
  });
});
