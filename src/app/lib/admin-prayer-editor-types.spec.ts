import { describe, it, expect } from 'vitest';
import {
  prayerEditorApprovalStatusColor,
  prayerEditorStatusColor,
} from './admin-prayer-editor-types';

describe('admin-prayer-editor-types', () => {
  describe('prayerEditorStatusColor', () => {
    it('returns colors for known and unknown statuses', () => {
      expect(prayerEditorStatusColor('current')).toContain('blue');
      expect(prayerEditorStatusColor('answered')).toContain('green');
      expect(prayerEditorStatusColor('archived')).toContain('gray');
      expect(prayerEditorStatusColor('unknown')).toContain('gray');
    });
  });

  describe('prayerEditorApprovalStatusColor', () => {
    it('returns colors for known and unknown approval statuses', () => {
      expect(prayerEditorApprovalStatusColor('approved')).toContain('green');
      expect(prayerEditorApprovalStatusColor('denied')).toContain('red');
      expect(prayerEditorApprovalStatusColor('pending')).toContain('yellow');
      expect(prayerEditorApprovalStatusColor('unknown')).toContain('gray');
    });
  });
});
