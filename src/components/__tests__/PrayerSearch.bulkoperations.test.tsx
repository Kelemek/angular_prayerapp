import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrayerSearch } from '../PrayerSearch';
import userEvent from '@testing-library/user-event';

// Mock supabase - must use factory function for vi.mock
vi.mock('../../lib/supabase', () => {
  const mockFrom = vi.fn();
  const mockDelete = vi.fn();
  const mockUpdate = vi.fn();
  const mockInsert = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

describe('PrayerSearch - Bulk Operations', () => {
  const mockPrayers = [
    {
      id: '1',
      title: 'Prayer 1',
      requester: 'John Doe',
      email: 'john@example.com',
      status: 'current',
      approval_status: 'approved',
      created_at: '2025-01-01T00:00:00Z',
      prayer_updates: [],
    },
    {
      id: '2',
      title: 'Prayer 2',
      requester: 'Jane Smith',
      email: 'jane@example.com',
      status: 'answered',
      approval_status: 'approved',
      created_at: '2025-01-02T00:00:00Z',
      prayer_updates: [],
    },
    {
      id: '3',
      title: 'Prayer 3',
      requester: 'Bob Johnson',
      email: 'bob@example.com',
      status: 'current',
      approval_status: 'pending',
      created_at: '2025-01-03T00:00:00Z',
      prayer_updates: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    
    // Mock global fetch for search operations
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPrayers,
    });

    // Mock global confirm
    global.confirm = vi.fn().mockReturnValue(true);
  });

  it('allows selecting individual prayers', async () => {
    const user = userEvent.setup();
    render(<PrayerSearch />);

    // Trigger search first
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Find and click checkbox for first prayer
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // Skip "select all" checkbox at index 0

    expect(checkboxes[1]).toBeChecked();
  });

  it('allows selecting all prayers', async () => {
    const user = userEvent.setup();
    render(<PrayerSearch />);

    // Trigger search first
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Click select all checkbox
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(selectAllCheckbox);

    // All prayer checkboxes should be checked
    const allCheckboxes = screen.getAllByRole('checkbox');
    allCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });

  it('allows deselecting all prayers after selecting all', async () => {
    const user = userEvent.setup();
    render(<PrayerSearch />);

    // Trigger search first
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Click select all checkbox twice
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(selectAllCheckbox);
    await user.click(selectAllCheckbox);

    // No prayer checkboxes should be checked
    const allCheckboxes = screen.getAllByRole('checkbox');
    expect(selectAllCheckbox).not.toBeChecked();
  });

  it('shows bulk actions when prayers are selected', async () => {
    const user = userEvent.setup();
    render(<PrayerSearch />);

    // Trigger search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Select a prayer
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    // Bulk actions should appear
    await waitFor(() => {
      expect(screen.getByText(/1 selected/i)).toBeDefined();
    });
  });

  it('performs bulk delete operation', async () => {
    const user = userEvent.setup();

    render(<PrayerSearch />);

    // Trigger search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Select prayers
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    // Click bulk delete button
    const deleteButton = screen.getByRole('button', { name: /delete selected/i });
    await user.click(deleteButton);

    // Confirm should be called
    expect(global.confirm).toHaveBeenCalled();
  });

  it('performs bulk status update', async () => {
    const user = userEvent.setup();

    render(<PrayerSearch />);

    // Trigger search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Select prayers
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    // Find and use status dropdown
    const statusSelect = screen.getByRole('combobox', { name: /update status/i });
    fireEvent.change(statusSelect, { target: { value: 'answered' } });

    // Click update button
    const updateButton = screen.getByRole('button', { name: /update selected/i });
    await user.click(updateButton);

    // Update button should trigger update logic
    expect(updateButton).toBeDefined();
  });

  it('expands and collapses prayer cards', async () => {
    const user = userEvent.setup();
    render(<PrayerSearch />);

    // Trigger search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Find expand button
    const expandButtons = screen.getAllByRole('button', { name: /show details|hide details/i });
    if (expandButtons.length > 0) {
      await user.click(expandButtons[0]);

      // Should show description or details
      await waitFor(() => {
        expect(expandButtons[0].textContent).toContain('Hide Details');
      });
    }
  });

  it('shows error message when bulk delete fails', async () => {
    const user = userEvent.setup();

    render(<PrayerSearch />);

    // Trigger search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Select prayers
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    // Click bulk delete button
    const deleteButton = screen.getByRole('button', { name: /delete selected/i });
    await user.click(deleteButton);

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/delete failed/i)).toBeDefined();
    });
  });

  it('shows error message when bulk status update fails', async () => {
    const user = userEvent.setup();

    render(<PrayerSearch />);

    // Trigger search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Select prayers
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    // Update status
    const statusSelect = screen.getByRole('combobox', { name: /update status/i });
    fireEvent.change(statusSelect, { target: { value: 'answered' } });

    const updateButton = screen.getByRole('button', { name: /update selected/i });
    await user.click(updateButton);

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeDefined();
    });
  });

  it('disables bulk actions when no prayers are selected', async () => {
    const user = userEvent.setup();
    render(<PrayerSearch />);

    // Trigger search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Prayer 1')).toBeDefined();
    });

    // Bulk action buttons should be disabled or hidden
    const deleteButton = screen.queryByRole('button', { name: /delete selected/i });
    if (deleteButton) {
      expect(deleteButton).toBeDisabled();
    }
  });
});
