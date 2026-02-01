import { describe, it, expect } from 'vitest';
import { PrayerStatus, AllowanceLevel, PrayerType } from './prayer';
import type { 
  PrayerRequest, 
  PrayerUpdate, 
  DeletionRequest, 
  UpdateDeletionRequest,
  PrayerTypeRecord,
  PrayerPrompt,
  PrayerFilters
} from './prayer';

describe('Prayer Types (src/types)', () => {
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

    it('should have all three status values', () => {
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

    it('should have all three allowance levels', () => {
      expect(Object.keys(AllowanceLevel)).toHaveLength(3);
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

    it('should have all nine prayer types', () => {
      expect(Object.keys(PrayerType)).toHaveLength(9);
    });
  });

  describe('TypeScript interfaces', () => {
    it('should allow valid PrayerRequest object', () => {
      const prayer: PrayerRequest = {
        id: '123',
        title: 'Test Prayer',
        description: 'Test description',
        status: PrayerStatus.CURRENT,
        requester: 'John Doe',
        prayer_for: 'Jane Doe',
        email: 'test@example.com',
        date_requested: '2024-01-01',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      expect(prayer.id).toBe('123');
      expect(prayer.status).toBe(PrayerStatus.CURRENT);
    });

    it('should allow valid PrayerUpdate object', () => {
      const update: PrayerUpdate = {
        id: '456',
        prayer_id: '123',
        content: 'Update content',
        author: 'John Doe',
        author_email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      expect(update.prayer_id).toBe('123');
      expect(update.content).toBe('Update content');
    });

    it('should allow valid DeletionRequest object', () => {
      const request: DeletionRequest = {
        id: '789',
        prayer_id: '123',
        requested_by: 'John Doe',
        requested_email: 'test@example.com',
        approval_status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      expect(request.approval_status).toBe('pending');
    });

    it('should allow valid UpdateDeletionRequest object', () => {
      const request: UpdateDeletionRequest = {
        id: '789',
        update_id: '456',
        requested_by: 'John Doe',
        approval_status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      expect(request.update_id).toBe('456');
    });

    it('should allow valid PrayerTypeRecord object', () => {
      const typeRecord: PrayerTypeRecord = {
        id: '123',
        name: 'Healing',
        display_order: 1,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      expect(typeRecord.name).toBe('Healing');
      expect(typeRecord.is_active).toBe(true);
    });

    it('should allow valid PrayerPrompt object', () => {
      const prompt: PrayerPrompt = {
        id: '123',
        title: 'Test Prompt',
        type: PrayerType.HEALING,
        description: 'Test description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      expect(prompt.type).toBe(PrayerType.HEALING);
    });

    it('should allow valid PrayerFilters object', () => {
      const filters: PrayerFilters = {
        status: PrayerStatus.CURRENT,
        searchTerm: 'test',
        email: 'test@example.com',
      };
      
      expect(filters.status).toBe(PrayerStatus.CURRENT);
      expect(filters.searchTerm).toBe('test');
    });
  });
});
