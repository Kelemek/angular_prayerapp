import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrintService, Prayer, TimeRange } from './print.service';
import { SupabaseService } from './supabase.service';

describe('PrintService', () => {
  let service: PrintService;
  let mockSupabaseService: any;
  let mockSupabaseClient: any;

  const mockPrayers: Prayer[] = [
    {
      id: '1',
      title: 'Test Prayer 1',
      prayer_for: 'John Doe',
      description: 'Test description 1',
      requester: 'Jane Smith',
      status: 'current',
      created_at: new Date().toISOString(),
      prayer_updates: [
        {
          id: 'u1',
          content: 'Update content 1',
          author: 'Author 1',
          created_at: new Date().toISOString(),
        }
      ]
    },
    {
      id: '2',
      title: 'Test Prayer 2',
      prayer_for: 'Jane Doe',
      description: 'Test description 2',
      requester: 'John Smith',
      status: 'answered',
      created_at: new Date().toISOString(),
      date_answered: new Date().toISOString(),
      prayer_updates: []
    }
  ];

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null })
      }
    };

    mockSupabaseService = {
      client: mockSupabaseClient
    } as any;

    // Mock document.createElement for escapeHtml
    const mockDiv = {
      textContent: '',
      innerHTML: ''
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'div') {
        return {
          set textContent(value: string) {
            // Simple HTML escape implementation
            mockDiv.innerHTML = value
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          },
          get innerHTML() {
            return mockDiv.innerHTML;
          }
        } as any;
      }
      return {
        href: '',
        download: '',
        click: vi.fn()
      } as any;
    });

    service = new PrintService(mockSupabaseService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('downloadPrintablePrayerList', () => {
    beforeEach(() => {
      // Mock window.open, alert, and DOM methods
      global.window.open = vi.fn();
      global.alert = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      global.document.createElement = vi.fn(() => mockLink as any);
      global.document.body.appendChild = vi.fn();
      global.document.body.removeChild = vi.fn();
    });

    it('should fetch prayers with correct date range for week', async () => {
      await service.downloadPrintablePrayerList('week', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
      expect(mockSupabaseClient.gte).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('approval_status', 'approved');
      expect(mockSupabaseClient.neq).toHaveBeenCalledWith('status', 'closed');
    });

    it('should fetch prayers with correct date range for twoweeks', async () => {
      await service.downloadPrintablePrayerList('twoweeks', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });

    it('should fetch prayers with correct date range for month', async () => {
      await service.downloadPrintablePrayerList('month', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });

    it('should fetch prayers with correct date range for year', async () => {
      await service.downloadPrintablePrayerList('year', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });

    it('should fetch prayers with correct date range for all', async () => {
      await service.downloadPrintablePrayerList('all', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });

    it('should handle error when fetching prayers', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.order.mockResolvedValue({ 
        data: null, 
        error: new Error('Database error') 
      });

      await service.downloadPrintablePrayerList('month', null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching prayers:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith('Failed to fetch prayers. Please try again.');
    });

    it('should close newWindow when error occurs', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockWindow = { close: vi.fn() };
      mockSupabaseClient.order.mockResolvedValue({ 
        data: null, 
        error: new Error('Database error') 
      });

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should alert when no prayers found', async () => {
      mockSupabaseClient.order.mockResolvedValue({ data: [], error: null });

      await service.downloadPrintablePrayerList('week', null);

      expect(global.alert).toHaveBeenCalledWith('No prayers found in the last week.');
    });

    it('should alert with correct time range text for twoweeks', async () => {
      mockSupabaseClient.order.mockResolvedValue({ data: [], error: null });

      await service.downloadPrintablePrayerList('twoweeks', null);

      expect(global.alert).toHaveBeenCalledWith('No prayers found in the last 2 weeks.');
    });

    it('should alert with correct time range text for all', async () => {
      mockSupabaseClient.order.mockResolvedValue({ data: [], error: null });

      await service.downloadPrintablePrayerList('all', null);

      expect(global.alert).toHaveBeenCalledWith('No prayers found in the last database.');
    });

    it('should open new window with HTML content when window.open succeeds', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePrayerList('month', null);

      expect(mockWindow.document.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should use provided newWindow when available', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      expect(mockWindow.document.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
    });

    it('should download file when window.open is blocked', async () => {
      (global.window.open as any).mockReturnValue(null);
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      (global.document.createElement as any).mockReturnValue(mockLink);

      await service.downloadPrintablePrayerList('month', null);

      expect(mockLink.click).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Prayer list downloaded. Please open the file to view and print.');
    });

    it('should handle catch block error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await service.downloadPrintablePrayerList('month', null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating prayer list:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith('Failed to generate prayer list. Please try again.');
    });
  });

  describe('downloadPrintablePromptList', () => {
    const mockPrompts = [
      { id: '1', title: 'Prompt 1', type: 'Praise', created_at: new Date().toISOString() },
      { id: '2', title: 'Prompt 2', type: 'Confession', created_at: new Date().toISOString() }
    ];

    const mockTypes = [
      { name: 'Praise', display_order: 1 },
      { name: 'Confession', display_order: 2 }
    ];

    beforeEach(() => {
      global.window.open = vi.fn();
      global.alert = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      global.document.createElement = vi.fn(() => mockLink as any);
      global.document.body.appendChild = vi.fn();
      global.document.body.removeChild = vi.fn();

      mockSupabaseClient.order
        .mockResolvedValueOnce({ data: mockPrompts, error: null })
        .mockResolvedValueOnce({ data: mockTypes, error: null });
    });

    it('should fetch prompts successfully', async () => {
      await service.downloadPrintablePromptList([], null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_prompts');
    });

    it('should filter prompts by selected types', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePromptList(['Praise'], mockWindow as any);

      expect(mockWindow.document.write).toHaveBeenCalled();
    });

    it('should handle error when fetching prompts', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.order.mockReset();
      mockSupabaseClient.order.mockResolvedValueOnce({ 
        data: null, 
        error: new Error('Database error') 
      });

      await service.downloadPrintablePromptList([], null);

      expect(global.alert).toHaveBeenCalledWith('Failed to fetch prayer prompts. Please try again.');
    });

    it('should alert when no prompts found', async () => {
      mockSupabaseClient.order.mockReset();
      mockSupabaseClient.order.mockResolvedValueOnce({ data: [], error: null });

      await service.downloadPrintablePromptList([], null);

      expect(global.alert).toHaveBeenCalledWith('No prayer prompts found.');
    });

    it('should alert when no prompts match selected types', async () => {
      await service.downloadPrintablePromptList(['NonExistentType'], null);

      expect(global.alert).toHaveBeenCalledWith('No prayer prompts found for the selected types.');
    });

    it('should handle error when fetching types', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      
      mockSupabaseClient.order.mockReset();
      mockSupabaseClient.order
        .mockResolvedValueOnce({ data: mockPrompts, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('Types error') });

      await service.downloadPrintablePromptList([], mockWindow as any);

      // Should continue with default sorting
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching prayer types:', expect.any(Error));
    });

    it('should open new window with HTML content', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePromptList([], null);

      expect(mockWindow.document.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should download file when window.open is blocked', async () => {
      (global.window.open as any).mockReturnValue(null);
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      (global.document.createElement as any).mockReturnValue(mockLink);

      await service.downloadPrintablePromptList([], null);

      expect(mockLink.click).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Prayer prompts downloaded. Please open the file to view and print.');
    });

    it('should handle catch block error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await service.downloadPrintablePromptList([], null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating prayer prompts list:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith('An error occurred while generating the prayer prompts list.');
    });

    it('should close newWindow on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockWindow = { close: vi.fn() };
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await service.downloadPrintablePromptList([], mockWindow as any);

      expect(mockWindow.close).toHaveBeenCalled();
    });
  });

  describe('HTML Generation', () => {
    it('should generate HTML with prayers grouped by status', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).toContain('Current Prayer Requests');
      expect(writtenHTML).toContain('Answered Prayers');
      expect(writtenHTML).toContain('John Doe');
      expect(writtenHTML).toContain('Jane Doe');
    });

    it('should include prayer updates in HTML', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).toContain('Update content 1');
      expect(writtenHTML).toContain('Author 1');
    });

    it('should escape HTML special characters', async () => {
      const prayersWithSpecialChars: Prayer[] = [
        {
          id: '1',
          title: '<script>alert("xss")</script>',
          prayer_for: 'John & Jane',
          description: 'Test <b>description</b>',
          requester: 'Jane "Smith"',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ];

      mockSupabaseClient.order.mockResolvedValue({ 
        data: prayersWithSpecialChars, 
        error: null 
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).not.toContain('<b>description</b>');
      expect(writtenHTML).toContain('&lt;b&gt;description&lt;/b&gt;');
      expect(writtenHTML).toContain('&amp;');
      expect(writtenHTML).toContain('&quot;');
    });

    it('should show recent updates within one week', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      
      const prayersWithRecentUpdates: Prayer[] = [
        {
          id: '1',
          title: 'Test Prayer',
          prayer_for: 'John Doe',
          description: 'Test description',
          requester: 'Jane Smith',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: [
            {
              id: 'u1',
              content: 'Recent update',
              author: 'Author',
              created_at: recentDate.toISOString(),
            }
          ]
        }
      ];

      mockSupabaseClient.order.mockResolvedValue({ 
        data: prayersWithRecentUpdates, 
        error: null 
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).toContain('Recent update');
    });

    it('should show only most recent update when no recent updates', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      
      const prayersWithOldUpdates: Prayer[] = [
        {
          id: '1',
          title: 'Test Prayer',
          prayer_for: 'John Doe',
          description: 'Test description',
          requester: 'Jane Smith',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: [
            {
              id: 'u1',
              content: 'Old update 1',
              author: 'Author',
              created_at: oldDate.toISOString(),
            },
            {
              id: 'u2',
              content: 'Old update 2',
              author: 'Author',
              created_at: new Date(oldDate.getTime() - 86400000).toISOString(),
            }
          ]
        }
      ];

      mockSupabaseClient.order.mockResolvedValue({ 
        data: prayersWithOldUpdates, 
        error: null 
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).toContain('Old update 1');
      expect(writtenHTML).not.toContain('Old update 2');
    });

    it('should handle prayers with no updates', async () => {
      const prayersWithoutUpdates: Prayer[] = [
        {
          id: '1',
          title: 'Test Prayer',
          prayer_for: 'John Doe',
          description: 'Test description',
          requester: 'Jane Smith',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ];

      mockSupabaseClient.order.mockResolvedValue({ 
        data: prayersWithoutUpdates, 
        error: null 
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).toContain('John Doe');
      expect(writtenHTML).toContain('Test description');
      expect(writtenHTML).not.toContain('Updates');
    });

    it('should include answered date when present', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).toContain('Answered on');
    });

    it('should sort prayers by most recent activity', async () => {
      const oldDate = new Date('2023-01-01');
      const recentDate = new Date('2023-12-01');
      
      const prayersWithDifferentDates: Prayer[] = [
        {
          id: '1',
          title: 'Old Prayer',
          prayer_for: 'Person 1',
          description: 'Description 1',
          requester: 'Requester 1',
          status: 'current',
          created_at: oldDate.toISOString(),
          prayer_updates: []
        },
        {
          id: '2',
          title: 'Recent Prayer',
          prayer_for: 'Person 2',
          description: 'Description 2',
          requester: 'Requester 2',
          status: 'current',
          created_at: recentDate.toISOString(),
          prayer_updates: [{
            id: 'u1',
            content: 'Update',
            author: 'Author',
            created_at: recentDate.toISOString()
          }]
        }
      ];

      mockSupabaseClient.order.mockResolvedValue({ 
        data: prayersWithDifferentDates, 
        error: null 
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      // The HTML should contain both prayers
      expect(writtenHTML).toContain('Person 1');
      expect(writtenHTML).toContain('Person 2');
      // Recent prayer should appear before old prayer in the HTML
      const person1Index = writtenHTML.indexOf('Person 1');
      const person2Index = writtenHTML.indexOf('Person 2');
      expect(person2Index).toBeLessThan(person1Index);
    });

    it('should sort prayers with updates by latest update time', async () => {
      const oldUpdateDate = new Date('2023-06-01');
      const recentUpdateDate = new Date('2023-12-01');
      
      const prayersWithUpdates: Prayer[] = [
        {
          id: '1',
          title: 'Prayer 1',
          prayer_for: 'First Person',
          description: 'Description 1',
          requester: 'Requester 1',
          status: 'current',
          created_at: new Date('2023-01-01').toISOString(),
          prayer_updates: [{
            id: 'u1',
            content: 'Old update',
            author: 'Author 1',
            created_at: oldUpdateDate.toISOString()
          }]
        },
        {
          id: '2',
          title: 'Prayer 2',
          prayer_for: 'Second Person',
          description: 'Description 2',
          requester: 'Requester 2',
          status: 'current',
          created_at: new Date('2023-01-01').toISOString(),
          prayer_updates: [{
            id: 'u2',
            content: 'Recent update',
            author: 'Author 2',
            created_at: recentUpdateDate.toISOString()
          }]
        }
      ];

      mockSupabaseClient.order.mockResolvedValue({ 
        data: prayersWithUpdates, 
        error: null 
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      // Prayer with more recent update should appear first
      const firstIndex = writtenHTML.indexOf('First Person');
      const secondIndex = writtenHTML.indexOf('Second Person');
      expect(secondIndex).toBeLessThan(firstIndex);
    });
  });

  describe('Prompt HTML Generation', () => {
    const mockPrompts = [
      { id: '1', title: 'Praise Prompt 1', type: 'Praise', created_at: new Date().toISOString() },
      { id: '2', title: 'Confession Prompt 1', type: 'Confession', created_at: new Date().toISOString() },
      { id: '3', title: 'Praise Prompt 2', type: 'Praise', created_at: new Date().toISOString() }
    ];

    const mockTypes = [
      { name: 'Praise', display_order: 1 },
      { name: 'Confession', display_order: 2 }
    ];

    beforeEach(() => {
      // Reset the mock to clear previous test state
      mockSupabaseClient.order.mockReset();
      mockSupabaseClient.order
        .mockResolvedValueOnce({ data: mockPrompts, error: null })
        .mockResolvedValueOnce({ data: mockTypes, error: null });
    });

    it('should generate HTML with prompts grouped by type', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePromptList([], mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).toContain('Praise');
      expect(writtenHTML).toContain('Confession');
      expect(writtenHTML).toContain('Praise Prompt 1');
      expect(writtenHTML).toContain('Confession Prompt 1');
    });

    it('should escape HTML in prompts', async () => {
      const promptsWithSpecialChars = [
        { id: '1', title: '<script>xss</script>', type: 'Praise', created_at: new Date().toISOString() }
      ];

      // Reset and set up mocks specifically for this test
      mockSupabaseClient.order.mockReset();
      mockSupabaseClient.order
        .mockResolvedValueOnce({ data: promptsWithSpecialChars, error: null })
        .mockResolvedValueOnce({ data: mockTypes, error: null });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePromptList([], mockWindow as any);

      const writtenHTML = mockWindow.document.write.mock.calls[0][0];
      expect(writtenHTML).not.toContain('<script>xss</script>');
      expect(writtenHTML).toContain('&lt;script&gt;');
    });
  });
});
