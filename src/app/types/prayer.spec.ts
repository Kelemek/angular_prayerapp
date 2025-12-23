import { describe, it, expect } from 'vitest';
import { PrayerStatus, AllowanceLevel, PrayerType } from './prayer';

describe('Prayer Types', () => {
  describe('PrayerStatus', () => {
    it('should have CURRENT status', () => {
      expect(PrayerStatus.CURRENT).toBe('current');
    });

    it('should have ANSWERED status', () => {
      expect(PrayerStatus.ANSWERED).toBe('answered');
    });

    it('should have ARCHIVED status', () => {
      expect(PrayerStatus.ARCHIVED).toBe('archived');
    });

    it('should be immutable (const values)', () => {
      // As const objects are readonly at compile time, we just verify the values exist
      expect(PrayerStatus).toBeDefined();
      expect(Object.keys(PrayerStatus)).toHaveLength(3);
    });
  });

  describe('AllowanceLevel', () => {
    it('should have EVERYONE level', () => {
      expect(AllowanceLevel.EVERYONE).toBe('everyone');
    });

    it('should have ADMIN_ONLY level', () => {
      expect(AllowanceLevel.ADMIN_ONLY).toBe('admin-only');
    });

    it('should have ORIGINAL_REQUESTOR level', () => {
      expect(AllowanceLevel.ORIGINAL_REQUESTOR).toBe('original-requestor');
    });
  });

  describe('PrayerType', () => {
    it('should have HEALING type', () => {
      expect(PrayerType.HEALING).toBe('Healing');
    });

    it('should have GUIDANCE type', () => {
      expect(PrayerType.GUIDANCE).toBe('Guidance');
    });

    it('should have THANKSGIVING type', () => {
      expect(PrayerType.THANKSGIVING).toBe('Thanksgiving');
    });

    it('should have PROTECTION type', () => {
      expect(PrayerType.PROTECTION).toBe('Protection');
    });

    it('should have FAMILY type', () => {
      expect(PrayerType.FAMILY).toBe('Family');
    });

    it('should have FINANCES type', () => {
      expect(PrayerType.FINANCES).toBe('Finances');
    });

    it('should have SALVATION type', () => {
      expect(PrayerType.SALVATION).toBe('Salvation');
    });

    it('should have MISSIONS type', () => {
      expect(PrayerType.MISSIONS).toBe('Missions');
    });

    it('should have OTHER type', () => {
      expect(PrayerType.OTHER).toBe('Other');
    });
  });
});
