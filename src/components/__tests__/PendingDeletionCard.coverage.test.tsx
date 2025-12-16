import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PendingDeletionCard } from '../PendingDeletionCard';
import type { DeletionRequest } from '../../types/prayer';

// Mock the planning center lookup
vi.mock('../../lib/planningcenter', () => ({
  lookupPersonByEmail: vi.fn(),
  formatPersonName: vi.fn((person) => person?.attributes?.name || 'Unknown')
}));

import { lookupPersonByEmail } from '../../lib/planningcenter';

vi.mock('../DeletionStyleCard', () => ({
  DeletionStyleCard: ({ title, subtitle, content, metaLeft, metaRight, reason, actions }: {
    title: string;
    subtitle: string;
    content: React.ReactNode;
    metaLeft: React.ReactNode;
    metaRight: React.ReactNode;
    reason: string;
    actions: React.ReactNode;
  }) => (
    <div data-testid="deletion-style-card">
      <h3>{title}</h3>
      <div>{subtitle}</div>
      <div>{content}</div>
      <div data-testid="meta-left">{metaLeft}</div>
      <div data-testid="meta-right">{metaRight}</div>
      <div data-testid="reason">{reason}</div>
      <div data-testid="actions">{actions}</div>
    </div>
  )
}));

describe('PendingDeletionCard - Coverage Tests', () => {
  const mockDeletionRequest: DeletionRequest & { prayer_title?: string } = {
    id: 'deletion-1',
    prayer_id: 'prayer-1',
    prayer_title: 'Test Prayer Title',
    requested_by: 'user@test.com',
    requested_email: 'user@test.com',
    reason: 'Prayer request is no longer needed',
    approval_status: 'pending',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  };

  const mockOnApprove = vi.fn();
  const mockOnDeny = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Planning Center Lookup', () => {
    it('shows loading state while looking up Planning Center', async () => {
      // Mock a slow lookup
      let resolvePromise: any;
      const lookupPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (lookupPersonByEmail as any).mockReturnValue(lookupPromise);

      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      // Should show loading message
      await waitFor(() => {
        expect(screen.getByText('Checking Planning Center...')).toBeDefined();
      });

      // Resolve the promise
      resolvePromise({ people: [], count: 0 });
    });

    it('shows Planning Center person when found', async () => {
      (lookupPersonByEmail as any).mockResolvedValue({
        people: [{
          id: 'pc-person-1',
          type: 'person',
          attributes: {
            first_name: 'John',
            last_name: 'Doe',
            name: 'John Doe',
            avatar: '',
            status: 'active',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }
        }],
        count: 1
      });

      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      // Should show Planning Center person
      await waitFor(() => {
        expect(screen.getByText('Planning Center: John Doe')).toBeDefined();
      });
    });

    it('shows "Not in Planning Center" when person not found', async () => {
      (lookupPersonByEmail as any).mockResolvedValue({
        people: [],
        count: 0
      });

      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      // Should show not found message
      await waitFor(() => {
        expect(screen.getByText('Not in Planning Center')).toBeDefined();
      });
    });

    it('shows error message when Planning Center lookup fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (lookupPersonByEmail as any).mockRejectedValue(new Error('PC API error'));

      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('(PC lookup failed)')).toBeDefined();
      });

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error looking up Planning Center person:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('does not attempt Planning Center lookup when email is missing', async () => {
      const requestWithoutEmail = { 
        ...mockDeletionRequest, 
        requested_email: '' 
      };

      render(
        <PendingDeletionCard
          deletionRequest={requestWithoutEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      // Should not call lookupPersonByEmail
      await waitFor(() => {
        expect(lookupPersonByEmail).not.toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('displays email when provided without Planning Center lookup result', async () => {
      (lookupPersonByEmail as any).mockResolvedValue({
        people: [],
        count: 0
      });

      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Email: user@test.com')).toBeDefined();
    });
  });

  describe('Email Display', () => {
    it('does not display email section when requested_email is not provided', () => {
      const requestWithoutEmail = {
        ...mockDeletionRequest,
        requested_email: ''
      };

      render(
        <PendingDeletionCard
          deletionRequest={requestWithoutEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      // Should not display email section
      expect(screen.queryByText(/Email:/)).toBeNull();
    });

    it('displays MessageSquare icon when email is provided', async () => {
      (lookupPersonByEmail as any).mockResolvedValue({
        people: [],
        count: 0
      });

      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      await waitFor(() => {
        const messageIcon = document.querySelector('.lucide-message-square');
        expect(messageIcon).toBeDefined();
      });
    });
  });
});
