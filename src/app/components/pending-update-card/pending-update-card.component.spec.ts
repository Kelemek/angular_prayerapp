import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { PendingUpdateCardComponent } from './pending-update-card.component';
import { PrayerUpdate } from '../../types/prayer';
import { SupabaseService } from '../../services/supabase.service';
import * as planningCenter from '../../../lib/planning-center';

describe('PendingUpdateCardComponent', () => {
  const mockUpdate: PrayerUpdate = {
    id: '123',
    prayer_id: 'prayer-456',
    content: 'Test update content',
    author: 'John Doe',
    author_email: 'test@example.com',
    mark_as_answered: false,
    created_at: '2024-01-01T00:00:00Z'
  };

  const mockSupabaseService = {
    getClient: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the lookupPersonByEmail function
    vi.spyOn(planningCenter, 'lookupPersonByEmail').mockResolvedValue({
      people: [],
      error: null
    });
  });

  it('should create', async () => {
    const { fixture } = await render(PendingUpdateCardComponent, {
      componentProperties: {
        update: mockUpdate
      },
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    });

    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should initialize with default state values', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.isApproving).toBe(false);
      expect(fixture.componentInstance.isEditing).toBe(false);
      expect(fixture.componentInstance.isDenying).toBe(false);
      expect(fixture.componentInstance.isDenyingInProgress).toBe(false);
      expect(fixture.componentInstance.denialReason).toBe('');
    });

    it('should call resetEditedUpdate on init', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.editedUpdate.content).toBe(mockUpdate.content);
      expect(fixture.componentInstance.editedUpdate.author).toBe(mockUpdate.author);
    });

    it('should call lookupPlanningCenterPerson on init', async () => {
      const lookupSpy = vi.spyOn(planningCenter, 'lookupPersonByEmail').mockResolvedValue({
        people: [],
        error: null
      });

      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      await waitFor(() => {
        expect(lookupSpy).toHaveBeenCalled();
      });
    });
  });

  describe('update display', () => {
    it('should display update content', async () => {
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Test update content')).toBeTruthy();
    });

    it('should display author name', async () => {
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText(/By John Doe/)).toBeTruthy();
    });

    it('should display author email when present', async () => {
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText(/Email: test@example.com/)).toBeTruthy();
    });

    it('should display mark as answered badge when true', async () => {
      const answeredUpdate = { ...mockUpdate, mark_as_answered: true };
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: answeredUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText(/Will mark prayer as answered/)).toBeTruthy();
    });

    it('should not display mark as answered badge when false', async () => {
      const { container } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const badge = screen.queryByText(/Will mark prayer as answered/);
      expect(badge).toBeNull();
    });

    it('should display pending badge', async () => {
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Pending')).toBeTruthy();
    });

    it('should display Prayer Update heading', async () => {
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Prayer Update')).toBeTruthy();
    });
  });

  describe('Planning Center verification', () => {
    it('should not lookup Planning Center when email is missing', async () => {
      const noEmailUpdate = { ...mockUpdate, author_email: '' };
      const lookupSpy = vi.spyOn(planningCenter, 'lookupPersonByEmail');

      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: noEmailUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(lookupSpy).not.toHaveBeenCalled();
    });

    it('should lookup Planning Center with email', async () => {
      const lookupSpy = vi.spyOn(planningCenter, 'lookupPersonByEmail').mockResolvedValue({
        people: [],
        error: null
      });

      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      await waitFor(() => {
        expect(lookupSpy).toHaveBeenCalledWith(
          mockUpdate.author_email,
          expect.any(String),
          expect.any(String)
        );
      });
    });

    it('should set pcPerson when person found', async () => {
      const mockPerson = {
        id: '1',
        attributes: {
          first_name: 'John',
          last_name: 'Doe'
        }
      };
      vi.spyOn(planningCenter, 'lookupPersonByEmail').mockResolvedValue({
        people: [mockPerson],
        error: null
      });

      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      await waitFor(() => {
        expect(fixture.componentInstance.pcPerson).toEqual(mockPerson);
        expect(fixture.componentInstance.pcLoading).toBe(false);
      });
    });

    it('should keep pcPerson null when not found', async () => {
      vi.spyOn(planningCenter, 'lookupPersonByEmail').mockResolvedValue({
        people: [],
        error: null
      });

      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      await waitFor(() => {
        expect(fixture.componentInstance.pcPerson).toBeNull();
        expect(fixture.componentInstance.pcLoading).toBe(false);
      });
    });

    it('should set pcError when lookup fails', async () => {
      vi.spyOn(planningCenter, 'lookupPersonByEmail').mockResolvedValue({
        people: [],
        error: 'API Error'
      });

      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      await waitFor(() => {
        expect(fixture.componentInstance.pcError).toBe(true);
        expect(fixture.componentInstance.pcLoading).toBe(false);
      });
    });

    it('should handle lookup exception', async () => {
      vi.spyOn(planningCenter, 'lookupPersonByEmail').mockRejectedValue(new Error('Network error'));

      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      await waitFor(() => {
        expect(fixture.componentInstance.pcError).toBe(true);
        expect(fixture.componentInstance.pcLoading).toBe(false);
      });
    });
  });

  describe('approve functionality', () => {
    it('should show approve button', async () => {
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Approve')).toBeTruthy();
    });

    it('should emit approve event with update id when approved', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const approveSpy = vi.fn();
      fixture.componentInstance.approve.subscribe(approveSpy);

      const approveButton = screen.getByText('Approve');
      await user.click(approveButton);

      expect(approveSpy).toHaveBeenCalledWith('123');
    });

    it('should set isApproving to true and back to false', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.isApproving).toBe(false);

      await fixture.componentInstance.handleApprove();

      expect(fixture.componentInstance.isApproving).toBe(false); // Resets immediately
    });
  });

  describe('edit functionality', () => {
    it('should show edit button', async () => {
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Edit')).toBeTruthy();
    });

    it('should enter edit mode when edit button clicked', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      expect(fixture.componentInstance.isEditing).toBe(true);
      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('should display edit form with current values', async () => {
      const user = userEvent.setup();
      const { container } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      const textarea = container.querySelector('textarea');
      const input = container.querySelector('input');

      expect(textarea?.value).toBe('Test update content');
      expect(input?.value).toBe('John Doe');
    });

    it('should emit edit event with updates when saved', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const editSpy = vi.fn();
      fixture.componentInstance.edit.subscribe(editSpy);

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Modify values
      fixture.componentInstance.editedUpdate.content = 'Updated content';
      fixture.componentInstance.editedUpdate.author = 'Jane Doe';

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(editSpy).toHaveBeenCalledWith({
        id: '123',
        updates: {
          content: 'Updated content',
          author: 'Jane Doe'
        }
      });
      expect(fixture.componentInstance.isEditing).toBe(false);
    });

    it('should cancel editing and reset values', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Modify values
      fixture.componentInstance.editedUpdate.content = 'Changed';

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(fixture.componentInstance.isEditing).toBe(false);
      expect(fixture.componentInstance.editedUpdate.content).toBe(mockUpdate.content);
    });
  });

  describe('deny functionality', () => {
    it('should show deny button', async () => {
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Deny')).toBeTruthy();
    });

    it('should show denial form when deny button clicked', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denyButton = screen.getByText('Deny');
      await user.click(denyButton);

      expect(fixture.componentInstance.isDenying).toBe(true);
      expect(screen.getByText('Reason for denial (required)')).toBeTruthy();
      expect(screen.getByText('Confirm Denial')).toBeTruthy();
    });

    it('should disable confirm button when denial reason is empty', async () => {
      const user = userEvent.setup();
      await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denyButton = screen.getByText('Deny');
      await user.click(denyButton);

      const confirmButton = screen.getByText('Confirm Denial') as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(true);
    });

    it('should enable confirm button when denial reason is provided', async () => {
      const user = userEvent.setup();
      const { fixture, container } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denyButton = screen.getByText('Deny');
      await user.click(denyButton);

      // Type into the textarea to properly trigger change detection
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await user.type(textarea, 'Invalid update');

      const confirmButton = screen.getByText('Confirm Denial') as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(false);
    });

    it('should not emit deny event when reason is empty', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denySpy = vi.fn();
      fixture.componentInstance.deny.subscribe(denySpy);

      fixture.componentInstance.denialReason = '';
      await fixture.componentInstance.handleDeny();

      expect(denySpy).not.toHaveBeenCalled();
    });

    it('should emit deny event with id and reason when confirmed', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denySpy = vi.fn();
      fixture.componentInstance.deny.subscribe(denySpy);

      fixture.componentInstance.denialReason = 'Inappropriate content';
      await fixture.componentInstance.handleDeny();

      expect(denySpy).toHaveBeenCalledWith({
        id: '123',
        reason: 'Inappropriate content'
      });
      expect(fixture.componentInstance.isDenying).toBe(false);
      expect(fixture.componentInstance.denialReason).toBe('');
    });

    it('should cancel denial and reset reason', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denyButton = screen.getByText('Deny');
      await user.click(denyButton);

      fixture.componentInstance.denialReason = 'Some reason';
      fixture.detectChanges();

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(fixture.componentInstance.isDenying).toBe(false);
      expect(fixture.componentInstance.denialReason).toBe('');
    });
  });

  describe('formatDate method', () => {
    it('should format date correctly', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const formatted = fixture.componentInstance.formatDate('2024-01-15T14:30:00Z');
      expect(formatted).toMatch(/Jan 15, 2024/);
    });
  });

  describe('formatPersonName method', () => {
    it('should format person name correctly', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const mockPerson = {
        id: '1',
        attributes: {
          first_name: 'John',
          last_name: 'Smith'
        }
      };

      const formatted = fixture.componentInstance.formatPersonName(mockPerson);
      expect(formatted).toBeTruthy();
    });
  });

  describe('resetEditedUpdate method', () => {
    it('should reset edited update to original values', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      fixture.componentInstance.editedUpdate.content = 'Changed';
      fixture.componentInstance.editedUpdate.author = 'Changed';
      fixture.componentInstance.resetEditedUpdate();

      expect(fixture.componentInstance.editedUpdate.content).toBe(mockUpdate.content);
      expect(fixture.componentInstance.editedUpdate.author).toBe(mockUpdate.author);
    });
  });

  describe('event emitters', () => {
    it('should have approve event emitter', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.approve).toBeTruthy();
    });

    it('should have deny event emitter', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.deny).toBeTruthy();
    });

    it('should have edit event emitter', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.edit).toBeTruthy();
    });
  });

  describe('input property bindings', () => {
    it('should accept and use update input', async () => {
      const { fixture } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.update).toEqual(mockUpdate);
    });

    it('should update when update changes', async () => {
      const { fixture, rerender } = await render(PendingUpdateCardComponent, {
        componentProperties: {
          update: mockUpdate
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.update).toEqual(mockUpdate);

      const newUpdate = { ...mockUpdate, content: 'New content' };
      await rerender({
        componentProperties: {
          update: newUpdate
        }
      });

      expect(fixture.componentInstance.update).toEqual(newUpdate);
    });
  });
});
