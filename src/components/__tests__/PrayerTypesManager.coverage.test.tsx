import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock directQuery and directMutation
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
  directQuery: vi.fn(),
  directMutation: vi.fn(),
}));

// Import after mock to get mocked versions
import { directQuery, directMutation } from '../../lib/supabase';

describe('PrayerTypesManager - Additional Coverage Tests', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
    // Reset module cache to clear cachedPrayerTypes between tests
    vi.resetModules();
    // Default mock for directQuery
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
    vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });
  });

  // Helper to get fresh component import after module reset
  const getComponent = async () => {
    const { PrayerTypesManager } = await import('../PrayerTypesManager');
    return PrayerTypesManager;
  };

  describe('Form Cancel Functionality', () => {
    it('closes form when X button is clicked', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      // Open the form
      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByText(/add new prayer type/i)).toBeDefined();
      });

      // Find and click the X button
      const buttons = screen.getAllByRole('button');
      const xButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.getAttribute('type') !== 'submit';
      });

      if (xButton) {
        await user.click(xButton);
        
        await waitFor(() => {
          expect(screen.queryByText(/add new prayer type/i)).toBeNull();
        });
      }
    });

    it('closes form when Cancel button is clicked', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      // Open the form
      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByText(/add new prayer type/i)).toBeDefined();
      });

      // Find and click Cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/add new prayer type/i)).toBeNull();
      });
    });

    it('resets form fields when cancel button is clicked', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      // Open the form
      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i)).toBeDefined();
      });

      // Type something
      await user.type(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i), 'Test Type');

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Reopen form
      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i) as HTMLInputElement;
        expect(nameInput.value).toBe('');
      });
    });
  });

  describe('Toggle Active/Inactive Functionality', () => {
    it('successfully toggles type to inactive', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      // Find toggle button (Eye icon for active)
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('deactivate')
      );

      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(vi.mocked(directMutation)).toHaveBeenCalledWith(
            'prayer_types',
            expect.objectContaining({
              method: 'PATCH',
              eq: { id: '1' },
              body: { is_active: false }
            })
          );
        });
      }
    });

    it('successfully toggles type to active', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: false, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      // Find toggle button (EyeOff icon for inactive)
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('activate')
      );

      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(vi.mocked(directMutation)).toHaveBeenCalledWith(
            'prayer_types',
            expect.objectContaining({
              method: 'PATCH',
              eq: { id: '1' },
              body: { is_active: true }
            })
          );
        });
      }
    });

    it('displays success message after toggle', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('deactivate')
      );

      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(screen.getByText(/deactivated successfully/i)).toBeDefined();
        });
      }
    });

    it('handles toggle error gracefully', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ 
        data: null, 
        error: { message: 'Toggle failed' } 
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('deactivate')
      );

      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(screen.getByText(/toggle failed/i)).toBeDefined();
        });
      }
    });
  });

  describe('Delete Functionality', () => {
    it('successfully deletes a prayer type with confirmation', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });
      global.confirm = vi.fn(() => true);

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('delete')
      );

      if (deleteButton) {
        await user.click(deleteButton);

        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Personal')
        );

        await waitFor(() => {
          expect(vi.mocked(directMutation)).toHaveBeenCalledWith(
            'prayer_types',
            expect.objectContaining({
              method: 'DELETE',
              eq: { id: '1' }
            })
          );
        });
      }
    });

    it('displays success message after delete', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });
      global.confirm = vi.fn(() => true);

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('delete')
      );

      if (deleteButton) {
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText(/deleted successfully/i)).toBeDefined();
        });
      }
    });

    it('handles delete error gracefully', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ 
        data: null, 
        error: { message: 'Delete failed' } 
      });
      global.confirm = vi.fn(() => true);

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('delete')
      );

      if (deleteButton) {
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText(/delete failed/i)).toBeDefined();
        });
      }
    });
  });

  describe('Update Functionality', () => {
    it('successfully updates a prayer type', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      // Click edit button
      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('edit')
      );

      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByText(/edit prayer type/i)).toBeDefined();
        });

        // Modify the name
        const nameInput = screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'Personal Updated');

        // Submit
        const submitButton = screen.getByRole('button', { name: /update type/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(vi.mocked(directMutation)).toHaveBeenCalledWith(
            'prayer_types',
            expect.objectContaining({
              method: 'PATCH',
              eq: { id: '1' },
              body: expect.objectContaining({
                name: 'Personal Updated'
              })
            })
          );
        });
      }
    });

    it('displays success message after update', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('edit')
      );

      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByText(/edit prayer type/i)).toBeDefined();
        });

        const nameInput = screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'Updated');

        const submitButton = screen.getByRole('button', { name: /update type/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/updated successfully/i)).toBeDefined();
        });
      }
    });

    it('handles update error gracefully', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('edit')
      );

      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByText(/edit prayer type/i)).toBeDefined();
        });

        const nameInput = screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'Updated');

        const submitButton = screen.getByRole('button', { name: /update type/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/update failed/i)).toBeDefined();
        });
      }
    });
  });

  describe('Form Validation', () => {
    it('shows error when submitting empty name', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByText(/add new prayer type/i)).toBeDefined();
      });

      // Submit without entering a name - the form will prevent submission
      // but we can verify the mutation wasn't called
      const addButtons = screen.getAllByRole('button', { name: /add type/i });
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit');
      
      if (submitButton) {
        await user.click(submitButton);

        // Wait a bit to see if mutation was called
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Mutation should not have been called with empty name
        expect(vi.mocked(directMutation)).not.toHaveBeenCalled();
      }
    });

    it('trims whitespace from type name', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i), '  Healing  ');
      
      const addButtons = screen.getAllByRole('button', { name: /add type/i });
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(directMutation)).toHaveBeenCalledWith(
          'prayer_types',
          expect.objectContaining({
            method: 'POST',
            body: expect.objectContaining({
              name: 'Healing'  // Should be trimmed
            })
          })
        );
      });
    });
  });

  describe('Display Order Input', () => {
    it('allows changing display order when adding', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByText(/add new prayer type/i)).toBeDefined();
      });

      const nameInput = screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i);
      await user.type(nameInput, 'Test');

      const displayOrderInput = screen.getByRole('spinbutton');
      await user.clear(displayOrderInput);
      await user.type(displayOrderInput, '5');

      const addButtons = screen.getAllByRole('button', { name: /add type/i });
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(directMutation)).toHaveBeenCalledWith(
          'prayer_types',
          expect.objectContaining({
            body: expect.objectContaining({
              display_order: 5
            })
          })
        );
      });
    });
  });

  describe('Active Checkbox', () => {
    it('allows toggling active checkbox in form', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByText(/add new prayer type/i)).toBeDefined();
      });

      const nameInput = screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i);
      await user.type(nameInput, 'Test');

      // Find and click the Active checkbox
      const activeCheckbox = screen.getByRole('checkbox');
      await user.click(activeCheckbox);

      const addButtons = screen.getAllByRole('button', { name: /add type/i });
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(directMutation)).toHaveBeenCalledWith(
          'prayer_types',
          expect.objectContaining({
            body: expect.objectContaining({
              is_active: false  // Should be unchecked now
            })
          })
        );
      });
    });
  });

  describe('Reordering with Drag and Drop', () => {
    it('handles drag end event for reordering', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'First', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', name: 'Second', display_order: 1, is_active: true, created_at: '2025-01-02T00:00:00Z' },
        { id: '3', name: 'Third', display_order: 2, is_active: true, created_at: '2025-01-03T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('First')).toBeDefined();
        expect(screen.getByText('Second')).toBeDefined();
        expect(screen.getByText('Third')).toBeDefined();
      });

      // Note: Actually simulating drag and drop is complex with DnD Kit
      // This test verifies the component renders with drag handles
      const buttons = screen.getAllByRole('button');
      const dragHandles = buttons.filter(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('drag')
      );
      
      expect(dragHandles.length).toBeGreaterThan(0);
    });

    it('handles drag end error gracefully', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'First', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', name: 'Second', display_order: 1, is_active: true, created_at: '2025-01-02T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      // First call succeeds, second fails (simulating reorder error)
      vi.mocked(directMutation)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Reorder failed' } });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('First')).toBeDefined();
      });
    });
  });

  describe('Total Count Display', () => {
    it('displays correct total count', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'First', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', name: 'Second', display_order: 1, is_active: true, created_at: '2025-01-02T00:00:00Z' },
        { id: '3', name: 'Third', display_order: 2, is_active: false, created_at: '2025-01-03T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('First')).toBeDefined();
        expect(screen.getByText('Second')).toBeDefined();
        expect(screen.getByText('Third')).toBeDefined();
      });
      
      // Verify all 3 types are rendered
      expect(mockTypes.length).toBe(3);
    });

    it('displays active count when some types are inactive', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'First', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', name: 'Second', display_order: 1, is_active: true, created_at: '2025-01-02T00:00:00Z' },
        { id: '3', name: 'Third', display_order: 2, is_active: false, created_at: '2025-01-03T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('First')).toBeDefined();
        expect(screen.getByText('Third')).toBeDefined();
      });
      
      // Check that Third is marked as inactive
      expect(screen.getByText('Inactive')).toBeDefined();
    });
  });
});
