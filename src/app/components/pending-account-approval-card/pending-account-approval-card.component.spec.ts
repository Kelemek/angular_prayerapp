import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { PendingAccountApprovalCardComponent, AccountApprovalRequest } from './pending-account-approval-card.component';
import { SupabaseService } from '../../services/supabase.service';
import * as planningCenter from '../../../lib/planning-center';

describe('PendingAccountApprovalCardComponent', () => {
  const mockRequest: AccountApprovalRequest = {
    id: '123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    approval_status: 'pending',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
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
    const { fixture } = await render(PendingAccountApprovalCardComponent, {
      componentProperties: {
        request: mockRequest
      },
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    });

    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should initialize with default state values', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.isApproving).toBe(false);
      expect(fixture.componentInstance.isDenying).toBe(false);
      expect(fixture.componentInstance.isDenyingInProgress).toBe(false);
      expect(fixture.componentInstance.denialReason).toBe('');
    });

    it('should call lookupPlanningCenterPerson on init', async () => {
      const lookupSpy = vi.spyOn(planningCenter, 'lookupPersonByEmail').mockResolvedValue({
        people: [],
        error: null
      });

      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
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

  describe('request display', () => {
    it('should display user full name', async () => {
      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('should display email', async () => {
      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText(/Email: test@example.com/)).toBeTruthy();
    });

    it('should display pending badge', async () => {
      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Pending')).toBeTruthy();
    });

    it('should display formatted request date', async () => {
      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText(/Requested:/)).toBeTruthy();
    });
  });

  describe('Planning Center verification', () => {
    it('should not lookup Planning Center when email is missing', async () => {
      const noEmailRequest = { ...mockRequest, email: '' };
      const lookupSpy = vi.spyOn(planningCenter, 'lookupPersonByEmail');

      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: noEmailRequest
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

      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      await waitFor(() => {
        expect(lookupSpy).toHaveBeenCalledWith(
          mockRequest.email,
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

      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
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

      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
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

      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
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

      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
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
      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Approve')).toBeTruthy();
    });

    it('should emit approve event with request id when approved', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
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
      expect(fixture.componentInstance.isApproving).toBe(true);
    });

    it('should not emit approve event when already approving', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const approveSpy = vi.fn();
      fixture.componentInstance.approve.subscribe(approveSpy);

      // Set isApproving to true
      fixture.componentInstance.isApproving = true;

      fixture.componentInstance.handleApprove();

      expect(approveSpy).not.toHaveBeenCalled();
    });

    it('should disable approve button while approving', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const approveButton = screen.getByText('Approve') as HTMLButtonElement;
      await user.click(approveButton);

      // isApproving should be set
      expect(fixture.componentInstance.isApproving).toBe(true);
    });
  });

  describe('deny functionality', () => {
    it('should show deny button', async () => {
      await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(screen.getByText('Deny')).toBeTruthy();
    });

    it('should show denial form when deny button clicked', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denyButton = screen.getByText('Deny');
      await user.click(denyButton);

      expect(fixture.componentInstance.isDenying).toBe(true);
      expect(screen.getByText('Reason for denial (optional)')).toBeTruthy();
      expect(screen.getByText('Confirm Denial')).toBeTruthy();
    });

    it('should allow confirm denial with empty reason', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denyButton = screen.getByText('Deny');
      await user.click(denyButton);

      const confirmButton = screen.getByText('Confirm Denial') as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(false);
    });

    it('should emit deny event with id and trimmed reason when confirmed', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denySpy = vi.fn();
      fixture.componentInstance.deny.subscribe(denySpy);

      fixture.componentInstance.denialReason = '  Some reason  ';
      fixture.componentInstance.handleDeny();

      expect(denySpy).toHaveBeenCalledWith({
        id: '123',
        reason: 'Some reason'
      });
      expect(fixture.componentInstance.isDenyingInProgress).toBe(true);
    });

    it('should emit deny event with empty string when no reason', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denySpy = vi.fn();
      fixture.componentInstance.deny.subscribe(denySpy);

      fixture.componentInstance.denialReason = '';
      fixture.componentInstance.handleDeny();

      expect(denySpy).toHaveBeenCalledWith({
        id: '123',
        reason: ''
      });
    });

    it('should not emit deny event when already denying', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const denySpy = vi.fn();
      fixture.componentInstance.deny.subscribe(denySpy);

      fixture.componentInstance.isDenyingInProgress = true;
      fixture.componentInstance.handleDeny();

      expect(denySpy).not.toHaveBeenCalled();
    });

    it('should cancel denial and reset reason', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
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
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const formatted = fixture.componentInstance.formatDate('2024-01-15T14:30:00Z');
      expect(formatted).toMatch(/Jan 15, 2024/);
    });

    it('should handle different date formats', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const formatted = fixture.componentInstance.formatDate('2023-12-25T00:00:00Z');
      expect(formatted).toBeTruthy();
    });
  });

  describe('formatPersonName method', () => {
    it('should format person name correctly', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
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

    it('should handle null person', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      const formatted = fixture.componentInstance.formatPersonName(null);
      expect(formatted).toBe('');
    });
  });

  describe('event emitters', () => {
    it('should have approve event emitter', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.approve).toBeTruthy();
    });

    it('should have deny event emitter', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.deny).toBeTruthy();
    });
  });

  describe('input property bindings', () => {
    it('should accept and use request input', async () => {
      const { fixture } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.request).toEqual(mockRequest);
    });

    it('should update when request changes', async () => {
      const { fixture, rerender } = await render(PendingAccountApprovalCardComponent, {
        componentProperties: {
          request: mockRequest
        },
        providers: [
          { provide: SupabaseService, useValue: mockSupabaseService }
        ]
      });

      expect(fixture.componentInstance.request).toEqual(mockRequest);

      const newRequest = { ...mockRequest, first_name: 'Jane' };
      await rerender({
        componentProperties: {
          request: newRequest
        }
      });

      expect(fixture.componentInstance.request).toEqual(newRequest);
    });
  });
});
