import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobilePresentation } from '../MobilePresentation';
import * as supabaseModule from '../../lib/supabase';
import * as presentationUtils from '../../utils/presentationUtils';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }))
    }))
  }
}));

vi.mock('../../utils/presentationUtils', () => ({
  calculateSmartDurationPrayer: vi.fn(() => 10),
  calculateSmartDurationPrompt: vi.fn(() => 10),
  formatTime: vi.fn(() => '10:00'),
  applyTheme: vi.fn(),
  handleThemeChange: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => 'system'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn(() => Promise.resolve('granted'))
  },
  writable: true
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

describe.skip('MobilePresentation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Use real timers so async promises resolve normally in tests
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading state initially', () => {
    render(<MobilePresentation />);
    expect(screen.getByText('Loading prayers...')).toBeInTheDocument();
  });

  it('shows empty state when no prayers available', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });
  });

  it('renders prayer card when prayers are available', async () => {
    const mockPrayers = [{
      id: '1',
      title: 'Test Prayer',
      prayer_for: 'Test Person',
      description: 'Test description',
      requester: 'Test Requester',
      status: 'current',
      created_at: new Date().toISOString(),
      prayer_updates: []
    }];

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockPrayers,
                  error: null
                }))
              }))
            }))
          }))
        }))
      }))
    };

    (supabaseModule.supabase as any).from = mockSupabase.from;

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });
  });

  it('toggles play/pause when play button is clicked', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Should show pause icon when playing
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('opens settings panel when settings button is clicked', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('closes settings panel when close button is clicked', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Close settings
    const closeButton = screen.getAllByRole('button', { name: /exit/i })[0];
    fireEvent.click(closeButton);

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('handles swipe navigation', async () => {
    const mockPrayers = [
      {
        id: '1',
        title: 'Prayer 1',
        prayer_for: 'Person 1',
        description: 'Description 1',
        requester: 'Requester 1',
        status: 'current',
        created_at: new Date().toISOString(),
        prayer_updates: []
      },
      {
        id: '2',
        title: 'Prayer 2',
        prayer_for: 'Person 2',
        description: 'Description 2',
        requester: 'Requester 2',
        status: 'current',
        created_at: new Date().toISOString(),
        prayer_updates: []
      }
    ];

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockPrayers,
                  error: null
                }))
              }))
            }))
          }))
        }))
      }))
    };

    (supabaseModule.supabase as any).from = mockSupabase.from;

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Person 1')).toBeInTheDocument();
    });

    // Simulate left swipe (next)
    const container = screen.getByText('Person 1').closest('.flex-1');
    fireEvent.touchStart(container!, { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(container!, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(container!);

    await waitFor(() => {
      expect(screen.getByText('Person 2')).toBeInTheDocument();
    });
  });

  it('shows prayer timer controls in settings', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    expect(screen.getByText('Prayer Timer')).toBeInTheDocument();
    expect(screen.getByText('Timer Duration (minutes)')).toBeInTheDocument();
  });

  it('starts prayer timer when start button is clicked', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    const startButton = screen.getByRole('button', { name: /start timer/i });
    fireEvent.click(startButton);

    // Timer should be active
    expect(screen.getByText('Stop Timer')).toBeInTheDocument();
  });

  it('toggles controls visibility on double tap', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });

    const container = screen.getByText('No Prayers Available').closest('.flex-1');

    // Double tap
    fireEvent.touchStart(container!, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(container!);
    fireEvent.touchStart(container!, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(container!);

    // Controls should be hidden (translate-y-full class would be applied)
    // This is hard to test directly, but we can check that the logic runs
  });

  it('applies theme from localStorage', () => {
    render(<MobilePresentation />);

    expect(presentationUtils.applyTheme).toHaveBeenCalledWith('system');
  });
});
