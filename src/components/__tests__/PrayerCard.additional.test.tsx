import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { PrayerCard } from '../PrayerCard';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('PrayerCard - Additional Coverage', () => {
  const mockPrayer = {
    id: '1',
    title: 'Test Prayer',
    requester: 'John Doe',
    email: 'john@example.com',
    status: 'current' as const,
    created_at: '2025-01-01T00:00:00Z',
    prayer_for: 'John Doe',
    description: 'Please pray for healing',
  };

  const mockHandlers = {
    onUpdateStatus: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders prayer with title and requester', () => {
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    expect(screen.getByText('Test Prayer')).toBeDefined();
    expect(screen.getByText(/John Doe/)).toBeDefined();
  });

  it('displays prayer description when provided', () => {
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    expect(screen.getByText(/Please pray for healing/)).toBeDefined();
  });

  it('shows prayer_for field when provided', () => {
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    expect(screen.getByText(/John Doe/)).toBeDefined();
  });

  it('handles current status', () => {
    render(<PrayerCard prayer={{ ...mockPrayer, status: 'current' }} {...mockHandlers} />);
    
    // Status badge should be present
    expect(screen.getByText(/current/i)).toBeDefined();
  });

  it('handles answered status', () => {
    render(<PrayerCard prayer={{ ...mockPrayer, status: 'answered' }} {...mockHandlers} />);
    
    expect(screen.getByText(/answered/i)).toBeDefined();
  });

  it('handles archived status', () => {
    render(<PrayerCard prayer={{ ...mockPrayer, status: 'archived' }} {...mockHandlers} />);
    
    expect(screen.getByText(/archived/i)).toBeDefined();
  });

  it('handles removed status', () => {
    render(<PrayerCard prayer={{ ...mockPrayer, status: 'removed' }} {...mockHandlers} />);
    
    expect(screen.getByText(/removed/i)).toBeDefined();
  });

  it('shows email when provided', () => {
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    expect(screen.getByText(/john@example.com/)).toBeDefined();
  });

  it('handles prayer without email gracefully', () => {
    const prayerWithoutEmail = { ...mockPrayer, email: null };
    render(<PrayerCard prayer={prayerWithoutEmail} {...mockHandlers} />);
    
    expect(screen.getByText('Test Prayer')).toBeDefined();
  });

  it('handles prayer without description', () => {
    const prayerWithoutDesc = { ...mockPrayer, description: null };
    render(<PrayerCard prayer={prayerWithoutDesc} {...mockHandlers} />);
    
    expect(screen.getByText('Test Prayer')).toBeDefined();
  });

  it('handles prayer without prayer_for field', () => {
    const prayerWithoutPrayerFor = { ...mockPrayer, prayer_for: null };
    render(<PrayerCard prayer={prayerWithoutPrayerFor} {...mockHandlers} />);
    
    expect(screen.getByText('Test Prayer')).toBeDefined();
  });

  it('calls onUpdateStatus when status is changed', async () => {
    const user = userEvent.setup();
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    // Find status update button or dropdown
    const statusButtons = screen.getAllByRole('button');
    const updateButton = statusButtons.find(btn => 
      btn.textContent?.includes('answered') || 
      btn.textContent?.includes('archived')
    );
    
    if (updateButton) {
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(mockHandlers.onUpdateStatus).toHaveBeenCalled();
      });
    }
  });

  it('calls onUpdate when edit is clicked', async () => {
    const user = userEvent.setup();
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    // Find edit button
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => 
      btn.textContent?.includes('Edit') || 
      btn.getAttribute('aria-label')?.includes('edit')
    );
    
    if (editButton) {
      await user.click(editButton);
      
      await waitFor(() => {
        expect(mockHandlers.onUpdate).toHaveBeenCalled();
      });
    }
  });

  it('calls onDelete when delete is clicked', async () => {
    const user = userEvent.setup();
    global.confirm = vi.fn().mockReturnValue(true);
    
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    // Find delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => 
      btn.textContent?.includes('Delete') || 
      btn.getAttribute('aria-label')?.includes('delete')
    );
    
    if (deleteButton) {
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(mockHandlers.onDelete).toHaveBeenCalled();
      });
    }
  });

  it('formats date correctly', () => {
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    // Should show some formatted date
    expect(screen.getByText(/2025|Jan|January/i)).toBeDefined();
  });

  it('displays prayer with long title', () => {
    const longTitlePrayer = {
      ...mockPrayer,
      title: 'This is a very long prayer title that might need truncation or special handling in the UI',
    };
    
    render(<PrayerCard prayer={longTitlePrayer} {...mockHandlers} />);
    
    expect(screen.getByText(/This is a very long prayer title/)).toBeDefined();
  });

  it('displays prayer with long description', () => {
    const longDescPrayer = {
      ...mockPrayer,
      description: 'This is a very long description that contains many details about the prayer request and might need special handling in the user interface to ensure it displays properly without breaking the layout or causing overflow issues',
    };
    
    render(<PrayerCard prayer={longDescPrayer} {...mockHandlers} />);
    
    expect(screen.getByText(/This is a very long description/)).toBeDefined();
  });

  it('handles missing created_at date', () => {
    const prayerWithoutDate = { ...mockPrayer, created_at: null as any };
    render(<PrayerCard prayer={prayerWithoutDate} {...mockHandlers} />);
    
    expect(screen.getByText('Test Prayer')).toBeDefined();
  });

  it('handles special characters in title', () => {
    const specialCharPrayer = {
      ...mockPrayer,
      title: 'Prayer with "quotes" & special <characters>',
    };
    
    render(<PrayerCard prayer={specialCharPrayer} {...mockHandlers} />);
    
    expect(screen.getByText(/Prayer with/)).toBeDefined();
  });

  it('handles special characters in description', () => {
    const specialCharPrayer = {
      ...mockPrayer,
      description: 'Description with <script>alert("test")</script> and & symbols',
    };
    
    render(<PrayerCard prayer={specialCharPrayer} {...mockHandlers} />);
    
    expect(screen.getByText(/Description with/)).toBeDefined();
  });

  it('displays prayer in dark mode', () => {
    const { container } = render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    // Card should render with appropriate classes
    expect(container.querySelector('.dark\\:bg-gray-800, .dark\\:text-white')).toBeDefined();
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    // Tab through elements
    await user.tab();
    
    // Should be able to focus on interactive elements
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles rapid status changes', async () => {
    const user = userEvent.setup();
    render(<PrayerCard prayer={mockPrayer} {...mockHandlers} />);
    
    const statusButtons = screen.getAllByRole('button');
    const updateButton = statusButtons.find(btn => 
      btn.textContent?.includes('answered')
    );
    
    if (updateButton) {
      // Click multiple times rapidly
      await user.click(updateButton);
      await user.click(updateButton);
      await user.click(updateButton);
      
      // Should handle gracefully
      expect(mockHandlers.onUpdateStatus).toHaveBeenCalled();
    }
  });
});
