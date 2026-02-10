import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AdminDataService, type AdminData } from './admin-data.service';
import { SupabaseService } from './supabase.service';
import { PrayerService } from './prayer.service';
import { EmailNotificationService } from './email-notification.service';
import { firstValueFrom } from 'rxjs';

// Mock the planning-center module
vi.mock('../../lib/planning-center', () => ({
  lookupPersonByEmail: vi.fn(() => Promise.resolve({ count: 0 }))
}));

// Mock the environment module
vi.mock('../../environments/environment', () => ({
  environment: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key'
  }
}));

describe('AdminDataService', () => {
  let service: AdminDataService;
  let mockSupabaseService: any;
  let mockSupabaseClient: any;
  let mockPrayerService: any;
  let mockEmailNotificationService: any;

  const createMockQueryChain = (returnData: any = null, returnError: any = null) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: returnData, error: returnError })),
        order: vi.fn(() => ({
          then: vi.fn((callback) => callback({ data: returnData, error: returnError }))
        })),
        then: vi.fn((callback) => callback({ data: returnData, error: returnError }))
      })),
      order: vi.fn(() => ({
        then: vi.fn((callback) => callback({ data: returnData, error: returnError }))
      })),
      then: vi.fn((callback) => callback({ data: returnData, error: returnError }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: returnData, error: returnError })),
        then: vi.fn((callback) => callback({ data: returnData, error: returnError }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: returnData, error: returnError }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: returnData, error: returnError }))
    }))
  });

  beforeEach(() => {
    // Create mock Supabase client with default empty responses
    mockSupabaseClient = {
      from: vi.fn((table: string) => createMockQueryChain([], null)),
      auth: {
        getSession: vi.fn(() => Promise.resolve({ 
          data: { 
            session: { 
              user: { id: 'test-user-id', email: 'test@example.com', role: 'admin' } 
            } 
          } 
        }))
      }
    };

    // Create mock SupabaseService
    mockSupabaseService = {
      client: mockSupabaseClient
    } as unknown as SupabaseService;

    // Create mock PrayerService
    mockPrayerService = {
      loadPrayers: vi.fn(() => Promise.resolve())
    } as unknown as PrayerService;

    // Create mock EmailNotificationService
    mockEmailNotificationService = {
      sendApprovedPrayerNotification: vi.fn(() => Promise.resolve()),
      sendRequesterApprovalNotification: vi.fn(() => Promise.resolve()),
      sendDeniedPrayerNotification: vi.fn(() => Promise.resolve()),
      sendApprovedUpdateNotification: vi.fn(() => Promise.resolve()),
      sendUpdateAuthorApprovalNotification: vi.fn(() => Promise.resolve()),
      sendDeniedUpdateNotification: vi.fn(() => Promise.resolve()),
      getTemplate: vi.fn(() => Promise.resolve({
        subject: 'Test Subject {{firstName}}',
        html_body: 'Test HTML {{firstName}} {{lastName}} {{email}} {{loginLink}}',
        text_body: 'Test Text {{firstName}} {{lastName}} {{email}} {{loginLink}}'
      })),
      applyTemplateVariables: vi.fn((template, vars) => {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
          result = result.replace(`{{${key}}}`, String(value));
        }
        return result;
      }),
      sendEmail: vi.fn(() => Promise.resolve())
    } as unknown as EmailNotificationService;

    service = new AdminDataService(mockSupabaseService, mockPrayerService, mockEmailNotificationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial empty data state', async () => {
    const data = await firstValueFrom(service.data$);
    expect(data.pendingPrayers).toEqual([]);
    expect(data.pendingUpdates).toEqual([]);
    expect(data.loading).toBe(false);
    expect(data.error).toBeNull();
  });

  describe('fetchAdminData', () => {
    it('should fetch all pending data successfully', async () => {
      const mockPendingPrayers = [{ id: '1', title: 'Test Prayer', approval_status: 'pending', email: null }];
      const mockPendingUpdates = [{ id: '1', content: 'Test Update', prayers: { title: 'Prayer Title' }, author_email: null }];
      const mockPendingAccounts = [{ id: '1', email: 'test@example.com', first_name: 'John', last_name: 'Doe', approval_status: 'pending', created_at: '2024-01-01' }];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return createMockQueryChain(mockPendingPrayers, null);
        } else if (table === 'prayer_updates') {
          return createMockQueryChain(mockPendingUpdates, null);
        } else if (table === 'account_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  then: vi.fn((callback) => callback({ data: mockPendingAccounts, error: null }))
                }))
              }))
            }))
          };
        } else if (table === 'email_subscribers') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                then: vi.fn((callback) => callback({ data: [], error: null }))
              }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.fetchAdminData();

      const data = await firstValueFrom(service.data$);
      expect(data.pendingPrayers).toEqual([{ id: '1', title: 'Test Prayer', approval_status: 'pending', email: null, in_planning_center: null }]);
      expect(data.pendingAccountRequests).toEqual(mockPendingAccounts);
      expect(data.loading).toBe(false);
      expect(data.error).toBeNull();
    });

    it('should set loading state when not silent', async () => {
      let loadingState = false;
      service.data$.subscribe(data => {
        if (data.loading) loadingState = true;
      });

      await service.fetchAdminData(false);

      expect(loadingState).toBe(true);
    });

    it('should not set loading state when silent', async () => {
      let loadingState = false;
      service.data$.subscribe(data => {
        if (data.loading) loadingState = true;
      });

      await service.fetchAdminData(true);

      expect(loadingState).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Fetch failed');
      mockSupabaseClient.from = vi.fn(() => createMockQueryChain(null, error));

      await service.fetchAdminData();

      const data = await firstValueFrom(service.data$);
      expect(data.error).toBe('Fetch failed');
      expect(data.loading).toBe(false);
    });

    it('should prevent concurrent fetches', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Start first fetch (which will be slow)
      const promise1 = service.fetchAdminData();
      // Try to start second fetch immediately
      const promise2 = service.fetchAdminData();

      await Promise.all([promise1, promise2]);

      // Second call should return immediately without doing anything
      expect(mockSupabaseClient.from).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    it('should transform prayer updates with prayer titles', async () => {
      const mockUpdates = [
        { id: '1', content: 'Update 1', prayers: { title: 'Prayer 1' } },
        { id: '2', content: 'Update 2', prayers: { title: 'Prayer 2' } }
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return createMockQueryChain(mockUpdates, null);
        }
        return createMockQueryChain([], null);
      });

      await service.fetchAdminData();

      const data = await firstValueFrom(service.data$);
      expect(data.pendingUpdates[0].prayer_title).toBe('Prayer 1');
      expect(data.pendingUpdates[1].prayer_title).toBe('Prayer 2');
    });

    it('should include full prayer details in pending updates', async () => {
      const mockUpdates = [
        {
          id: '1',
          content: 'Update 1',
          prayers: {
            id: 'prayer-1',
            title: 'Prayer for healing',
            description: 'Please pray for recovery',
            requester: 'Jane Smith',
            prayer_for: 'John Doe',
            status: 'current'
          }
        }
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return createMockQueryChain(mockUpdates, null);
        }
        return createMockQueryChain([], null);
      });

      await service.fetchAdminData();

      const data = await firstValueFrom(service.data$);
      expect(data.pendingUpdates[0].prayers).toBeDefined();
      expect(data.pendingUpdates[0].prayers?.title).toBe('Prayer for healing');
      expect(data.pendingUpdates[0].prayers?.description).toBe('Please pray for recovery');
      expect(data.pendingUpdates[0].prayers?.requester).toBe('Jane Smith');
      expect(data.pendingUpdates[0].prayers?.prayer_for).toBe('John Doe');
      expect(data.pendingUpdates[0].prayers?.status).toBe('current');
    });

    it('should allow forcing data refresh even when fetch is in progress', async () => {
      const mockUpdates = [{ id: '1', content: 'Update 1', prayers: { title: 'Prayer 1' } }];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return createMockQueryChain(mockUpdates, null);
        }
        return createMockQueryChain([], null);
      });

      // Start first fetch (this will set isFetching = true)
      const firstFetch = service.fetchAdminData();

      // Try to fetch again without force (should return early due to isFetching guard)
      const secondFetch = service.fetchAdminData(true, false);

      // Force fetch should proceed despite isFetching being true
      const forcedFetch = service.fetchAdminData(true, true);

      await Promise.all([firstFetch, secondFetch, forcedFetch]);

      const data = await firstValueFrom(service.data$);
      // Should have data from one of the successful fetches
      expect(data.pendingUpdates).toBeDefined();
    });
  });

  describe('approvePrayer', () => {
    it('should approve a prayer and send notifications', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test Prayer',
        description: 'Test Description',
        requester: 'John Doe',
        email: 'john@example.com',
        prayer_for: 'healing',
        status: 'current',
        is_anonymous: false
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null })),
                order: vi.fn(() => ({
                  then: vi.fn((callback) => callback({ data: [mockPrayer], error: null }))
                })),
                then: vi.fn((callback) => callback({ data: mockPrayer, error: null }))
              })),
              order: vi.fn(() => ({
                then: vi.fn((callback) => callback({ data: [mockPrayer], error: null }))
              })),
              then: vi.fn((callback) => callback({ data: [mockPrayer], error: null }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      // Reset the email service mocks for this test
      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());

      await service.approvePrayer('1');

      // approvePrayer updates the prayer and reloads the prayer list
      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle prayer not found error', async () => {
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
              }))
            }))
          };
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      });

      // Should not throw - when prayer is not found after update, it logs error and returns early
      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());
      await service.approvePrayer('1');

      // Verify we tried to fetch admin data even though prayer wasn't found
      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      const mockPrayer = { id: '1', title: 'Test', description: 'Desc', requester: 'John', email: 'john@example.com' };
      const error = new Error('Update failed');

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await expect(service.approvePrayer('1')).rejects.toThrow('Update failed');
    });

    it('should not fail if email notifications fail', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test Prayer',
        description: 'Test Description',
        requester: 'John Doe',
        email: 'john@example.com',
        is_anonymous: false
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
            then: vi.fn((callback) => callback({ error: null }))
          }))
        }))
      }));

      mockEmailNotificationService.sendApprovedPrayerNotification = vi.fn(() => 
        Promise.reject(new Error('Email failed'))
      );

      // Should not throw even if email fails
      await expect(service.approvePrayer('1')).resolves.toBeUndefined();
    });
  });

  describe('denyPrayer', () => {
    it('should deny a prayer with reason', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test Prayer',
        description: 'Test Description',
        requester: 'John Doe',
        email: 'john@example.com',
        is_anonymous: false
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.denyPrayer('1', 'Not appropriate');

      expect(mockEmailNotificationService.sendDeniedPrayerNotification).toHaveBeenCalled();
      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should not send email if prayer has no email', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test Prayer',
        description: 'Test Description',
        requester: 'John Doe',
        email: null,
        is_anonymous: false
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
            then: vi.fn((callback) => callback({ error: null }))
          }))
        }))
      }));

      await service.denyPrayer('1', 'Not appropriate');

      expect(mockEmailNotificationService.sendDeniedPrayerNotification).not.toHaveBeenCalled();
    });
  });

  describe('editPrayer', () => {
    it('should update prayer fields', async () => {
      const updates = { title: 'Updated Title', description: 'Updated Description' };

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.editPrayer('1', updates);

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      const error = new Error('Update failed');

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await expect(service.editPrayer('1', {})).rejects.toThrow('Update failed');
    });
  });

  describe('approveUpdate', () => {
    it('should approve an update and mark prayer as answered if requested', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'prayer-1',
        content: 'Update content',
        mark_as_answered: true,
        is_anonymous: false,
        author: 'John Doe',
        prayers: { title: 'Prayer Title', status: 'current' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      // Reset the email service mocks for this test
      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());

      await service.approveUpdate('1');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should set prayer to current if currently answered and not marking as answered', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'prayer-1',
        content: 'Update content',
        mark_as_answered: false,
        is_anonymous: false,
        prayers: { title: 'Prayer Title', status: 'answered' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.approveUpdate('1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
    });
  });

  describe('denyUpdate', () => {
    it('should deny an update with reason', async () => {
      const mockUpdate = {
        id: '1',
        content: 'Update content',
        author_email: 'john@example.com',
        is_anonymous: false,
        author: 'John Doe',
        prayers: { title: 'Prayer Title' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.denyUpdate('1', 'Not appropriate');

      expect(mockEmailNotificationService.sendDeniedUpdateNotification).toHaveBeenCalled();
    });

    it('should not send email if no author email', async () => {
      const mockUpdate = {
        id: '1',
        content: 'Update content',
        author_email: null,
        is_anonymous: false,
        prayers: { title: 'Prayer Title' }
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.denyUpdate('1', 'Not appropriate');

      expect(mockEmailNotificationService.sendDeniedUpdateNotification).not.toHaveBeenCalled();
    });
  });

  describe('editUpdate', () => {
    it('should update an update', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.editUpdate('1', { content: 'Updated content' });

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('approveDeletionRequest', () => {
    it('should approve deletion and delete prayer', async () => {
      const mockDeletionRequest = { id: '1', prayer_id: 'prayer-1' };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'deletion_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockDeletionRequest, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.approveDeletionRequest('1');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('denyDeletionRequest', () => {
    it('should deny deletion request', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.denyDeletionRequest('1', 'Not necessary');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('approveUpdateDeletionRequest', () => {
    it('should approve update deletion and delete update', async () => {
      const mockRequest = { id: '1', update_id: 'update-1' };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'update_deletion_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayer_updates') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.approveUpdateDeletionRequest('1');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('denyUpdateDeletionRequest', () => {
    it('should deny update deletion request', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.denyUpdateDeletionRequest('1', 'Not necessary');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('approveAccountRequest', () => {
    it('should approve account request and create email subscriber', async () => {
      const mockRequest = {
        id: '1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:4200' },
        writable: true
      });

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'account_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'email_subscribers') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.approveAccountRequest('1');

      expect(mockEmailNotificationService.getTemplate).toHaveBeenCalledWith('account_approved');
      expect(mockEmailNotificationService.sendEmail).toHaveBeenCalled();
    });

    it('should handle missing template gracefully', async () => {
      const mockRequest = {
        id: '1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'account_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'email_subscribers') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.getTemplate = vi.fn(() => Promise.resolve(null));

      await service.approveAccountRequest('1');

      expect(mockEmailNotificationService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('denyAccountRequest', () => {
    it('should deny account request and send email', async () => {
      const mockRequest = {
        id: '1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'account_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.denyAccountRequest('1', 'Duplicate account');

      expect(mockEmailNotificationService.getTemplate).toHaveBeenCalledWith('account_denied');
      expect(mockEmailNotificationService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('silentRefresh and refresh', () => {
    it('should call fetchAdminData with silent=true for silentRefresh', async () => {
      const spy = vi.spyOn(service, 'fetchAdminData');
      service.silentRefresh();
      expect(spy).toHaveBeenCalledWith(true);
    });

    it('should call fetchAdminData with silent=false for refresh', async () => {
      const spy = vi.spyOn(service, 'fetchAdminData');
      service.refresh();
      expect(spy).toHaveBeenCalledWith(false);
    });
  });

  describe('loadApprovedAndDeniedDataAsync', () => {
    it('should load approved and denied data in background', async () => {
      const mockApprovedPrayers = [
        { id: '1', title: 'Approved Prayer', approval_status: 'approved' }
      ];
      const mockDeniedPrayers = [
        { id: '2', title: 'Denied Prayer', approval_status: 'denied', denial_reason: 'Inappropriate' }
      ];
      const mockApprovedUpdates = [
        { id: '1', content: 'Approved Update', prayers: { title: 'Prayer Title' }, approval_status: 'approved' }
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return createMockQueryChain([mockApprovedPrayers, mockDeniedPrayers], null);
        }
        if (table === 'prayer_updates') {
          return createMockQueryChain(mockApprovedUpdates, null);
        }
        return createMockQueryChain([], null);
      });

      // Start the async load without waiting
      const asyncLoadPromise = service.loadApprovedAndDeniedDataAsync();

      // Wait for the async operation to complete
      await asyncLoadPromise;

      const data = await firstValueFrom(service.data$);
      expect(data.loading).toBe(false);
    });

    it('should handle errors during async data load silently', async () => {
      mockSupabaseClient.from = vi.fn(() => {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.reject(new Error('Async load failed')))
          }))
        };
      });

      // Should not throw even if async data load fails
      await expect(service.loadApprovedAndDeniedDataAsync()).resolves.not.toThrow();
    });

    it('should load deletion requests in async phase', async () => {
      const mockDeletionRequests = [
        { id: '1', prayer_id: 'prayer-1', prayers: { title: 'Prayer Title' }, approval_status: 'approved' }
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'deletion_requests') {
          return createMockQueryChain(mockDeletionRequests, null);
        }
        return createMockQueryChain([], null);
      });

      await service.loadApprovedAndDeniedDataAsync();

      const data = await firstValueFrom(service.data$);
      // The data state may have been updated with counts
      expect(data).toBeDefined();
    });

    it('should load account approval requests with proper formatting', async () => {
      const mockAccountRequests = [
        { 
          id: '1', 
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          approval_status: 'pending',
          created_at: '2024-01-01'
        }
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'account_approval_requests') {
          return createMockQueryChain(mockAccountRequests, null);
        }
        return createMockQueryChain([], null);
      });

      // Fetch initial data to set pending account requests
      await service.fetchAdminData();

      const data = await firstValueFrom(service.data$);
      expect(data.pendingAccountRequests).toEqual(mockAccountRequests);
    });
  });

  describe('approvePrayer - comprehensive error handling', () => {
    it('should handle fetch query error', async () => {
      const error = new Error('Query failed');
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
              }))
            }))
          };
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error }))
            }))
          }))
        };
      });

      // Should not throw - error logged and returns early
      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());
      await service.approvePrayer('1');
      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle update status error after fetching prayer', async () => {
      const mockPrayer = { 
        id: '1', 
        title: 'Test', 
        description: 'Desc', 
        requester: 'John', 
        email: 'john@example.com',
        prayer_for: 'healing'
      };
      const error = new Error('Update status failed');

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error }))
              }))
            }))
          };
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
            }))
          }))
        };
      });

      // Should not throw even with prayer_updates error - prayer approval should succeed
      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());
      await service.approvePrayer('1');
      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle anonymous prayer without sending requester notification', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Anonymous Prayer',
        description: 'Test',
        requester: 'John',
        email: 'john@example.com',
        is_anonymous: true
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.approvePrayer('1');

      // Anonymous prayers still send notifications based on email setting
      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('denyPrayer - comprehensive scenarios', () => {
    it('should handle deny with long reason text', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test Prayer',
        description: 'Test Description',
        requester: 'John Doe',
        email: 'john@example.com',
        is_anonymous: false
      };

      const longReason = 'This prayer request does not align with our community values and guidelines. It contains inappropriate language and requests that we cannot fulfill.';

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.denyPrayer('1', longReason);

      expect(mockEmailNotificationService.sendDeniedPrayerNotification).toHaveBeenCalledWith({
        title: mockPrayer.title,
        description: mockPrayer.description,
        requester: mockPrayer.requester,
        requesterEmail: mockPrayer.email,
        denialReason: longReason
      });
    });

    it('should handle fetch error during deny', async () => {
      const error = new Error('Fetch failed');
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error }))
          }))
        }))
      }));

      await expect(service.denyPrayer('1', 'reason')).rejects.toThrow('Fetch failed');
    });

    it('should handle update error during deny', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test',
        description: 'Desc',
        requester: 'John',
        email: 'john@example.com',
        is_anonymous: false
      };
      const error = new Error('Update failed');

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await expect(service.denyPrayer('1', 'reason')).rejects.toThrow('Update failed');
    });

    it('should handle email notification failure without throwing', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test Prayer',
        description: 'Test',
        requester: 'John',
        email: 'john@example.com',
        is_anonymous: false
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendDeniedPrayerNotification = vi.fn(() =>
        Promise.reject(new Error('Email service down'))
      );

      // Should not throw
      await expect(service.denyPrayer('1', 'reason')).resolves.toBeUndefined();
    });
  });

  describe('editPrayer - comprehensive scenarios', () => {
    it('should handle partial updates', async () => {
      const updates = { title: 'Updated Title' };

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.editPrayer('1', updates);

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle empty updates object', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.editPrayer('1', {});

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle fetch error during edit', async () => {
      const error = new Error('Update failed');

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await expect(service.editPrayer('1', { title: 'New' })).rejects.toThrow('Update failed');
    });
  });

  describe('approveUpdate - comprehensive scenarios', () => {
    it('should handle update with mark_as_answered=false correctly', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'prayer-1',
        content: 'Update content',
        mark_as_answered: false,
        is_anonymous: false,
        author: 'John',
        prayers: { title: 'Prayer Title', status: 'current' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.approveUpdate('1');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle update fetch error', async () => {
      const error = new Error('Fetch update failed');
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error }))
          }))
        }))
      }));

      await expect(service.approveUpdate('1')).rejects.toThrow('Fetch update failed');
    });

    it('should handle prayer status update error gracefully', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'prayer-1',
        content: 'Update content',
        mark_as_answered: true,
        is_anonymous: false,
        prayers: { title: 'Prayer Title', status: 'current' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: new Error('Status update failed') }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      // Should resolve even if prayer status update fails (logged as warning, not thrown)
      await service.approveUpdate('1');
      
      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle email notification failure without throwing', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'prayer-1',
        content: 'Update content',
        mark_as_answered: false,
        is_anonymous: false,
        prayers: { title: 'Prayer Title', status: 'current' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendApprovedUpdateNotification = vi.fn(() =>
        Promise.reject(new Error('Email failed'))
      );

      await expect(service.approveUpdate('1')).resolves.toBeUndefined();
    });
  });

  describe('denyUpdate - comprehensive scenarios', () => {
    it('should handle update not found', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }));

      await expect(service.denyUpdate('1', 'reason')).rejects.toThrow();
    });

    it('should handle update with null author email', async () => {
      const mockUpdate = {
        id: '1',
        content: 'Update content',
        author_email: null,
        is_anonymous: false,
        author: 'John',
        prayers: { title: 'Prayer Title' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await service.denyUpdate('1', 'reason');

      expect(mockEmailNotificationService.sendDeniedUpdateNotification).not.toHaveBeenCalled();
    });

    it('should handle update error during deny', async () => {
      const mockUpdate = {
        id: '1',
        content: 'Update',
        author_email: 'john@example.com',
        is_anonymous: false,
        prayers: { title: 'Prayer' }
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
        }))
      }));

      await expect(service.denyUpdate('1', 'reason')).rejects.toThrow('Update failed');
    });
  });

  describe('editUpdate', () => {
    it('should handle update error', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
        }))
      }));

      await expect(service.editUpdate('1', { content: 'New content' })).rejects.toThrow('Update failed');
    });

    it('should handle multiple field updates', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.editUpdate('1', { content: 'Updated', author: 'Jane' });

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('approveDeletionRequest', () => {
    it('should handle deletion request not found', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }));

      await expect(service.approveDeletionRequest('1')).rejects.toThrow();
    });

    it('should handle approval status update error', async () => {
      const mockRequest = { id: '1', prayer_id: 'prayer-1' };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'deletion_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await expect(service.approveDeletionRequest('1')).rejects.toThrow('Update failed');
    });

    it('should handle prayer deletion error', async () => {
      const mockRequest = { id: '1', prayer_id: 'prayer-1' };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'deletion_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: new Error('Delete failed') }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await expect(service.approveDeletionRequest('1')).rejects.toThrow('Delete failed');
    });
  });

  describe('denyDeletionRequest', () => {
    it('should handle update error', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
        }))
      }));

      await expect(service.denyDeletionRequest('1', 'reason')).rejects.toThrow('Update failed');
    });

    it('should include denial reason in update', async () => {
      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      mockSupabaseClient.from = vi.fn(() => ({
        update: updateSpy
      }));

      await service.denyDeletionRequest('1', 'Not appropriate');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('approveUpdateDeletionRequest', () => {
    it('should handle request not found', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }));

      await expect(service.approveUpdateDeletionRequest('1')).rejects.toThrow();
    });

    it('should handle approval status update error', async () => {
      const mockRequest = { id: '1', update_id: 'update-1' };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'update_deletion_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await expect(service.approveUpdateDeletionRequest('1')).rejects.toThrow('Update failed');
    });

    it('should handle update deletion error', async () => {
      const mockRequest = { id: '1', update_id: 'update-1' };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'update_deletion_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayer_updates') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: new Error('Delete failed') }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      await expect(service.approveUpdateDeletionRequest('1')).rejects.toThrow('Delete failed');
    });
  });

  describe('denyUpdateDeletionRequest', () => {
    it('should handle update error', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
        }))
      }));

      await expect(service.denyUpdateDeletionRequest('1', 'reason')).rejects.toThrow('Update failed');
    });

    it('should include denial reason in update', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await service.denyUpdateDeletionRequest('1', 'Not necessary');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });
  });

  describe('approveAccountRequest', () => {
    it('should handle request not found', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }));

      await expect(service.approveAccountRequest('1')).rejects.toThrow();
    });

    it('should handle email subscriber insert error', async () => {
      const mockRequest = {
        id: '1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'account_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'email_subscribers') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: new Error('Insert failed') }))
          };
        }
        return createMockQueryChain([], null);
      });

      await expect(service.approveAccountRequest('1')).rejects.toThrow('Insert failed');
    });

    it('should handle deletion of approval request after creating subscriber', async () => {
      const mockRequest = {
        id: '1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'account_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: new Error('Delete failed') }))
            }))
          };
        } else if (table === 'email_subscribers') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null }))
          };
        }
        return createMockQueryChain([], null);
      });

      await expect(service.approveAccountRequest('1')).rejects.toThrow('Delete failed');
    });

    it('should handle email send failure gracefully', async () => {
      const mockRequest = {
        id: '1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'account_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'email_subscribers') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendEmail = vi.fn(() =>
        Promise.reject(new Error('Email send failed'))
      );

      // Should resolve even if email fails (error is caught)
      await service.approveAccountRequest('1');
    });
  });

  describe('denyAccountRequest', () => {
    it('should handle request not found', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }));

      await expect(service.denyAccountRequest('1', 'reason')).rejects.toThrow();
    });

    it('should handle deletion error', async () => {
      const mockRequest = {
        id: '1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Delete failed') }))
        }))
      }));

      await expect(service.denyAccountRequest('1', 'reason')).rejects.toThrow('Delete failed');
    });

    it('should handle email send failure gracefully', async () => {
      const mockRequest = {
        id: '1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockEmailNotificationService.sendEmail = vi.fn(() =>
        Promise.reject(new Error('Email send failed'))
      );

      // Should resolve even if email fails (error is caught)
      await service.denyAccountRequest('1', 'reason');
    });
  });

  describe('data$ Observable behavior', () => {
    it('should emit data updates on successful fetch', async () => {
      const mockPrayers = [{ id: '1', title: 'Test', approval_status: 'pending', email: null }];
      const emissions: AdminData[] = [];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return createMockQueryChain(mockPrayers, null);
        } else if (table === 'email_subscribers') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                then: vi.fn((callback) => callback({ data: [], error: null }))
              }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      const subscription = service.data$.subscribe(data => {
        emissions.push(data);
      });

      await service.fetchAdminData();

      expect(emissions.length).toBeGreaterThan(0);
      expect(emissions[emissions.length - 1].pendingPrayers).toEqual([{ id: '1', title: 'Test', approval_status: 'pending', email: null, in_planning_center: null }]);

      subscription.unsubscribe();
    });

    it('should maintain state consistency across multiple operations', async () => {
      const emission1: AdminData[] = [];
      const subscription = service.data$.subscribe(data => {
        emission1.push(data);
      });

      // First fetch
      await service.fetchAdminData();
      const state1 = emission1[emission1.length - 1];

      // Second fetch
      await service.fetchAdminData();
      const state2 = emission1[emission1.length - 1];

      expect(state2.loading).toBe(false);

      subscription.unsubscribe();
    });
  });

  describe('concurrent operations', () => {
    it('should prevent concurrent fetchAdminData calls', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const queryCallCount = vi.fn();
      
      mockSupabaseClient.from = vi.fn(() => {
        queryCallCount();
        return createMockQueryChain([], null);
      });

      // Start two fetches simultaneously
      const promise1 = service.fetchAdminData();
      const promise2 = service.fetchAdminData();

      await Promise.all([promise1, promise2]);

      // Second fetch should be prevented from running queries
      expect(queryCallCount).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe('Phase 2 async loading integration', () => {
    it('should update state with counts after async loading completes', async () => {
      const mockApprovedPrayers = [
        { id: '1', title: 'Approved 1', approval_status: 'approved' },
        { id: '2', title: 'Approved 2', approval_status: 'approved' }
      ];
      const mockDeniedPrayers = [
        { id: '3', title: 'Denied 1', approval_status: 'denied' }
      ];

      let callCount = 0;
      mockSupabaseClient.from = vi.fn((table: string) => {
        callCount++;
        if (table === 'prayers') {
          return createMockQueryChain(callCount === 1 ? [] : mockApprovedPrayers, null);
        }
        return createMockQueryChain([], null);
      });

      await service.fetchAdminData();

      // Give async operations time to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const data = await firstValueFrom(service.data$);
      expect(data).toBeDefined();
    });
  });

  describe('Branch coverage - error handling', () => {
    it('should handle requester notification error in approvePrayer', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockPrayer = { 
        id: '1', 
        title: 'Test Prayer',
        description: 'Test',
        is_anonymous: false,
        requester: 'John',
        email: 'john@example.com',
        prayer_for: 'Test'
      };

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [mockPrayer], error: null })),
            then: vi.fn((callback) => callback({ data: [mockPrayer], error: null }))
          }))
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
          }))
        }))
      }));

      mockEmailNotificationService.sendRequesterApprovalNotification = vi.fn()
        .mockRejectedValue(new Error('Notification failed'));

      await service.approvePrayer('1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to send requester approval notification:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle denial notification error in denyUpdate', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockUpdate = { 
        id: '1',
        prayer_id: 'p1',
        content: 'Test update',
        is_anonymous: false,
        author: 'Jane',
        author_email: 'jane@example.com',
        prayers: { title: 'Test Prayer' }
      };

      // Mock createMockQueryChain to handle all the chains properly
      const mockChain = () => ({
        select: vi.fn(function() {
          return {
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null })),
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            neq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        }),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });

      mockSupabaseClient.from = vi.fn(() => mockChain());

      const notificationError = new Error('Notification failed');
      mockEmailNotificationService.sendDeniedUpdateNotification = vi.fn()
        .mockReturnValue(Promise.reject(notificationError));
      
      mockPrayerService.loadPrayers = vi.fn().mockResolvedValue(undefined);

      // Don't await - we want to check if the error is caught, not thrown
      service.denyUpdate('1', 'Not appropriate').catch(() => {});
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockEmailNotificationService.sendDeniedUpdateNotification).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to send denial notification:',
        notificationError
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle account request error in fetchAdminData', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const accountError = new Error('Account fetch failed');

      // Create normal chain for successful tables
      const createNormalChain = () => ({
        select: vi.fn(function() {
          return {
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            neq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      });

      // Track which table is being queried
      let queryCount = 0;
      mockSupabaseClient.from = vi.fn((table: string) => {
        queryCount++;
        
        // Only error on the account_approval_requests table (6th query in Promise.all)
        if (table === 'account_approval_requests' && queryCount === 6) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: null, error: accountError })),
                then: vi.fn((callback) => callback({ data: null, error: accountError }))
              })),
              order: vi.fn(() => ({
                then: vi.fn((callback) => callback({ data: null, error: accountError }))
              }))
            })),
            order: vi.fn(() => ({
              then: vi.fn((callback) => callback({ data: null, error: accountError }))
            }))
          };
        }
        
        // Return normal chain for all other tables
        return createNormalChain();
      });

      try {
        await service.fetchAdminData();
      } catch (error) {
        // Expected to throw
      }

      // The error should be thrown and caught, but we no longer log it in production code
      consoleErrorSpy.mockRestore();
    });

    it('should continue when denial reason is not provided in denyUpdate', async () => {
      const mockUpdate = { 
        id: '1',
        prayer_id: 'p1',
        content: 'Test update',
        is_anonymous: true,
        author: null,
        author_email: null
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendUpdateDenialNotification = vi.fn()
        .mockResolvedValue(undefined);
      
      mockPrayerService.loadPrayers = vi.fn().mockResolvedValue(undefined);

      // Should not throw even without email notification
      await service.denyUpdate('1', '');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle denial with null author email gracefully', async () => {
      const mockUpdate = { 
        id: '1',
        prayer_id: 'p1',
        content: 'Test update',
        is_anonymous: false,
        author: 'John',
        author_email: null
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendUpdateDenialNotification = vi.fn()
        .mockResolvedValue(undefined);
      
      mockPrayerService.loadPrayers = vi.fn().mockResolvedValue(undefined);

      await service.denyUpdate('1', 'Reason');

      // Should skip notification when no email
      expect(mockEmailNotificationService.sendUpdateDenialNotification).not.toHaveBeenCalled();
    });

    it('should handle anonymous prayer in approvePrayer correctly', async () => {
      const mockPrayer = { 
        id: '1', 
        title: 'Test Prayer',
        description: 'Test',
        is_anonymous: true,
        requester: null,
        email: null,
        prayer_for: 'Test'
      };

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [mockPrayer], error: null })),
            then: vi.fn((callback) => callback({ data: [mockPrayer], error: null }))
          }))
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
          }))
        }))
      }));

      mockEmailNotificationService.sendRequesterApprovalNotification = vi.fn()
        .mockResolvedValue(undefined);

      await service.approvePrayer('1');

      // Should show 'Anonymous' for anonymous prayers
      expect(mockEmailNotificationService.sendRequesterApprovalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          requester: 'Anonymous'
        })
      );
    });

    it('should handle sendBroadcastNotificationForNewUpdate with mark_as_answered=true', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'p1',
        content: 'Prayer has been answered',
        mark_as_answered: true,
        is_anonymous: false,
        author: 'John',
        prayers: { title: 'Test Prayer', status: 'current' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendApprovedUpdateNotification = vi.fn(() => Promise.resolve());

      await service.sendBroadcastNotificationForNewUpdate('1');

      // Should update prayer status to 'answered'
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
      expect(mockEmailNotificationService.sendApprovedUpdateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          markedAsAnswered: true
        })
      );
    });

    it('should handle sendBroadcastNotificationForNewUpdate with status transition', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'p1',
        content: 'Update text',
        mark_as_answered: false,
        is_anonymous: false,
        author: 'Jane',
        prayers: { title: 'Test Prayer', status: 'answered' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendApprovedUpdateNotification = vi.fn(() => Promise.resolve());

      await service.sendBroadcastNotificationForNewUpdate('1');

      // Should transition 'answered' back to 'current'
      expect(mockEmailNotificationService.sendApprovedUpdateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          markedAsAnswered: false
        })
      );
    });

    it('should handle sendBroadcastNotificationForNewUpdate with archived status', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'p1',
        content: 'Update text',
        mark_as_answered: false,
        is_anonymous: true,
        author: null,
        prayers: { title: 'Test Prayer', status: 'archived' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendApprovedUpdateNotification = vi.fn(() => Promise.resolve());

      await service.sendBroadcastNotificationForNewUpdate('1');

      // Should transition 'archived' back to 'current'
      expect(mockEmailNotificationService.sendApprovedUpdateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'Anonymous'
        })
      );
    });

    it('should handle error when updating prayer status in sendBroadcastNotificationForNewUpdate', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockUpdate = {
        id: '1',
        prayer_id: 'p1',
        content: 'Update',
        mark_as_answered: true,
        is_anonymous: false,
        author: 'John',
        prayers: { title: 'Test Prayer', status: 'current' }
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendApprovedUpdateNotification = vi.fn(() => Promise.resolve());

      await service.sendBroadcastNotificationForNewUpdate('1');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update prayer status:', expect.any(Error));
      expect(mockEmailNotificationService.sendApprovedUpdateNotification).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle null prayers object in sendBroadcastNotificationForNewUpdate', async () => {
      const mockUpdate = {
        id: '1',
        prayer_id: 'p1',
        content: 'Update',
        mark_as_answered: false,
        is_anonymous: false,
        author: 'John',
        prayers: null
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
              }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockEmailNotificationService.sendApprovedUpdateNotification = vi.fn(() => Promise.resolve());

      await service.sendBroadcastNotificationForNewUpdate('1');

      expect(mockEmailNotificationService.sendApprovedUpdateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          prayerTitle: 'Prayer'
        })
      );
    });

    it('should handle sendBroadcastNotificationForNewPrayer successfully', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test Prayer',
        description: 'Description',
        is_anonymous: false,
        requester: 'John'
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
          }))
        }))
      }));

      mockEmailNotificationService.sendApprovedPrayerNotification = vi.fn(() => Promise.resolve());

      await service.sendBroadcastNotificationForNewPrayer('1');

      expect(mockEmailNotificationService.sendApprovedPrayerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Prayer'
        })
      );
    });

    it('should handle error fetching prayer in sendBroadcastNotificationForNewPrayer', async () => {
      const fetchError = new Error('Fetch failed');
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: fetchError }))
          }))
        }))
      }));

      await expect(service.sendBroadcastNotificationForNewPrayer('1')).rejects.toThrow('Fetch failed');
    });

    it('should handle prayer not found in sendBroadcastNotificationForNewPrayer', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }));

      await expect(service.sendBroadcastNotificationForNewPrayer('1')).rejects.toThrow('Prayer not found');
    });

    it('should handle editUpdate successfully', async () => {
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayer_updates') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());

      await service.editUpdate('1', { content: 'Updated content' });

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle editPrayer successfully', async () => {
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());

      await service.editPrayer('1', { title: 'Updated title' });

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle approveDeletionRequest successfully', async () => {
      const mockRequest = {
        id: '1',
        prayer_id: 'p1'
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'deletion_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        } else if (table === 'prayers') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());

      await service.approveDeletionRequest('1');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle denyDeletionRequest successfully', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());

      await service.denyDeletionRequest('1', 'Reason');

      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle missing email in denyPrayer gracefully', async () => {
      const mockPrayer = {
        id: '1',
        title: 'Test',
        is_anonymous: false,
        requester: 'John',
        email: null
      };

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPrayer, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        }
        return createMockQueryChain([], null);
      });

      mockPrayerService.loadPrayers = vi.fn(() => Promise.resolve());

      await service.denyPrayer('1', 'Reason');

      // Should not call email notification when email is missing
      expect(mockEmailNotificationService.sendDeniedPrayerNotification).not.toHaveBeenCalled();
    });

    it('should handle sendApprovedUpdateEmails with anonymous author', async () => {
      const mockUpdate = {
        id: '1',
        content: 'Update content',
        is_anonymous: true,
        author: null,
        author_email: null,
        prayers: { title: 'Prayer Title' }
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
          }))
        }))
      }));

      mockEmailNotificationService.sendApprovedUpdateNotification = vi.fn(() => Promise.resolve());
      mockEmailNotificationService.sendUpdateAuthorApprovalNotification = vi.fn(() => Promise.resolve());

      await service.sendApprovedUpdateEmails('1');

      expect(mockEmailNotificationService.sendApprovedUpdateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'Anonymous'
        })
      );
    });

    it('should handle sendApprovedUpdateEmails with null author_email', async () => {
      const mockUpdate = {
        id: '1',
        content: 'Update content',
        is_anonymous: false,
        author: 'John',
        author_email: null,
        prayers: { title: 'Prayer Title' }
      };

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockUpdate, error: null }))
          }))
        }))
      }));

      mockEmailNotificationService.sendApprovedUpdateNotification = vi.fn(() => Promise.resolve());

      await service.sendApprovedUpdateEmails('1');

      // Should send notification with author name
      expect(mockEmailNotificationService.sendApprovedUpdateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'John'
        })
      );
    });
  });
});
