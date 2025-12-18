import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAdminData } from '../useAdminData';

// Mock supabase
vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock');
  const sup = mod.createSupabaseMock({ fromData: {} }) as any;
  sup.removeChannel = vi.fn();
  return { 
    supabase: sup, 
    handleSupabaseError: vi.fn((e: any) => e?.message || 'Unknown'),
    directQuery: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    directMutation: vi.fn().mockResolvedValue({ data: null, error: null }),
    getSupabaseConfig: vi.fn().mockReturnValue({ url: 'https://test.supabase.co', anonKey: 'test-key' })
  };
});

// Mock email notifications
vi.mock('../../lib/emailNotifications', () => ({
  sendApprovedPrayerNotification: vi.fn(() => Promise.resolve()),
  sendRequesterApprovalNotification: vi.fn(() => Promise.resolve()),
  sendDeniedPrayerNotification: vi.fn(() => Promise.resolve()),
  sendApprovedUpdateNotification: vi.fn(() => Promise.resolve()),
  sendDeniedUpdateNotification: vi.fn(() => Promise.resolve()),
}));

// Mock error logger
vi.mock('../../lib/errorLogger', () => ({
  logError: vi.fn()
}));

// Import mocked modules after vi.mock declarations
import { supabase } from '../../lib/supabase';
import * as email from '../../lib/emailNotifications';
import { logError } from '../../lib/errorLogger';

describe('useAdminData - Coverage Tests', () => {
  // Mock alert
  const originalAlert = window.alert;
  
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    
    const baseChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      then: vi.fn((cb: any) => cb({ data: [], error: null }))
    };
    
    vi.mocked(supabase.from).mockReturnValue(baseChain as any);
  });

  afterEach(() => {
    window.alert = originalAlert;
  });

  describe('approveUpdateDeletionRequest', () => {
    it('handles error during approval', async () => {
      const mockError = new Error('Database error');
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'update_deletion_requests') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.approveUpdateDeletionRequest('request-1');
      })).rejects.toThrow('Database error');

      expect(logError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Failed to approve update deletion request',
        error: mockError
      }));
      expect(window.alert).toHaveBeenCalledWith('Failed to approve update deletion request. Please try again.');
    });
  });

  describe('denyUpdateDeletionRequest', () => {
    it('handles error during denial', async () => {
      const mockError = new Error('Update failed');
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'update_deletion_requests') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            select: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.denyUpdateDeletionRequest('request-1', 'Not allowed');
      })).rejects.toThrow('Update failed');

      expect(logError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Failed to deny update deletion request',
        error: mockError
      }));
      expect(window.alert).toHaveBeenCalledWith('Failed to deny update deletion request. Please try again.');
    });
  });

  describe('approvePrayer', () => {
    it('handles error during prayer approval', async () => {
      const mockError = new Error('Approval failed');
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.approvePrayer('prayer-1');
      })).rejects.toThrow('Approval failed');

      expect(logError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Failed to approve prayer',
        error: mockError
      }));
      expect(window.alert).toHaveBeenCalledWith('Failed to approve prayer. Please try again.');
    });
  });

  describe('denyPrayer', () => {
    it('handles error during prayer denial', async () => {
      const mockError = new Error('Denial failed');
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.denyPrayer('prayer-1', 'Invalid content');
      })).rejects.toThrow('Denial failed');

      expect(logError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Failed to deny prayer',
        error: mockError
      }));
      expect(window.alert).toHaveBeenCalledWith('Failed to deny prayer. Please try again.');
    });
  });

  describe('approveUpdate', () => {
    it('handles error when updating prayer status fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field: string) => {
              if (field === 'id') {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'update-1',
                      prayer_id: 'prayer-1',
                      content: 'Test update',
                      mark_as_answered: true,
                      is_anonymous: false,
                      author: 'John',
                      author_email: 'john@test.com',
                      prayers: { title: 'Test Prayer', status: 'current' }
                    },
                    error: null
                  })
                };
              }
              return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
            }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        if (table === 'prayers') {
          const mockError = new Error('Prayer update failed');
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: null, error: mockError })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.approveUpdate('update-1');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update prayer status:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('denyUpdate', () => {
    it('sends denial notification when author email is present', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field: string) => {
              if (field === 'id') {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'update-1',
                      prayer_id: 'prayer-1',
                      content: 'Test update',
                      author: 'Jane',
                      author_email: 'jane@test.com',
                      is_anonymous: false,
                      prayers: { title: 'Test Prayer' }
                    },
                    error: null
                  })
                };
              }
              return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
            }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.denyUpdate('update-1', 'Inappropriate content');
      });

      expect(email.sendDeniedUpdateNotification).toHaveBeenCalledWith(expect.objectContaining({
        prayerTitle: 'Test Prayer',
        content: 'Test update',
        author: 'Jane',
        authorEmail: 'jane@test.com',
        denialReason: 'Inappropriate content'
      }));
    });
  });

  describe('approveDeletionRequest', () => {
    it('handles error during deletion request approval', async () => {
      const mockError = new Error('Deletion approval failed');
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'deletion_requests') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.approveDeletionRequest('deletion-1');
      })).rejects.toThrow('Deletion approval failed');

      expect(window.alert).toHaveBeenCalledWith('Failed to approve deletion request. Please try again.');
    });
  });

  describe('denyDeletionRequest', () => {
    it('handles error during deletion request denial', async () => {
      const mockError = new Error('Deletion denial failed');
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'deletion_requests') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            select: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.denyDeletionRequest('deletion-1', 'Not authorized');
      })).rejects.toThrow('Deletion denial failed');

      expect(window.alert).toHaveBeenCalledWith('Failed to deny deletion request. Please try again.');
    });
  });

  describe('approveStatusChangeRequest', () => {
    it('handles error during status change approval', async () => {
      const mockError = new Error('Status change failed');
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'status_change_requests') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.approveStatusChangeRequest('status-1');
      })).rejects.toThrow('Status change failed');
    });
  });

  describe('denyStatusChangeRequest', () => {
    it('denies status change request successfully', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'status_change_requests') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'status-1',
                prayer_id: 'prayer-1',
                requested_status: 'answered',
                prayers: { title: 'Test Prayer', status: 'current' }
              },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.denyStatusChangeRequest('status-1', 'Not appropriate');
      });

      expect(supabase.from).toHaveBeenCalledWith('status_change_requests');
    });

    it('handles error during status change denial', async () => {
      const mockError = new Error('Denial failed');
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'status_change_requests') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            update: vi.fn().mockReturnThis()
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.denyStatusChangeRequest('status-1', 'Reason');
      })).rejects.toThrow('Denial failed');
    });
  });

  describe('silentRefresh', () => {
    it('calls fetchAdminData with silent flag and logs message', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.silentRefresh();
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('[useAdminData] Starting silent refresh...');
      consoleLogSpy.mockRestore();
    });
  });

  describe('editUpdate', () => {
    it('edits a pending update successfully', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.editUpdate('update-1', { content: 'Updated content' });
      });

      expect(supabase.from).toHaveBeenCalledWith('prayer_updates');
    });
  });

  describe('editPrayer', () => {
    it('edits a pending prayer successfully', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.editPrayer('prayer-1', { title: 'Updated title' });
      });

      expect(supabase.from).toHaveBeenCalledWith('prayers');
    });

    it('handles error during prayer edit', async () => {
      const mockError = new Error('Edit failed');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: mockError })
              })
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb: any) => cb({ data: [], error: null }))
        } as any;
      });

      const { result } = renderHook(() => useAdminData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(act(async () => {
        await result.current.editPrayer('prayer-1', { title: 'Updated title' });
      })).rejects.toThrow('Edit failed');
      
      consoleErrorSpy.mockRestore();
    });
  });
});
