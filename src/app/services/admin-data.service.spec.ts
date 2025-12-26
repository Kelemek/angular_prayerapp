import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AdminDataService } from './admin-data.service';
import { SupabaseService } from './supabase.service';
import { PrayerService } from './prayer.service';
import { EmailNotificationService } from './email-notification.service';
import { firstValueFrom } from 'rxjs';

describe('AdminDataService', () => {
  let service: AdminDataService;
  let mockSupabaseService: any;
  let mockSupabaseClient: any;
  let mockPrayerService: any;
  let mockEmailNotificationService: any;

  const createMockQueryChain = (returnData: any = null, returnError: any = null) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: returnData, error: returnError })),
        then: vi.fn((callback) => callback({ data: returnData, error: returnError }))
      })),
      order: vi.fn(() => Promise.resolve({ data: returnData, error: returnError })),
      then: vi.fn((callback) => callback({ data: returnData, error: returnError }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: returnData, error: returnError }))
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
      const mockPendingPrayers = [{ id: '1', title: 'Test Prayer', approval_status: 'pending' }];
      const mockPendingUpdates = [{ id: '1', content: 'Test Update', prayers: { title: 'Prayer Title' } }];
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
        }
        return createMockQueryChain([], null);
      });

      await service.fetchAdminData();

      const data = await firstValueFrom(service.data$);
      expect(data.pendingPrayers).toEqual(mockPendingPrayers);
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

      expect(mockEmailNotificationService.sendApprovedPrayerNotification).toHaveBeenCalled();
      expect(mockEmailNotificationService.sendRequesterApprovalNotification).toHaveBeenCalled();
      expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    });

    it('should handle prayer not found error', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }));

      await expect(service.approvePrayer('1')).rejects.toThrow('Prayer not found');
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
          eq: vi.fn(() => Promise.resolve({ error: null }))
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
          eq: vi.fn(() => Promise.resolve({ error: null }))
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

      await service.approveUpdate('1');

      expect(mockEmailNotificationService.sendApprovedUpdateNotification).toHaveBeenCalled();
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
});
