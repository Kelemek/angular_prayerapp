import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock supabase module BEFORE importing the module under test
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { downloadPrintablePromptList, PrayerPrompt } from './printablePromptList';

describe('printablePromptList', () => {
  let mockSupabase: any;
  let mockWindow: any;
  let mockDocument: any;
  let mockLocalStorage: { [key: string]: string };
  let mockAlert: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Get the mocked supabase
    const { supabase } = await import('../lib/supabase');
    mockSupabase = supabase;

    // Mock window
    mockWindow = {
      open: vi.fn(),
      focus: vi.fn(),
      close: vi.fn(),
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    };

    // Mock document
    mockDocument = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: vi.fn(),
          };
        }
        if (tag === 'div') {
          const div = {
            textContent: '',
            innerHTML: '',
          };
          Object.defineProperty(div, 'textContent', {
            set(value: string) {
              // Simple HTML escaping simulation
              div.innerHTML = value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            },
            get() {
              return '';
            },
          });
          return div;
        }
        return {};
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    // Mock global objects
    global.window = mockWindow as any;
    global.document = mockDocument as any;
    global.alert = mockAlert = vi.fn();
    global.console.error = mockConsoleError = vi.fn();

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock setTimeout
    vi.useFakeTimers();

    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('downloadPrintablePromptList', () => {
    const mockPromptsData: PrayerPrompt[] = [
      {
        id: '1',
        title: 'Thank God for His goodness',
        type: 'Thanksgiving',
        description: 'Be grateful',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Praise the Lord',
        type: 'Praise',
        description: 'Praise Him',
        created_at: '2024-01-02T00:00:00Z',
      },
      {
        id: '3',
        title: 'Confess your sins',
        type: 'Confession',
        description: 'Confess',
        created_at: '2024-01-03T00:00:00Z',
      },
    ];

    const mockTypesData = [
      { name: 'Praise', display_order: 1 },
      { name: 'Confession', display_order: 2 },
      { name: 'Thanksgiving', display_order: 3 },
      { name: 'Supplication', display_order: 4 },
    ];

    it('should successfully fetch and display prompts in a new window', async () => {
      const mockTypesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return mockTypesChain;
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('prayer_prompts');
      expect(mockSupabase.from).toHaveBeenCalledWith('prayer_types');
      expect(newWindow.document.write).toHaveBeenCalled();
      expect(newWindow.focus).toHaveBeenCalled();
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('should filter prompts by selected types', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList(['Praise', 'Thanksgiving'], newWindow as any);

      expect(newWindow.document.write).toHaveBeenCalled();
      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      expect(htmlContent).toContain('Praise');
      expect(htmlContent).toContain('Thanksgiving');
    });

    it('should handle prompts fetch error', async () => {
      const error = new Error('Failed to fetch prompts');
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error }),
          };
        }
        return {};
      });

      const newWindow = { close: vi.fn() };

      await downloadPrintablePromptList([], newWindow as any);

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching prompts:', error);
      expect(mockAlert).toHaveBeenCalledWith('Failed to fetch prayer prompts. Please try again.');
      expect(newWindow.close).toHaveBeenCalled();
    });

    it('should handle prompts fetch error without newWindow', async () => {
      const error = new Error('Failed to fetch prompts');
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error }),
          };
        }
        return {};
      });

      await downloadPrintablePromptList([]);

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching prompts:', error);
      expect(mockAlert).toHaveBeenCalledWith('Failed to fetch prayer prompts. Please try again.');
    });

    it('should handle empty prompts data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      });

      const newWindow = { close: vi.fn() };

      await downloadPrintablePromptList([], newWindow as any);

      expect(mockAlert).toHaveBeenCalledWith('No prayer prompts found.');
      expect(newWindow.close).toHaveBeenCalled();
    });

    it('should handle empty prompts data without newWindow', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      });

      await downloadPrintablePromptList([]);

      expect(mockAlert).toHaveBeenCalledWith('No prayer prompts found.');
    });

    it('should handle null prompts data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const newWindow = { close: vi.fn() };

      await downloadPrintablePromptList([], newWindow as any);

      expect(mockAlert).toHaveBeenCalledWith('No prayer prompts found.');
      expect(newWindow.close).toHaveBeenCalled();
    });

    it('should handle prayer types fetch error gracefully', async () => {
      const typesError = new Error('Failed to fetch types');
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: typesError }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching prayer types:', typesError);
      // Should continue and display prompts despite types error
      expect(newWindow.document.write).toHaveBeenCalled();
    });

    it('should show alert when no prompts match selected types', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = { close: vi.fn() };

      await downloadPrintablePromptList(['NonexistentType'], newWindow as any);

      expect(mockAlert).toHaveBeenCalledWith('No prayer prompts found for the selected types.');
      expect(newWindow.close).toHaveBeenCalled();
    });

    it('should show alert when no prompts match selected types without newWindow', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      await downloadPrintablePromptList(['NonexistentType']);

      expect(mockAlert).toHaveBeenCalledWith('No prayer prompts found for the selected types.');
    });

    it('should use window.open when no newWindow is provided', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const openedWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
      };

      mockWindow.open.mockReturnValue(openedWindow);

      await downloadPrintablePromptList([]);

      expect(mockWindow.open).toHaveBeenCalledWith('', '_blank');
      expect(openedWindow.document.write).toHaveBeenCalled();
      expect(openedWindow.focus).toHaveBeenCalled();
    });

    it('should fallback to download when popup is blocked', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      // Simulate popup blocked
      mockWindow.open.mockReturnValue(null);

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      await downloadPrintablePromptList([]);

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(mockAlert).toHaveBeenCalledWith('Prayer prompts downloaded. Please open the file to view and print.');

      // Advance timers to trigger URL.revokeObjectURL
      vi.advanceTimersByTime(100);
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle general errors in try-catch', async () => {
      const error = new Error('Unexpected error');
      mockSupabase.from.mockImplementation(() => {
        throw error;
      });

      const newWindow = { close: vi.fn() };

      await downloadPrintablePromptList([], newWindow as any);

      expect(mockConsoleError).toHaveBeenCalledWith('Error generating prayer prompts list:', error);
      expect(mockAlert).toHaveBeenCalledWith('An error occurred while generating the prayer prompts list.');
      expect(newWindow.close).toHaveBeenCalled();
    });

    it('should handle general errors without newWindow', async () => {
      const error = new Error('Unexpected error');
      mockSupabase.from.mockImplementation(() => {
        throw error;
      });

      await downloadPrintablePromptList([]);

      expect(mockConsoleError).toHaveBeenCalledWith('Error generating prayer prompts list:', error);
      expect(mockAlert).toHaveBeenCalledWith('An error occurred while generating the prayer prompts list.');
    });

    it('should sort prompts by type display order', async () => {
      const unsortedPrompts: PrayerPrompt[] = [
        {
          id: '1',
          title: 'Supplication prompt',
          type: 'Supplication',
          description: 'Ask',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Praise prompt',
          type: 'Praise',
          description: 'Praise',
          created_at: '2024-01-02T00:00:00Z',
        },
        {
          id: '3',
          title: 'Confession prompt',
          type: 'Confession',
          description: 'Confess',
          created_at: '2024-01-03T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: unsortedPrompts, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      // Check that Praise appears before Confession which appears before Supplication
      const praiseIndex = htmlContent.indexOf('Praise prompt');
      const confessionIndex = htmlContent.indexOf('Confession prompt');
      const supplicationIndex = htmlContent.indexOf('Supplication prompt');

      expect(praiseIndex).toBeLessThan(confessionIndex);
      expect(confessionIndex).toBeLessThan(supplicationIndex);
    });

    it('should use default sort order for types not in typeOrderMap', async () => {
      const promptsWithUnknownType: PrayerPrompt[] = [
        {
          id: '1',
          title: 'Unknown type prompt',
          type: 'UnknownType',
          description: 'Unknown',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Praise prompt',
          type: 'Praise',
          description: 'Praise',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: promptsWithUnknownType, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      expect(newWindow.document.write).toHaveBeenCalled();
      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      // Praise should come before UnknownType (order 1 vs 999)
      const praiseIndex = htmlContent.indexOf('Praise prompt');
      const unknownIndex = htmlContent.indexOf('Unknown type prompt');
      expect(praiseIndex).toBeLessThan(unknownIndex);
    });

    it('should generate valid HTML with proper structure', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      
      // Check HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html>');
      expect(htmlContent).toContain('</html>');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('</head>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('</body>');
      expect(htmlContent).toContain('Prayer Prompts');
      expect(htmlContent).toContain('Generated:');
    });

    it('should handle empty types data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      expect(newWindow.document.write).toHaveBeenCalled();
    });

    it('should escape HTML in prompt titles', async () => {
      const promptsWithHtml: PrayerPrompt[] = [
        {
          id: '1',
          title: '<script>alert("xss")</script>',
          type: 'Praise',
          description: 'Test',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: promptsWithHtml, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      // Should be escaped
      expect(htmlContent).toContain('&lt;script&gt;');
      expect(htmlContent).not.toContain('<script>alert');
    });

    it('should group prompts by type correctly', async () => {
      const multiplePromptsPerType: PrayerPrompt[] = [
        {
          id: '1',
          title: 'Praise 1',
          type: 'Praise',
          description: 'Test',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Praise 2',
          type: 'Praise',
          description: 'Test',
          created_at: '2024-01-02T00:00:00Z',
        },
        {
          id: '3',
          title: 'Thanksgiving 1',
          type: 'Thanksgiving',
          description: 'Test',
          created_at: '2024-01-03T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: multiplePromptsPerType, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      
      // Should have Praise section with count
      expect(htmlContent).toContain('Praise (2)');
      expect(htmlContent).toContain('Thanksgiving (1)');
      expect(htmlContent).toContain('Praise 1');
      expect(htmlContent).toContain('Praise 2');
      expect(htmlContent).toContain('Thanksgiving 1');
    });

    it('should apply correct colors to different types', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      
      // Check for predefined colors
      expect(htmlContent).toContain('#39704D'); // Praise color
      expect(htmlContent).toContain('#C9A961'); // Confession color
      expect(htmlContent).toContain('#0047AB'); // Thanksgiving color
    });

    it('should use default color for unknown types', async () => {
      const promptsWithUnknownType: PrayerPrompt[] = [
        {
          id: '1',
          title: 'Custom Type Prompt',
          type: 'CustomType',
          description: 'Test',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: promptsWithUnknownType, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      
      // Should use default color
      expect(htmlContent).toContain('#6b7280');
    });

    it('should include proper date formatting in HTML', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPromptsData, error: null }),
          };
        }
        if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypesData, error: null }),
          };
        }
        return {};
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };

      await downloadPrintablePromptList([], newWindow as any);

      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      
      // Should have formatted date
      expect(htmlContent).toMatch(/Generated:.*\d{1,2}:\d{2}\s*(AM|PM)/);
    });
  });
});
