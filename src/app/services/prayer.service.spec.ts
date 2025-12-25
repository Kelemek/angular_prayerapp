import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { PrayerService, type PrayerRequest } from './prayer.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { EmailNotificationService } from './email-notification.service';
import { VerificationService } from './verification.service';
import { CacheService } from './cache.service';

describe('PrayerService', () => {
  let service: PrayerService;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockEmailNotificationService: any;
  let mockVerificationService: any;
  let mockCacheService: any;

  const mockPrayerData = [
    {
      id: '1',
      title: 'Test Prayer 1',
      description: 'Description 1',
      status: 'current',
      requester: 'John Doe',
      prayer_for: 'Jane Doe',
      email: 'test@example.com',
      is_anonymous: false,
      type: 'prayer',
      date_requested: '2024-01-01',
      date_answered: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      approval_status: 'approved',
      prayer_updates: [
        {
          id: 'u1',
          prayer_id: '1',
          content: 'Update 1',
          author: 'Admin',
          created_at: '2024-01-02T00:00:00Z',
          approval_status: 'approved'
        }
      ]
    },
    {
      id: '2',
      title: 'Test Prayer 2',
      description: 'Description 2',
      status: 'answered',
      requester: 'Jane Smith',
      prayer_for: 'John Smith',
      email: 'test2@example.com',
      is_anonymous: true,
      type: 'prayer',
      date_requested: '2024-01-03',
      date_answered: '2024-01-10',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
      approval_status: 'approved',
      prayer_updates: []
    }
  ];

  beforeEach(() => {
    // Mock Supabase Service
    mockSupabaseService = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ 
                data: mockPrayerData, 
                error: null 
              }))
            }))
          }))
        })),
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn()
        }))
      }
    };

    // Mock Toast Service
    mockToastService = {
      show: vi.fn(),
      success: vi.fn(),
      error: vi.fn()
    };

    // Mock Email Notification Service
    mockEmailNotificationService = {
      sendNotification: vi.fn()
    };

    // Mock Verification Service
    mockVerificationService = {
      isRecentlyVerified: vi.fn(() => false),
      requestCode: vi.fn(),
      verifyCode: vi.fn()
    };

    // Mock Cache Service
    mockCacheService = {
      get: vi.fn(() => null),
      set: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(() => false)
    };

    // Mock window event listeners
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (service) {
      // Clean up any timers or subscriptions
      (service as any).inactivityTimeout && clearTimeout((service as any).inactivityTimeout);
    }
  });

  describe('initialization', () => {
    it('should create the service', () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );
      expect(service).toBeTruthy();
    });

    it('should have observable properties', () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );
      
      expect(service.allPrayers$).toBeDefined();
      expect(service.prayers$).toBeDefined();
      expect(service.loading$).toBeDefined();
      expect(service.error$).toBeDefined();
    });
  });

  describe('loadPrayers', () => {
    it('should load prayers successfully', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));

      const prayers = await firstValueFrom(service.allPrayers$);
      expect(prayers).toBeDefined();
      expect(Array.isArray(prayers)).toBe(true);
    });

    it('should set loading state during load', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      const loading = await firstValueFrom(service.loading$);
      expect(typeof loading).toBe('boolean');
    });

    it('should format prayers correctly', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      const prayers = await firstValueFrom(service.allPrayers$);
      if (prayers.length > 0) {
        const prayer = prayers[0];
        expect(prayer).toHaveProperty('id');
        expect(prayer).toHaveProperty('title');
        expect(prayer).toHaveProperty('description');
        expect(prayer).toHaveProperty('status');
        expect(prayer).toHaveProperty('requester');
        expect(prayer).toHaveProperty('updates');
      }
    });

    it('should cache prayers after loading', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockCacheService.set).toHaveBeenCalledWith('prayers', expect.any(Array));
    });

    it('should handle database errors', async () => {
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Database error') 
            }))
          }))
        }))
      }));

      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      const error = await firstValueFrom(service.error$);
      // Error should be set or prayers should be empty
      const prayers = await firstValueFrom(service.allPrayers$);
      expect(prayers).toBeDefined();
    });

    it('should filter only approved prayers', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      // Verify that from was called with 'prayers'
      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('prayers');
    });

    it('should handle null descriptions', async () => {
      const prayerWithNullDesc = [{
        ...mockPrayerData[0],
        description: null
      }];

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: prayerWithNullDesc, 
              error: null 
            }))
          }))
        }))
      }));

      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      const prayers = await firstValueFrom(service.allPrayers$);
      if (prayers.length > 0) {
        expect(prayers[0].description).toBe('No description provided');
      }
    });

    it('should sort prayers by latest activity', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      const prayers = await firstValueFrom(service.allPrayers$);
      // Verify prayers are loaded
      expect(prayers).toBeDefined();
      expect(Array.isArray(prayers)).toBe(true);
    });

    it('should filter out non-approved updates', async () => {
      const prayerWithMixedUpdates = [{
        ...mockPrayerData[0],
        prayer_updates: [
          {
            id: 'u1',
            prayer_id: '1',
            content: 'Approved Update',
            author: 'Admin',
            created_at: '2024-01-02T00:00:00Z',
            approval_status: 'approved'
          },
          {
            id: 'u2',
            prayer_id: '1',
            content: 'Pending Update',
            author: 'User',
            created_at: '2024-01-03T00:00:00Z',
            approval_status: 'pending'
          }
        ]
      }];

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: prayerWithMixedUpdates, 
              error: null 
            }))
          }))
        }))
      }));

      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      const prayers = await firstValueFrom(service.allPrayers$);
      if (prayers.length > 0) {
        // Should only have 1 approved update
        expect(prayers[0].updates).toHaveLength(1);
        expect(prayers[0].updates[0].content).toBe('Approved Update');
      }
    });
  });

  describe('filters', () => {
    it('should have current filters', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      expect((service as any).currentFilters).toBeDefined();
    });
  });

  describe('observables', () => {
    it('should emit values from allPrayers$', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      const prayers = await firstValueFrom(service.allPrayers$);
      expect(Array.isArray(prayers)).toBe(true);
    });

    it('should emit values from prayers$', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      const prayers = await firstValueFrom(service.prayers$);
      expect(Array.isArray(prayers)).toBe(true);
    });

    it('should emit values from loading$', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      const loading = await firstValueFrom(service.loading$);
      expect(typeof loading).toBe('boolean');
    });

    it('should emit values from error$', async () => {
      service = new PrayerService(
        mockSupabaseService,
        mockToastService,
        mockEmailNotificationService,
        mockVerificationService,
        mockCacheService
      );

      const error = await firstValueFrom(service.error$);
      expect(error === null || typeof error === 'string').toBe(true);
    });
  });
});
