import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Create a mock function that we can control
let mockMaybeSingle = vi.fn(async () => ({ data: null, error: null }));
let mockUpsert = vi.fn(async () => ({ error: null }));

// Mock supabase client minimal API used by the component
vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'admin_settings') {
          return {
            select: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: mockMaybeSingle })) })),
            upsert: mockUpsert
          } as any;
        }
        return {} as any;
      })
    }
  };
});

// Import component after mocks
import { SessionTimeoutSettings } from '../SessionTimeoutSettings';

describe('SessionTimeoutSettings', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    localStorage.clear();
    // Reset mocks to default behavior
    mockMaybeSingle = vi.fn(async () => ({ data: null, error: null }));
    mockUpsert = vi.fn(async () => ({ error: null }));
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads defaults and allows saving valid settings', async () => {
    render(<SessionTimeoutSettings />);

    // Wait for loading state to disappear
    expect(await screen.findByText(/Session Timeout Configuration/i)).toBeInTheDocument();

    // Inputs have no accessible name; query by role then relative position next to headings
    const spinbuttons = screen.getAllByRole('spinbutton');
    // Order in DOM: inactivity, max session, heartbeat
    const [inactivityInput, maxSessionInput, heartbeatInput] = spinbuttons;

    // Adjust values to valid ones using change events for number inputs
    fireEvent.change(inactivityInput, { target: { value: '15' } });
    fireEvent.change(maxSessionInput, { target: { value: '120' } });
    fireEvent.change(heartbeatInput, { target: { value: '2' } });

    // Save
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await user.click(saveButton);

    // Success banner appears (primary success criteria)
    expect(await screen.findByText(/Settings saved successfully/i)).toBeInTheDocument();
  });

  it('shows validation errors for invalid values', async () => {
    render(<SessionTimeoutSettings />);
    expect(await screen.findByText(/Session Timeout Configuration/i)).toBeInTheDocument();

    const spinbuttons = screen.getAllByRole('spinbutton');
    const [inactivityInput, maxSessionInput, heartbeatInput] = spinbuttons;

    // Set heartbeat >= inactivity to trigger frequency rule
    fireEvent.change(inactivityInput, { target: { value: '5' } });
    fireEvent.change(heartbeatInput, { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    expect(await screen.findByText(/Database heartbeat must be less frequent than inactivity timeout/i)).toBeInTheDocument();
  });

  it('saves settings successfully when localStorage has cached data', async () => {
    // Set localStorage with cached settings
    const cachedSettings = {
      inactivityTimeoutMinutes: 45,
      maxSessionDurationMinutes: 240,
      dbHeartbeatIntervalMinutes: 3
    };
    localStorage.setItem('adminTimeoutSettings', JSON.stringify(cachedSettings));

    render(<SessionTimeoutSettings />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });

    // Verify the component loaded
    expect(screen.getByText(/Session Timeout Configuration/i)).toBeInTheDocument();
    
    // Try to save the settings
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    
    // Should save successfully
    expect(await screen.findByText(/Settings saved successfully/i)).toBeInTheDocument();
  });

  it('handles corrupted localStorage data gracefully', async () => {
    // Set invalid JSON in localStorage
    localStorage.setItem('adminTimeoutSettings', 'invalid-json{');

    render(<SessionTimeoutSettings />);
    
    // Component should still render with defaults
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Session Timeout Configuration/i)).toBeInTheDocument();
  });

  it('loads component successfully even without database data', async () => {
    // Mock database to return no data
    mockMaybeSingle = vi.fn(async () => ({
      data: null,
      error: null
    }));

    render(<SessionTimeoutSettings />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });

    // Verify the component loaded successfully with defaults
    expect(screen.getByText(/Session Timeout Configuration/i)).toBeInTheDocument();
    const spinbuttons = screen.getAllByRole('spinbutton');
    expect(spinbuttons.length).toBe(3); // Has all three inputs
  });

  it('handles database fetch errors', async () => {
    // Mock database error
    mockMaybeSingle = vi.fn(async () => ({
      data: null,
      error: { message: 'Database connection failed' }
    }));

    render(<SessionTimeoutSettings />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });

    // Component should still render with defaults
    expect(screen.getByText(/Session Timeout Configuration/i)).toBeInTheDocument();
  });

  it('handles parse errors in localStorage gracefully', async () => {
    // Load a setting with inactivity < 5 from cache to test error handling
    localStorage.setItem('adminTimeoutSettings', JSON.stringify({
      inactivityTimeoutMinutes: 3,
      maxSessionDurationMinutes: 120,
      dbHeartbeatIntervalMinutes: 1
    }));

    render(<SessionTimeoutSettings />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });
    
    // Component should still render successfully
    expect(screen.getByText(/Session Timeout Configuration/i)).toBeInTheDocument();
  });

  it('handles database upsert failure', async () => {
    // Mock upsert to fail
    mockUpsert = vi.fn(async () => ({
      error: { message: 'Failed to save' }
    }));

    render(<SessionTimeoutSettings />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });

    const spinbuttons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[0], { target: { value: '15' } });
    
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    expect(await screen.findByText(/Failed to save settings to database/i)).toBeInTheDocument();
  });

  it('handles localStorage storage error gracefully', async () => {
    // Spy on localStorage.setItem to throw an error
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    render(<SessionTimeoutSettings />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });

    const spinbuttons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[0], { target: { value: '15' } });
    fireEvent.change(spinbuttons[1], { target: { value: '120' } });
    fireEvent.change(spinbuttons[2], { target: { value: '2' } });
    
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    
    // Should still show success even if localStorage fails
    expect(await screen.findByText(/Settings saved successfully/i)).toBeInTheDocument();

    // Restore is automatic via afterEach restoreAllMocks
    setItemSpy.mockRestore();
  });

  it('handles general error during save', async () => {
    // Mock upsert to throw an error
    mockUpsert = vi.fn(async () => {
      throw new Error('Unexpected error');
    });

    render(<SessionTimeoutSettings />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });

    const spinbuttons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[0], { target: { value: '15' } });
    
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    expect(await screen.findByText(/Failed to save settings/i)).toBeInTheDocument();
  });

  it('handles general error during load', async () => {
    // Mock select to throw an error
    mockMaybeSingle = vi.fn(async () => {
      throw new Error('Unexpected database error');
    });

    render(<SessionTimeoutSettings />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings/i)).not.toBeInTheDocument();
    });

    // Component should still render with defaults
    expect(screen.getByText(/Session Timeout Configuration/i)).toBeInTheDocument();
  });
});

// (Removed redundant minimal smoke tests to avoid duplicate suites)
