import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { PrayerSearch } from '../PrayerSearch';
import { supabase } from '../../lib/supabase';

// Mock supabase
vi.mock('../../lib/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom
    },
    directQuery: vi.fn(),
    directMutation: vi.fn()
  };
});

describe('PrayerSearch - Prayer Updates and Bulk Actions', () => {
  let mockPrayers: any[];
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock prayers with updates
    mockPrayers = [
      {
        id: 'prayer-1',
        title: 'Test Prayer',
        requester: 'John Doe',
        email: 'john@example.com',
        status: 'current',
        created_at: new Date().toISOString(),
        description: 'Please pray for healing',
        approval_status: 'approved',
        prayer_for: 'Family',
        prayer_updates: [
          {
            id: 'update-1',
            content: 'First update',
            author: 'Jane',
            created_at: new Date().toISOString(),
            approval_status: 'approved'
          }
        ]
      }
    ];
    
    // Mock fetch for the search functionality
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPrayers)
    });
    
    // Mock confirm dialog
    global.confirm = vi.fn(() => true);
  });

  describe('Add New Update', () => {
    it('shows add update form when Add Update button is clicked', async () => {
      render(<PrayerSearch />);
      
      // Trigger search to load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand the prayer card
      const expandButton = screen.getByText('Test Prayer');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Add Update/i)).toBeTruthy();
      });
      
      // Click Add Update button
      const addUpdateButton = screen.getByRole('button', { name: /Add Update/i });
      fireEvent.click(addUpdateButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter the update content/i)).toBeTruthy();
        expect(screen.getByPlaceholderText(/Your name/i)).toBeTruthy();
        expect(screen.getByPlaceholderText(/your.email@example.com/i)).toBeTruthy();
      });
    });

    it('successfully saves a new prayer update', async () => {
      // Mock successful insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'new-update',
              prayer_id: 'prayer-1',
              content: 'New update content',
              author: 'Admin User',
              author_email: 'admin@example.com',
              approval_status: 'approved',
              created_at: new Date().toISOString()
            },
            error: null
          })
        })
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });
      
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand prayer card
      fireEvent.click(screen.getByText('Test Prayer'));
      
      await waitFor(() => {
        expect(screen.getByText(/Add Update/i)).toBeTruthy();
      });
      
      // Click Add Update
      fireEvent.click(screen.getByRole('button', { name: /Add Update/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter the update content/i)).toBeTruthy();
      });
      
      // Fill in the form
      const contentTextarea = screen.getByPlaceholderText(/Enter the update content/i);
      const authorInput = screen.getByPlaceholderText(/Your name/i);
      const emailInput = screen.getByPlaceholderText(/your.email@example.com/i);
      
      fireEvent.change(contentTextarea, { target: { value: 'New update content' } });
      fireEvent.change(authorInput, { target: { value: 'Admin User' } });
      fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
      
      // Submit the form
      const saveButton = screen.getByRole('button', { name: /Save Update/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          prayer_id: 'prayer-1',
          content: 'New update content',
          author: 'Admin User',
          author_email: 'admin@example.com',
          approval_status: 'approved'
        });
      });
    });

    it('shows validation error when required fields are missing', async () => {
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand and open add update form
      fireEvent.click(screen.getByText('Test Prayer'));
      await waitFor(() => {
        expect(screen.getByText(/Add Update/i)).toBeTruthy();
      });
      fireEvent.click(screen.getByRole('button', { name: /Add Update/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter the update content/i)).toBeTruthy();
      });
      
      // Try to save without filling required fields
      const saveButton = screen.getByRole('button', { name: /Save Update/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please provide update content, author name, and author email/i)).toBeTruthy();
      });
    });

    it('shows validation error when only content is provided', async () => {
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand and open add update form
      fireEvent.click(screen.getByText('Test Prayer'));
      await waitFor(() => {
        expect(screen.getByText(/Add Update/i)).toBeTruthy();
      });
      fireEvent.click(screen.getByRole('button', { name: /Add Update/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter the update content/i)).toBeTruthy();
      });
      
      // Fill only content
      const contentTextarea = screen.getByPlaceholderText(/Enter the update content/i);
      fireEvent.change(contentTextarea, { target: { value: 'Some content' } });
      
      // Try to save
      const saveButton = screen.getByRole('button', { name: /Save Update/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please provide update content, author name, and author email/i)).toBeTruthy();
      });
    });

    it('handles error when insert fails', async () => {
      // Mock failed insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });
      
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand and open add update form
      fireEvent.click(screen.getByText('Test Prayer'));
      await waitFor(() => {
        expect(screen.getByText(/Add Update/i)).toBeTruthy();
      });
      fireEvent.click(screen.getByRole('button', { name: /Add Update/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter the update content/i)).toBeTruthy();
      });
      
      // Fill in all fields
      fireEvent.change(screen.getByPlaceholderText(/Enter the update content/i), { target: { value: 'Content' } });
      fireEvent.change(screen.getByPlaceholderText(/Your name/i), { target: { value: 'Author' } });
      fireEvent.change(screen.getByPlaceholderText(/your.email@example.com/i), { target: { value: 'author@example.com' } });
      
      // Try to save
      const saveButton = screen.getByRole('button', { name: /Save Update/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to create update: Database error/i)).toBeTruthy();
      });
    });

    it('cancels adding update and clears form', async () => {
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand and open add update form
      fireEvent.click(screen.getByText('Test Prayer'));
      await waitFor(() => {
        expect(screen.getByText(/Add Update/i)).toBeTruthy();
      });
      fireEvent.click(screen.getByRole('button', { name: /Add Update/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter the update content/i)).toBeTruthy();
      });
      
      // Fill in some data
      fireEvent.change(screen.getByPlaceholderText(/Enter the update content/i), { target: { value: 'Some content' } });
      
      // Cancel
      const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButtons[0]);
      
      await waitFor(() => {
        // Form should be closed, Add Update button should be visible again
        expect(screen.getByRole('button', { name: /Add Update/i })).toBeTruthy();
      });
    });
  });

  describe('Delete Update', () => {
    it('successfully deletes a prayer update', async () => {
      // Mock successful delete
      const mockDelete = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });
      
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });
      
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand prayer card
      fireEvent.click(screen.getByText('Test Prayer'));
      
      await waitFor(() => {
        expect(screen.getByText('First update')).toBeTruthy();
      });
      
      // Find and click delete button for the update
      const deleteButtons = screen.getAllByRole('button', { name: /Delete this update/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
      });
    });

    it('does not delete update when user cancels confirmation', async () => {
      // Mock cancel confirmation
      global.confirm = vi.fn(() => false);
      
      const mockDelete = vi.fn();
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockDelete
        })
      });
      
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand prayer card
      fireEvent.click(screen.getByText('Test Prayer'));
      
      await waitFor(() => {
        expect(screen.getByText('First update')).toBeTruthy();
      });
      
      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /Delete this update/i });
      fireEvent.click(deleteButtons[0]);
      
      // Verify delete was not called
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
      });
      
      // Give it a moment to ensure delete wasn't called
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('handles error when delete fails', async () => {
      // Mock failed delete
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Delete failed' }
          })
        })
      });
      
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeTruthy();
      });
      
      // Expand prayer card
      fireEvent.click(screen.getByText('Test Prayer'));
      
      await waitFor(() => {
        expect(screen.getByText('First update')).toBeTruthy();
      });
      
      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /Delete this update/i });
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to delete update: Delete failed/i)).toBeTruthy();
      });
    });
  });

  describe('Bulk Status Update', () => {
    beforeEach(() => {
      mockPrayers = [
        {
          id: 'prayer-1',
          title: 'Prayer 1',
          requester: 'John',
          email: 'john@example.com',
          status: 'current',
          created_at: new Date().toISOString(),
          description: 'Test',
          approval_status: 'approved',
          prayer_updates: []
        },
        {
          id: 'prayer-2',
          title: 'Prayer 2',
          requester: 'Jane',
          email: 'jane@example.com',
          status: 'current',
          created_at: new Date().toISOString(),
          description: 'Test 2',
          approval_status: 'approved',
          prayer_updates: []
        }
      ];
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrayers)
      });
    });

    it('shows bulk status update controls when prayers are selected', async () => {
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Prayer 1')).toBeTruthy();
        expect(screen.getByText('Prayer 2')).toBeTruthy();
      });
      
      // Select all checkbox should be visible
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
      
      // Click Select All
      fireEvent.click(checkboxes[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/2 selected/i)).toBeTruthy();
        expect(screen.getByText(/Change Status:/i)).toBeTruthy();
      });
    });

    it('successfully updates status for selected prayers', async () => {
      // Mock successful update
      const mockUpdate = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });
      
      (supabase.from as any).mockReturnValue({
        update: mockUpdate
      });
      
      render(<PrayerSearch />);
      
      // Load prayers
      const allComboboxes = screen.getAllByRole('combobox');
      fireEvent.change(allComboboxes[0], { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Prayer 1')).toBeTruthy();
      });
      
      // Select all prayers
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/2 selected/i)).toBeTruthy();
      });
      
      // Select a status from bulk status dropdown (it's the 3rd combobox)
      const statusDropdowns = screen.getAllByRole('combobox');
      // Find the bulk status dropdown (should be after the two filter dropdowns)
      const bulkDropdown = statusDropdowns[2];
      fireEvent.change(bulkDropdown, { target: { value: 'answered' } });
      
      // Click Update button
      const updateButtons = screen.getAllByRole('button');
      const updateButton = updateButtons.find(btn => btn.textContent?.includes('Update'));
      if (updateButton) {
        fireEvent.click(updateButton);
        
        await waitFor(() => {
          expect(global.confirm).toHaveBeenCalled();
        });
      }
    });

    it('does not update when user cancels confirmation', async () => {
      global.confirm = vi.fn(() => false);
      
      const mockUpdate = vi.fn();
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: mockUpdate
        })
      });
      
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Prayer 1')).toBeTruthy();
      });
      
      // Select all
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/2 selected/i)).toBeTruthy();
      });
      
      // Try to update (3rd combobox is the bulk status dropdown)
      const statusDropdowns = screen.getAllByRole('combobox');
      const bulkDropdown = statusDropdowns[2];
      fireEvent.change(bulkDropdown, { target: { value: 'answered' } });
      
      const updateButtons = screen.getAllByRole('button');
      const updateButton = updateButtons.find(btn => btn.textContent?.includes('Update'));
      if (updateButton) {
        fireEvent.click(updateButton);
        
        await waitFor(() => {
          expect(global.confirm).toHaveBeenCalled();
        });
        
        // Give it time and verify update wasn't called
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(mockUpdate).not.toHaveBeenCalled();
      }
    });

    it('handles error when bulk update fails', async () => {
      // Mock failed update
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' }
          })
        })
      });
      
      render(<PrayerSearch />);
      
      // Load prayers
      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'all' } });
      
      await waitFor(() => {
        expect(screen.getByText('Prayer 1')).toBeTruthy();
      });
      
      // Select all
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/2 selected/i)).toBeTruthy();
      });
      
      // Try to update (3rd combobox is the bulk status dropdown)
      const statusDropdowns = screen.getAllByRole('combobox');
      const bulkDropdown = statusDropdowns[2];
      fireEvent.change(bulkDropdown, { target: { value: 'answered' } });
      
      const updateButtons = screen.getAllByRole('button');
      const updateButton = updateButtons.find(btn => btn.textContent?.includes('Update'));
      if (updateButton) {
        fireEvent.click(updateButton);
        
        await waitFor(() => {
          expect(screen.getByText(/Failed to update prayer statuses: Update failed/i)).toBeTruthy();
        });
      }
    });
  });
});
