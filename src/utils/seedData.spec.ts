import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedTestPrayers } from './seedData';
import { supabase } from '../lib/supabase';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('seedData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('seedTestPrayers', () => {
    it('should successfully seed test prayers', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1 }, { id: 2 }, { id: 3 }],
          error: null
        })
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });

      (supabase.from as any) = mockFrom;

      await seedTestPrayers();

      expect(mockFrom).toHaveBeenCalledWith('prayers');
      expect(mockInsert).toHaveBeenCalled();
      
      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData).toHaveLength(3);
      expect(insertedData[0]).toHaveProperty('title', 'Healing for Sarah');
      expect(insertedData[1]).toHaveProperty('title', 'Job Search for Mark');
      expect(insertedData[2]).toHaveProperty('title', 'Safe Travel');
    });

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });

      (supabase.from as any) = mockFrom;

      await seedTestPrayers();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to seed prayers:',
        expect.objectContaining({ message: 'Database error' })
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle exceptions during seeding', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockInsert = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });

      (supabase.from as any) = mockFrom;

      const result = await seedTestPrayers();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to seed prayers:',
        expect.any(Error)
      );
      expect(result).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should include all required prayer fields', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null
        })
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });

      (supabase.from as any) = mockFrom;

      await seedTestPrayers();

      const insertedData = mockInsert.mock.calls[0][0];
      
      // Check first prayer has all required fields
      expect(insertedData[0]).toHaveProperty('title');
      expect(insertedData[0]).toHaveProperty('description');
      expect(insertedData[0]).toHaveProperty('status');
      expect(insertedData[0]).toHaveProperty('requester');
      expect(insertedData[0]).toHaveProperty('date_requested');
      
      // Check that status values are valid
      expect(['current', 'answered']).toContain(insertedData[0].status);
      expect(['current', 'answered']).toContain(insertedData[1].status);
      expect(['current', 'answered']).toContain(insertedData[2].status);
    });

    it('should include answered prayer with date_answered', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null
        })
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });

      (supabase.from as any) = mockFrom;

      await seedTestPrayers();

      const insertedData = mockInsert.mock.calls[0][0];
      const answeredPrayer = insertedData.find((p: any) => p.status === 'answered');
      
      expect(answeredPrayer).toBeDefined();
      expect(answeredPrayer).toHaveProperty('date_answered');
      expect(answeredPrayer.date_answered).toBeTruthy();
    });

    it('should create prayers with varying dates', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null
        })
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });

      (supabase.from as any) = mockFrom;

      await seedTestPrayers();

      const insertedData = mockInsert.mock.calls[0][0];
      
      // Check that dates are different (simulating different request times)
      const dates = insertedData.map((p: any) => new Date(p.date_requested).getTime());
      expect(dates[0]).not.toBe(dates[1]);
      expect(dates[1]).not.toBe(dates[2]);
      
      // Verify dates are in descending order (oldest last)
      expect(dates[0]).toBeGreaterThan(dates[1]);
      expect(dates[1]).toBeGreaterThan(dates[2]);
    });
  });
});
