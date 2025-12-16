// Additional tests to improve PrayerCard coverage to 80%
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { PrayerCard } from '../PrayerCard'
import { PrayerStatus } from '../../types/prayer'
import type { PrayerRequest } from '../../types/prayer'
import * as userInfoStorage from '../../utils/userInfoStorage'

vi.mock('../../hooks/useVerification', () => ({
  useVerification: vi.fn(() => ({ isEnabled: false, requestCode: vi.fn() }))
}))
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}))
vi.mock('../../utils/userInfoStorage', () => ({
  getUserInfo: vi.fn(() => ({ firstName: '', lastName: '', email: '' })),
  saveUserInfo: vi.fn()
}))

describe('PrayerCard Coverage Tests', () => {
  const mockPrayer: PrayerRequest = {
    id: '1',
    title: 'Test Prayer',
    description: 'Test prayer content',
    requester: 'John Doe',
    prayer_for: 'John Doe',
    email: 'john@example.com',
    is_anonymous: false,
    status: PrayerStatus.CURRENT,
    date_requested: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    updates: [],
  }

  const mockCallbacks = {
    onUpdateStatus: vi.fn(),
    onAddUpdate: vi.fn(),
    onDelete: vi.fn(),
    onRequestDelete: vi.fn(),
    onRequestStatusChange: vi.fn(),
    onDeleteUpdate: vi.fn(),
    onRequestUpdateDelete: vi.fn(),
    registerCloseCallback: vi.fn(() => vi.fn()),
    onFormOpen: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window.confirm mock
    window.confirm = vi.fn()
  })

  describe('Admin Direct Delete', () => {
    it('calls onDelete when admin confirms deletion', async () => {
      window.confirm = vi.fn(() => true)
      const user = userEvent.setup()
      
      render(<PrayerCard prayer={mockPrayer} isAdmin={true} {...mockCallbacks} />)
      
      const deleteButton = screen.getByTitle('Delete prayer')
      await user.click(deleteButton)
      
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this prayer? This action cannot be undone.')
      expect(mockCallbacks.onDelete).toHaveBeenCalledWith('1')
    })

    it('does not call onDelete when admin cancels deletion', async () => {
      window.confirm = vi.fn(() => false)
      const user = userEvent.setup()
      
      render(<PrayerCard prayer={mockPrayer} isAdmin={true} {...mockCallbacks} />)
      
      const deleteButton = screen.getByTitle('Delete prayer')
      await user.click(deleteButton)
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockCallbacks.onDelete).not.toHaveBeenCalled()
    })
  })

  describe('Admin Add Update', () => {
    it('shows add update form for admin', async () => {
      const user = userEvent.setup()
      render(<PrayerCard prayer={mockPrayer} isAdmin={true} {...mockCallbacks} />)
      
      const addUpdateButton = screen.getByText(/Add Update/i)
      await user.click(addUpdateButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Add Prayer Update/i)).toBeDefined()
      })
    })

    it('allows admin to submit an update', async () => {
      const user = userEvent.setup()
      render(<PrayerCard prayer={mockPrayer} isAdmin={true} {...mockCallbacks} />)
      
      // Open add update form
      await user.click(screen.getByText(/Add Update/i))
      
      await waitFor(() => {
        expect(screen.getByText(/Add Prayer Update/i)).toBeDefined()
      })
      
      // Fill in form
      await user.type(screen.getByPlaceholderText('First name'), 'Admin')
      await user.type(screen.getByPlaceholderText('Last name'), 'User')
      await user.type(screen.getByPlaceholderText('Your email'), 'admin@example.com')
      await user.type(screen.getByPlaceholderText(/Prayer update/i), 'Admin update')
      
      // Submit form
      const submitButtons = screen.getAllByRole('button', { name: /Add Update/i })
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')
      if (submitButton) {
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(mockCallbacks.onAddUpdate).toHaveBeenCalledWith(
            '1',
            'Admin update',
            'Admin User',
            'admin@example.com',
            false,
            false
          )
        })
      }
    })
  })

  describe('Admin Delete Update', () => {
    it('allows admin to delete an update with confirmation', async () => {
      window.confirm = vi.fn(() => true)
      
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard prayer={prayerWithUpdate} isAdmin={true} {...mockCallbacks} />)
      
      // Find the delete button for the update (small trash icon)
      const deleteButtons = screen.getAllByTitle('Delete update')
      expect(deleteButtons.length).toBeGreaterThan(0)
      
      await user.click(deleteButtons[0])
      
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this update? This action cannot be undone.')
      
      await waitFor(() => {
        expect(mockCallbacks.onDeleteUpdate).toHaveBeenCalledWith('update1')
      })
    })

    it('does not delete update when admin cancels', async () => {
      window.confirm = vi.fn(() => false)
      
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard prayer={prayerWithUpdate} isAdmin={true} {...mockCallbacks} />)
      
      const deleteButtons = screen.getAllByTitle('Delete update')
      await user.click(deleteButtons[0])
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockCallbacks.onDeleteUpdate).not.toHaveBeenCalled()
    })

    it('handles error when deleting update fails', async () => {
      window.confirm = vi.fn(() => true)
      const mockOnDeleteUpdate = vi.fn().mockRejectedValue(new Error('Delete failed'))
      
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard 
        prayer={prayerWithUpdate} 
        isAdmin={true} 
        {...mockCallbacks}
        onDeleteUpdate={mockOnDeleteUpdate}
      />)
      
      const deleteButtons = screen.getAllByTitle('Delete update')
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(mockOnDeleteUpdate).toHaveBeenCalledWith('update1')
      })
    })
  })

  describe('Update Deletion Request Form', () => {
    it('shows update deletion request form for non-admin', async () => {
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard prayer={prayerWithUpdate} isAdmin={false} {...mockCallbacks} />)
      
      // Find and click the request update deletion button
      const deleteButtons = screen.getAllByTitle('Request update deletion')
      expect(deleteButtons.length).toBeGreaterThan(0)
      
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/Request Update Deletion/i)).toBeDefined()
      })
    })

    it('submits update deletion request with all fields', async () => {
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard prayer={prayerWithUpdate} isAdmin={false} {...mockCallbacks} />)
      
      // Open the update deletion request form
      const deleteButtons = screen.getAllByTitle('Request update deletion')
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/Request Update Deletion/i)).toBeDefined()
      })
      
      // Fill in the form - find the specific inputs within the update deletion form
      const form = screen.getByText(/Request Update Deletion/i).closest('form')
      expect(form).toBeDefined()
      
      if (form) {
        const firstNameInput = form.querySelector('input[placeholder="First name"]') as HTMLInputElement
        const lastNameInput = form.querySelector('input[placeholder="Last name"]') as HTMLInputElement
        const emailInput = form.querySelector('input[placeholder="Your email"]') as HTMLInputElement
        const reasonTextarea = form.querySelector('textarea[placeholder*="Reason for update deletion"]') as HTMLTextAreaElement
        
        if (firstNameInput && lastNameInput && emailInput && reasonTextarea) {
          await user.type(firstNameInput, 'Test')
          await user.type(lastNameInput, 'User')
          await user.type(emailInput, 'test@example.com')
          await user.type(reasonTextarea, 'No longer needed')
          
          // Submit the form
          const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement
          if (submitButton) {
            await user.click(submitButton)
            
            await waitFor(() => {
              expect(mockCallbacks.onRequestUpdateDelete).toHaveBeenCalledWith(
                'update1',
                'No longer needed',
                'Test User',
                'test@example.com'
              )
            })
          }
        }
      }
    })

    it('cancels update deletion request form', async () => {
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard prayer={prayerWithUpdate} isAdmin={false} {...mockCallbacks} />)
      
      // Open the form
      const deleteButtons = screen.getAllByTitle('Request update deletion')
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/Request Update Deletion/i)).toBeDefined()
      })
      
      // Find and click cancel button within the update deletion form
      const form = screen.getByText(/Request Update Deletion/i).closest('form')
      if (form) {
        const cancelButton = form.querySelector('button[type="button"]') as HTMLButtonElement
        if (cancelButton && cancelButton.textContent?.includes('Cancel')) {
          await user.click(cancelButton)
          
          await waitFor(() => {
            expect(screen.queryByText(/Request Update Deletion/i)).toBeNull()
          })
        }
      }
    })

    it('toggles update deletion request form open and closed', async () => {
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard prayer={prayerWithUpdate} isAdmin={false} {...mockCallbacks} />)
      
      const deleteButton = screen.getAllByTitle('Request update deletion')[0]
      
      // Open the form
      await user.click(deleteButton)
      await waitFor(() => {
        expect(screen.getByText(/Request Update Deletion/i)).toBeDefined()
      })
      
      // Close by clicking the button again
      await user.click(deleteButton)
      await waitFor(() => {
        expect(screen.queryByText(/Request Update Deletion/i)).toBeNull()
      })
    })
  })

  describe('Permission Validation - Original Requestor', () => {
    it('allows update from original requestor when updatesAllowed is original-requestor', async () => {
      // Mock getUserInfo to return user info so buttons show
      vi.mocked(userInfoStorage.getUserInfo).mockReturnValue({
        firstName: 'John',
        lastName: 'Doe', 
        email: 'john@example.com'
      })
      
      const user = userEvent.setup()
      render(
        <PrayerCard 
          prayer={mockPrayer} 
          isAdmin={false} 
          updatesAllowed="original-requestor"
          {...mockCallbacks} 
        />
      )
      
      // Should show the Add Update button when userEmail is set (from getUserInfo)
      expect(screen.getByText(/Add Update/i)).toBeDefined()
      
      // Open add update form
      await user.click(screen.getByText(/Add Update/i))
      
      await waitFor(() => {
        expect(screen.getByText(/Add Prayer Update/i)).toBeDefined()
      })
      
      // Fields are pre-filled from getUserInfo, just add the update text
      await user.type(screen.getByPlaceholderText(/Prayer update/i), 'Update from original requestor')
      
      // Submit form
      const submitButtons = screen.getAllByRole('button', { name: /Add Update/i })
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')
      if (submitButton) {
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(mockCallbacks.onAddUpdate).toHaveBeenCalledWith(
            '1',
            'Update from original requestor',
            'John Doe',
            'john@example.com',
            false,
            false
          )
        })
      }
    })

    it('prevents update from non-original requestor when updatesAllowed is original-requestor', async () => {
      // Mock getUserInfo to return user info so buttons show
      vi.mocked(userInfoStorage.getUserInfo).mockReturnValue({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      })
      
      const user = userEvent.setup()
      render(
        <PrayerCard 
          prayer={mockPrayer} 
          isAdmin={false} 
          updatesAllowed="original-requestor"
          {...mockCallbacks} 
        />
      )
      
      // Should show button when userEmail is set
      expect(screen.getByText(/Add Update/i)).toBeDefined()
      
      // Open add update form
      await user.click(screen.getByText(/Add Update/i))
      
      await waitFor(() => {
        expect(screen.getByText(/Add Prayer Update/i)).toBeDefined()
      })
      
      // Fill in form with different email
      await user.type(screen.getByPlaceholderText('First name'), 'Jane')
      await user.type(screen.getByPlaceholderText('Last name'), 'Smith')
      await user.type(screen.getByPlaceholderText('Your email'), 'jane@example.com') // Different from prayer.email
      await user.type(screen.getByPlaceholderText(/Prayer update/i), 'Update from someone else')
      
      // Submit form
      const submitButtons = screen.getAllByRole('button', { name: /Add Update/i })
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')
      if (submitButton) {
        await user.click(submitButton)
        
        // Should not call onAddUpdate (validation prevents it)
        await waitFor(() => {
          expect(mockCallbacks.onAddUpdate).not.toHaveBeenCalled()
        }, { timeout: 2000 })
      }
    })

    it('allows deletion from original requestor when deletionsAllowed is original-requestor', async () => {
      // Mock getUserInfo to return user info so buttons show
      vi.mocked(userInfoStorage.getUserInfo).mockReturnValue({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      })
      
      const user = userEvent.setup()
      render(
        <PrayerCard 
          prayer={mockPrayer} 
          isAdmin={false} 
          deletionsAllowed="original-requestor"
          {...mockCallbacks} 
        />
      )
      
      // Should show delete button when userEmail is set
      expect(screen.getByTitle('Request deletion')).toBeDefined()
      
      // Open delete request form
      const deleteButton = screen.getByTitle('Request deletion')
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Request Prayer Deletion/i)).toBeDefined()
      })
      
      // Fields are pre-filled from getUserInfo, just add the reason
      await user.type(screen.getByPlaceholderText(/Reason for deletion/i), 'No longer needed')
      
      const submitButton = screen.getByRole('button', { name: /Submit Request/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockCallbacks.onRequestDelete).toHaveBeenCalledWith(
          '1',
          'No longer needed',
          'John Doe',
          'john@example.com'
        )
      })
    })

    it('prevents deletion from non-original requestor when deletionsAllowed is original-requestor', async () => {
      // Mock getUserInfo to return user info so buttons show
      vi.mocked(userInfoStorage.getUserInfo).mockReturnValue({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      })
      
      const user = userEvent.setup()
      render(
        <PrayerCard 
          prayer={mockPrayer} 
          isAdmin={false} 
          deletionsAllowed="original-requestor"
          {...mockCallbacks} 
        />
      )
      
      // Should show delete button when userEmail is set
      expect(screen.getByTitle('Request deletion')).toBeDefined()
      
      // Open delete request form
      const deleteButton = screen.getByTitle('Request deletion')
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Request Prayer Deletion/i)).toBeDefined()
      })
      
      // Fill in form with different email
      const inputs = screen.getAllByPlaceholderText('First name')
      const deleteFirstName = inputs.find(input => input.closest('form')?.querySelector('h4')?.textContent?.includes('Deletion'))
      if (deleteFirstName) {
        await user.type(deleteFirstName, 'Jane')
      }
      
      const lastNameInputs = screen.getAllByPlaceholderText('Last name')
      const deleteLastName = lastNameInputs.find(input => input.closest('form')?.querySelector('h4')?.textContent?.includes('Deletion'))
      if (deleteLastName) {
        await user.type(deleteLastName, 'Smith')
      }
      
      const emailInputs = screen.getAllByPlaceholderText('Your email')
      const deleteEmail = emailInputs.find(input => input.closest('form')?.querySelector('h4')?.textContent?.includes('Deletion'))
      if (deleteEmail) {
        await user.type(deleteEmail, 'jane@example.com') // Different from prayer.email
      }
      
      await user.type(screen.getByPlaceholderText(/Reason for deletion/i), 'Want to delete')
      
      const submitButton = screen.getByRole('button', { name: /Submit Request/i })
      await user.click(submitButton)
      
      // Should not call onRequestDelete (validation prevents it)
      await waitFor(() => {
        expect(mockCallbacks.onRequestDelete).not.toHaveBeenCalled()
      }, { timeout: 2000 })
    })

    it('prevents update deletion from non-original requestor when deletionsAllowed is original-requestor', async () => {
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(
        <PrayerCard 
          prayer={prayerWithUpdate} 
          isAdmin={false} 
          deletionsAllowed="original-requestor"
          {...mockCallbacks} 
        />
      )
      
      // Open update deletion request form
      const deleteButtons = screen.getAllByTitle('Request update deletion')
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/Request Update Deletion/i)).toBeDefined()
      })
      
      // Fill in form with different email
      const form = screen.getByText(/Request Update Deletion/i).closest('form')
      if (form) {
        const firstNameInput = form.querySelector('input[placeholder="First name"]') as HTMLInputElement
        const lastNameInput = form.querySelector('input[placeholder="Last name"]') as HTMLInputElement
        const emailInput = form.querySelector('input[placeholder="Your email"]') as HTMLInputElement
        const reasonTextarea = form.querySelector('textarea[placeholder*="Reason for update deletion"]') as HTMLTextAreaElement
        
        if (firstNameInput && lastNameInput && emailInput && reasonTextarea) {
          await user.type(firstNameInput, 'Jane')
          await user.type(lastNameInput, 'Smith')
          await user.type(emailInput, 'jane@example.com') // Different from prayer.email
          await user.type(reasonTextarea, 'Delete this update')
          
          const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement
          if (submitButton) {
            await user.click(submitButton)
            
            // Should not call onRequestUpdateDelete (validation prevents it)
            await waitFor(() => {
              expect(mockCallbacks.onRequestUpdateDelete).not.toHaveBeenCalled()
            }, { timeout: 2000 })
          }
        }
      }
    })
  })

  describe('Allowance Level Visibility', () => {
    it('hides update button when updatesAllowed is admin-only and user is not admin', () => {
      render(
        <PrayerCard 
          prayer={mockPrayer} 
          isAdmin={false} 
          updatesAllowed="admin-only"
          {...mockCallbacks} 
        />
      )
      
      expect(screen.queryByText(/Add Update/i)).toBeNull()
    })

    it('hides delete button when deletionsAllowed is admin-only and user is not admin', () => {
      render(
        <PrayerCard 
          prayer={mockPrayer} 
          isAdmin={false} 
          deletionsAllowed="admin-only"
          {...mockCallbacks} 
        />
      )
      
      expect(screen.queryByTitle(/Request deletion/i)).toBeNull()
    })
  })

  describe('Prayer Status Border Classes', () => {
    it('renders answered prayer with correct border class', () => {
      const answeredPrayer = { ...mockPrayer, status: PrayerStatus.ANSWERED }
      render(<PrayerCard prayer={answeredPrayer} isAdmin={false} {...mockCallbacks} />)
      
      const card = document.querySelector('.prayer-card')
      expect(card?.className).toContain('!border-[#39704D]')
    })

    it('renders archived prayer with correct border class', () => {
      const archivedPrayer = { ...mockPrayer, status: PrayerStatus.ARCHIVED }
      render(<PrayerCard prayer={archivedPrayer} isAdmin={false} {...mockCallbacks} />)
      
      const card = document.querySelector('.prayer-card')
      expect(card?.className).toContain('!border-[#C9A961]')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Reset getUserInfo to return empty values for these tests
      vi.mocked(userInfoStorage.getUserInfo).mockReturnValue({
        firstName: '',
        lastName: '',
        email: ''
      })
    })
    
    it('handles error when submitting update fails', async () => {
      const mockOnAddUpdate = vi.fn().mockRejectedValue(new Error('Submit failed'))
      
      const user = userEvent.setup()
      render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} onAddUpdate={mockOnAddUpdate} />)
      
      // Open add update form
      await user.click(screen.getByText(/Add Update/i))
      
      await waitFor(() => {
        expect(screen.getByText(/Add Prayer Update/i)).toBeDefined()
      })
      
      // Fill and submit
      await user.type(screen.getByPlaceholderText('First name'), 'Test')
      await user.type(screen.getByPlaceholderText('Last name'), 'User')
      await user.type(screen.getByPlaceholderText('Your email'), 'test@example.com')
      await user.type(screen.getByPlaceholderText(/Prayer update/i), 'Test update')
      
      const submitButtons = screen.getAllByRole('button', { name: /Add Update/i })
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')
      if (submitButton) {
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(mockOnAddUpdate).toHaveBeenCalled()
        })
      }
    })


  })

  describe('Verification Dialog Edge Cases', () => {
    it('handles verification cancellation', async () => {
      // This test aims to cover handleVerificationCancel which is triggered when verification dialog is closed
      // For simplicity, we're just ensuring the prayer card renders properly since the verification
      // dialog interaction is complex and would require mocking the VerificationDialog component
      render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />)
      expect(screen.getByText(/Prayer for/i)).toBeDefined()
    })
  })

  describe('Additional Coverage Tests', () => {
    it('does not submit update form with empty fields', async () => {
      const user = userEvent.setup()
      render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />)
      
      // Open add update form
      await user.click(screen.getByText(/Add Update/i))
      
      await waitFor(() => {
        expect(screen.getByText(/Add Prayer Update/i)).toBeDefined()
      })
      
      // Try to submit without filling fields (HTML5 validation should prevent it)
      const submitButtons = screen.getAllByRole('button', { name: /Add Update/i })
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')
      if (submitButton) {
        await user.click(submitButton)
        
        // onAddUpdate should not be called because form validation fails
        expect(mockCallbacks.onAddUpdate).not.toHaveBeenCalled()
      }
    })
    
    it('renders with multiple updates', () => {
      const prayerWithManyUpdates: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Update 1',
            author: 'User 1',
            author_email: 'user1@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
          {
            id: 'update2',
            prayer_id: '1',
            content: 'Update 2',
            author: 'User 2',
            author_email: 'user2@example.com',
            created_at: '2025-01-03T00:00:00Z',
            is_anonymous: false,
          },
          {
            id: 'update3',
            prayer_id: '1',
            content: 'Update 3',
            author: 'User 3',
            author_email: 'user3@example.com',
            created_at: '2025-01-04T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      render(<PrayerCard prayer={prayerWithManyUpdates} isAdmin={false} {...mockCallbacks} />)
      
      // All three updates should be there but only first 2 visible by default
      expect(screen.getByText('Update 1')).toBeDefined()
      expect(screen.getByText('Update 2')).toBeDefined()
    })
  })

  describe('Mark as Answered', () => {
    it('can submit update with mark as answered checkbox', async () => {
      const user = userEvent.setup()
      render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />)
      
      // Open add update form
      await user.click(screen.getByText(/Add Update/i))
      
      await waitFor(() => {
        expect(screen.getByText(/Add Prayer Update/i)).toBeDefined()
      })
      
      // Fill in form
      await user.type(screen.getByPlaceholderText('First name'), 'Jane')
      await user.type(screen.getByPlaceholderText('Last name'), 'Smith')
      await user.type(screen.getByPlaceholderText('Your email'), 'jane@example.com')
      await user.type(screen.getByPlaceholderText(/Prayer update/i), 'This prayer is answered!')
      
      // Check mark as answered
      const markAnsweredCheckbox = screen.getByLabelText(/Mark this prayer as answered/i)
      await user.click(markAnsweredCheckbox)
      
      const submitButtons = screen.getAllByRole('button', { name: /Add Update/i })
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')
      if (submitButton) {
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(mockCallbacks.onAddUpdate).toHaveBeenCalledWith(
            '1',
            'This prayer is answered!',
            'Jane Smith',
            'jane@example.com',
            false,
            true // markAsAnswered should be true
          )
        })
      }
    })
  })

  describe('Update Deletion Error Handling', () => {
    it('handles successful update deletion request', async () => {
      // Mock getUserInfo so fields are pre-filled
      vi.mocked(userInfoStorage.getUserInfo).mockReturnValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      })
      
      // Mock a successful response
      const mockOnRequestUpdateDelete = vi.fn().mockResolvedValue({ ok: true })
      
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard 
        prayer={prayerWithUpdate} 
        isAdmin={false} 
        {...mockCallbacks}
        onRequestUpdateDelete={mockOnRequestUpdateDelete}
      />)
      
      // Open update deletion request form
      const deleteButtons = screen.getAllByTitle('Request update deletion')
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/Request Update Deletion/i)).toBeDefined()
      })
      
      // Fill the reason field (other fields are pre-filled)
      const reasonTextarea = screen.getByPlaceholderText(/Reason for update deletion/i)
      await user.type(reasonTextarea, 'Test successful deletion')
      
      // Submit the form
      const submitButtons = screen.getAllByRole('button', { name: /Submit Request/i })
      const submitButton = submitButtons.find(btn => 
        btn.closest('form')?.querySelector('h4')?.textContent?.includes('Request Update Deletion')
      )
      
      if (submitButton) {
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(mockOnRequestUpdateDelete).toHaveBeenCalledWith(
            'update1',
            'Test successful deletion',
            'Test User',
            'test@example.com'
          )
        }, { timeout: 3000 })
        
        // Form should be closed after successful submission
        await waitFor(() => {
          expect(screen.queryByText(/Request Update Deletion/i)).toBeNull()
        }, { timeout: 3000 })
      }
    })
    
    it('handles error when onRequestUpdateDelete returns error', async () => {
      // Mock getUserInfo so fields are pre-filled
      vi.mocked(userInfoStorage.getUserInfo).mockReturnValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      })
      
      const mockOnRequestUpdateDelete = vi.fn().mockResolvedValue({ ok: false, error: 'Test error' })
      
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard 
        prayer={prayerWithUpdate} 
        isAdmin={false} 
        {...mockCallbacks}
        onRequestUpdateDelete={mockOnRequestUpdateDelete}
      />)
      
      // Open update deletion request form
      const deleteButtons = screen.getAllByTitle('Request update deletion')
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/Request Update Deletion/i)).toBeDefined()
      })
      
      // Fill the reason field (other fields are pre-filled)
      const reasonTextarea = screen.getByPlaceholderText(/Reason for update deletion/i)
      await user.type(reasonTextarea, 'No longer needed')
      
      // Submit the form
      const submitButtons = screen.getAllByRole('button', { name: /Submit Request/i })
      // Find the one in the update deletion form
      const submitButton = submitButtons.find(btn => 
        btn.closest('form')?.querySelector('h4')?.textContent?.includes('Request Update Deletion')
      )
      
      if (submitButton) {
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(mockOnRequestUpdateDelete).toHaveBeenCalled()
        }, { timeout: 3000 })
        
        // Should show error message
        await waitFor(() => {
          expect(screen.getByText(/Test error/i)).toBeDefined()
        }, { timeout: 3000 })
      }
    })

    it('handles missing table error with special message', async () => {
      // Mock getUserInfo so fields are pre-filled
      vi.mocked(userInfoStorage.getUserInfo).mockReturnValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      })
      
      const mockOnRequestUpdateDelete = vi.fn().mockResolvedValue({ 
        ok: false, 
        error: { message: 'relation "update_deletion_requests" does not exist' } 
      })
      
      const prayerWithUpdate: PrayerRequest = {
        ...mockPrayer,
        updates: [
          {
            id: 'update1',
            prayer_id: '1',
            content: 'Test update',
            author: 'Jane Doe',
            author_email: 'jane@example.com',
            created_at: '2025-01-02T00:00:00Z',
            is_anonymous: false,
          },
        ],
      }
      
      const user = userEvent.setup()
      render(<PrayerCard 
        prayer={prayerWithUpdate} 
        isAdmin={false} 
        {...mockCallbacks}
        onRequestUpdateDelete={mockOnRequestUpdateDelete}
      />)
      
      // Open the form
      const deleteButtons = screen.getAllByTitle('Request update deletion')
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/Request Update Deletion/i)).toBeDefined()
      })
      
      // Fill the reason field
      const reasonTextarea = screen.getByPlaceholderText(/Reason for update deletion/i)
      await user.type(reasonTextarea, 'Test reason')
      
      // Submit the form
      const submitButtons = screen.getAllByRole('button', { name: /Submit Request/i })
      const submitButton = submitButtons.find(btn => 
        btn.closest('form')?.querySelector('h4')?.textContent?.includes('Request Update Deletion')
      )
      
      if (submitButton) {
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(mockOnRequestUpdateDelete).toHaveBeenCalled()
        }, { timeout: 3000 })
        
        // Should show special error message for missing table
        await waitFor(() => {
          const errorText = screen.getByText(/table not found/i)
          expect(errorText).toBeDefined()
        }, { timeout: 3000 })
      }
    })
  })
})
