import { describe, it, expect } from 'vitest';
import {
  getPrayerStatusBorderClasses,
  getPrayerStatusHeaderTextClasses,
  getPrayerStatusLabel,
  getPrayerStatusPillClasses,
  PERSONAL_PRAYER_BORDER_CLASSES,
  META_HEADER_BORDER_BOTTOM_CLASSES,
} from './prayer-status-header';

describe('prayer-status-header', () => {
  it('getPrayerStatusHeaderTextClasses returns text color only for meta header', () => {
    expect(getPrayerStatusHeaderTextClasses('current')).toContain('text-[#0047AB]');
    expect(getPrayerStatusHeaderTextClasses('current')).not.toContain('border');

    expect(getPrayerStatusHeaderTextClasses('answered')).toContain('text-[#39704D]');

    expect(getPrayerStatusHeaderTextClasses('archived')).toContain('text-[#C9A961]');
  });

  it('getPrayerStatusLabel capitalizes', () => {
    expect(getPrayerStatusLabel('answered')).toBe('Answered');
  });

  it('PERSONAL_PRAYER_BORDER_CLASSES matches Personal tab accent', () => {
    expect(PERSONAL_PRAYER_BORDER_CLASSES).toContain('2F5F54');
  });

  it('META_HEADER_BORDER_BOTTOM_CLASSES matches Personal tab accent', () => {
    expect(META_HEADER_BORDER_BOTTOM_CLASSES).toContain('2F5F54');
  });

  it('getPrayerStatusBorderClasses varies by status', () => {
    expect(getPrayerStatusBorderClasses('current')).toContain('0047AB');
    expect(getPrayerStatusBorderClasses('answered')).toContain('39704D');
    expect(getPrayerStatusBorderClasses('archived')).toContain('C9A961');
  });

  it('getPrayerStatusPillClasses returns pill styles by status', () => {
    expect(getPrayerStatusPillClasses('current')).toContain('bg-blue-50');
    expect(getPrayerStatusPillClasses('current')).toContain('text-[#0047AB]');
    expect(getPrayerStatusPillClasses('current')).toContain('border-[#0047AB]');

    expect(getPrayerStatusPillClasses('answered')).toContain('bg-green-50');
    expect(getPrayerStatusPillClasses('answered')).toContain('text-[#39704D]');

    expect(getPrayerStatusPillClasses('archived')).toContain('bg-amber-50');
    expect(getPrayerStatusPillClasses('archived')).toContain('text-[#C9A961]');

    expect(getPrayerStatusPillClasses('unknown')).toContain('bg-gray-100');
    expect(getPrayerStatusPillClasses('unknown')).toContain('text-gray-800');
  });
});
