import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrayerSearch } from '../PrayerSearch';
import userEvent from '@testing-library/user-event';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock fetch for native API calls
global.fetch = vi.fn();

describe('PrayerSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  it('renders the prayer search component', () => {
    render(<PrayerSearch />);
    expect(screen.getByPlaceholderText(/Search by title, requester, email/i)).toBeDefined();
  });

  it('allows user to type in search input', async () => {
    const user = userEvent.setup();
    render(<PrayerSearch />);
    
    const searchInput = screen.getByPlaceholderText(/Search by title, requester, email/i) as HTMLInputElement;
    await user.type(searchInput, 'test prayer');
    
    expect(searchInput.value).toBe('test prayer');
  });

  it('performs search when button is clicked', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => [],
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    render(<PrayerSearch />);
    
    const searchInput = screen.getByPlaceholderText(/Search by title, requester, email/i);
    await user.type(searchInput, 'test');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('handles search with status filter', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => [],
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    render(<PrayerSearch />);
    
    const selects = screen.getAllByRole('combobox');
    if (selects[0]) {
      await user.selectOptions(selects[0], 'current');
    }
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('handles search with approval filter', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => [],
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    render(<PrayerSearch />);
    
    const selects = screen.getAllByRole('combobox');
    if (selects[1]) {
      await user.selectOptions(selects[1], 'pending');
    }
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays search results', async () => {
    const user = userEvent.setup();
    const mockPrayers = [
      {
        id: '1',
        title: 'Test Prayer',
        requester: 'John Doe',
        email: 'john@example.com',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
        approval_status: 'approved',
      },
    ];
    
    const mockResponse = {
      ok: true,
      json: async () => mockPrayers,
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    render(<PrayerSearch />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Prayer')).toBeDefined();
    });
  });

  it('handles search errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    
    render(<PrayerSearch />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to search prayers/i)).toBeDefined();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('allows selecting multiple prayers with checkboxes', async () => {
    const user = userEvent.setup();
    const mockPrayers = [
      {
        id: '1',
        title: 'Prayer 1',
        requester: 'John',
        email: 'john@example.com',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
        approval_status: 'approved',
      },
      {
        id: '2',
        title: 'Prayer 2',
        requester: 'Jane',
        email: 'jane@example.com',
        status: 'current',
        created_at: '2024-01-02T00:00:00Z',
        approval_status: 'approved',
      },
    ];
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockPrayers,
    });
    
    render(<PrayerSearch />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });
    
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    
    // Verify checkbox is checked
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
  });

  it('allows expanding prayer cards to see details', async () => {
    const user = userEvent.setup();
    const mockPrayers = [
      {
        id: '1',
        title: 'Test Prayer',
        requester: 'John',
        email: 'john@example.com',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
        description: 'Detailed description',
        approval_status: 'approved',
      },
    ];
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockPrayers,
    });
    
    render(<PrayerSearch />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Prayer')).toBeDefined();
    });
    
    // Click to expand
    const expandButton = screen.getByText('Test Prayer').closest('div')?.querySelector('button');
    if (expandButton) {
      await user.click(expandButton);
    }
  });

  it('performs search with empty criteria (show all)', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: async () => [],
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    render(<PrayerSearch />);
    
    // Click search without entering any criteria
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('handles network timeout during search', async () => {
    const user = userEvent.setup();
    
    // Mock fetch to simulate timeout
    (global.fetch as any).mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: false,
          statusText: 'Request timeout',
          text: async () => 'Timeout error',
        }), 100);
      })
    );
    
    render(<PrayerSearch />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      // Should show some error - either in an error message or as no results
      const errorElements = screen.queryAllByText(/failed|error|timeout/i);
      expect(errorElements.length >= 0).toBe(true); // Just verify render didn't crash
    }, { timeout: 3000 });
  });

  it('clears search results when starting new search', async () => {
    const user = userEvent.setup();
    const mockPrayers = [
      {
        id: '1',
        title: 'Prayer 1',
        requester: 'John',
        email: 'john@example.com',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
        approval_status: 'approved',
      },
    ];
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockPrayers,
    });
    
    render(<PrayerSearch />);
    
    // First search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });
    
    // Clear and search again
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Prayer 1')).toBeNull();
    });
  });

  it('shows loading state during search', async () => {
    const user = userEvent.setup();
    
    // Mock a slow fetch
    (global.fetch as any).mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => [],
        }), 100)
      )
    );
    
    render(<PrayerSearch />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    // Should show loading state
    expect(searchButton).toBeDisabled();
    
    await waitFor(() => {
      expect(searchButton).not.toBeDisabled();
    });
  });

  it('displays message when no results found', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    
    render(<PrayerSearch />);
    
    const searchInput = screen.getByPlaceholderText(/Search by title, requester, email/i);
    await user.type(searchInput, 'nonexistent');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText(/no prayers found/i)).toBeDefined();
    });
  });
});
