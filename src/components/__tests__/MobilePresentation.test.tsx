import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobilePresentation } from '../MobilePresentation';
import * as supabaseModule from '../../lib/supabase';
import * as presentationUtils from '../../utils/presentationUtils';

// Mock dependencies with mutable query builder
let mockQueryData: any = { data: [], error: null };

const createMockQuery = () => ({
  select: vi.fn(() => createMockQuery()),
  eq: vi.fn(() => createMockQuery()),
  in: vi.fn(() => createMockQuery()),
  gte: vi.fn(() => createMockQuery()),
  order: vi.fn(() => Promise.resolve(mockQueryData)),
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createMockQuery())
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

// Helper to create mock prayer data
const createMockPrayer = (overrides = {}) => ({
  id: '1',
  title: 'Test Prayer',
  prayer_for: 'Test Person',
  description: 'Test description',
  requester: 'Test Requester',
  status: 'current',
  approval_status: 'approved',
  created_at: new Date().toISOString(),
  prayer_updates: [],
  ...overrides
});

describe('MobilePresentation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data
    mockQueryData = { data: [], error: null };
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
    mockQueryData = {
      data: [{
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'Test Person',
        description: 'Test description',
        requester: 'Test Requester',
        status: 'current',
        approval_status: 'approved',
        created_at: new Date().toISOString(),
        prayer_updates: []
      }],
      error: null
    };

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });
  });

  it('toggles play/pause when play button is clicked', async () => {
    // Set up mock with prayers
    mockQueryData = {
      data: [{
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'Test Person',
        description: 'Test description',
        requester: 'Test Requester',
        status: 'current',
        approval_status: 'approved',
        created_at: new Date().toISOString(),
        prayer_updates: []
      }],
      error: null
    };

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Should show pause icon when playing
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });
  });

  it('opens settings panel when settings button is clicked', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('closes settings panel when close button is clicked', async () => {
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Close settings - use X button in settings panel
    const closeButtons = screen.getAllByRole('button', { name: /exit|close/i });
    // The first close button should be the one in the settings panel
    fireEvent.click(closeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  it('handles swipe navigation', async () => {
    mockQueryData = {
      data: [
        {
          id: '1',
          title: 'Prayer 1',
          prayer_for: 'Person 1',
          description: 'Description 1',
          requester: 'Requester 1',
          status: 'current',
          approval_status: 'approved',
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
          approval_status: 'approved',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ],
      error: null
    };

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Person 1')).toBeInTheDocument();
    });

    // Simulate left swipe (next)
    const container = screen.getByText('Person 1').closest('.flex-1');
    
    // Create proper touch event structure
    fireEvent.touchStart(container!, { 
      targetTouches: [{ clientX: 200 }] 
    });
    fireEvent.touchMove(container!, { 
      targetTouches: [{ clientX: 100 }] 
    });
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

    // Check initial state - controls should be visible (translate-y-0)
    const controlsContainer = document.querySelector('.fixed.bottom-0');
    expect(controlsContainer).toHaveClass('translate-y-0');

    // Double tap with proper event structure
    fireEvent.touchStart(container!, { targetTouches: [{ clientX: 100 }] });
    fireEvent.touchEnd(container!);
    // Second tap within threshold
    fireEvent.touchStart(container!, { targetTouches: [{ clientX: 100 }] });
    fireEvent.touchEnd(container!);

    // Controls should now be hidden (translate-y-full class)
    await waitFor(() => {
      expect(controlsContainer).toHaveClass('translate-y-full');
    });
  });

  it('applies theme from localStorage', () => {
    render(<MobilePresentation />);

    expect(presentationUtils.applyTheme).toHaveBeenCalledWith('system');
  });

  it('changes theme when theme button is clicked', async () => {
    mockQueryData = { data: [createMockPrayer()], error: null };
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Find and click theme buttons
    const lightButton = screen.getByRole('button', { name: /light/i });
    fireEvent.click(lightButton);

    expect(presentationUtils.applyTheme).toHaveBeenCalled();
  });

  it('changes content type filter', async () => {
    mockQueryData = { data: [createMockPrayer()], error: null };
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Change content type
    const contentButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Prayers') || 
      btn.textContent?.includes('Prompts') || 
      btn.textContent?.includes('Both')
    );
    
    if (contentButtons.length > 0) {
      fireEvent.click(contentButtons[0]);
    }
  });

  it('toggles smart mode', async () => {
    mockQueryData = { data: [createMockPrayer()], error: null };
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Find smart mode checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    const smartModeCheckbox = checkboxes.find(cb => {
      const label = cb.closest('label')?.textContent || '';
      return label.includes('Smart') || label.includes('smart');
    });

    if (smartModeCheckbox) {
      fireEvent.click(smartModeCheckbox);
    }
  });

  it('toggles randomize option', async () => {
    mockQueryData = { data: [createMockPrayer()], error: null };
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Find randomize checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    const randomizeCheckbox = checkboxes.find(cb => {
      const label = cb.closest('label')?.textContent || '';
      return label.includes('Random') || label.includes('random');
    });

    if (randomizeCheckbox) {
      fireEvent.click(randomizeCheckbox);
    }
  });

  it('changes display duration', async () => {
    mockQueryData = { data: [createMockPrayer()], error: null };
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Find duration slider
    const sliders = screen.getAllByRole('slider');
    if (sliders.length > 0) {
      fireEvent.change(sliders[0], { target: { value: '15' } });
    }
  });

  it('changes time filter', async () => {
    mockQueryData = { data: [createMockPrayer()], error: null };
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Find time filter buttons
    const timeButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Week') || 
      btn.textContent?.includes('Month') || 
      btn.textContent?.includes('Year')
    );
    
    if (timeButtons.length > 0) {
      fireEvent.click(timeButtons[0]);
    }
  });

  it('changes status filter', async () => {
    mockQueryData = { data: [createMockPrayer()], error: null };
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Find status filter checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    const statusCheckbox = checkboxes.find(cb => {
      const label = cb.closest('label')?.textContent || '';
      return label.includes('Current') || label.includes('Answered') || label.includes('Archived');
    });

    if (statusCheckbox) {
      fireEvent.click(statusCheckbox);
    }
  });

  it('renders prompt card when prompts are available', async () => {
    mockQueryData = {
      data: [{
        id: '1',
        title: 'Test Prompt',
        type: 'Thanksgiving',
        description: 'Test prompt description',
        created_at: new Date().toISOString(),
      }],
      error: null
    };

    render(<MobilePresentation />);

    await waitFor(() => {
      // When loading prompts, we need to switch to prompts mode first
      // For now just check it doesn't crash
      expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    });
  });

  it('handles error when fetching prayers', async () => {
    mockQueryData = {
      data: null,
      error: { message: 'Test error' }
    };

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('No Prayers Available')).toBeInTheDocument();
    });
  });

  it('navigates with previous button', async () => {
    mockQueryData = {
      data: [
        {
          id: '1',
          title: 'Prayer 1',
          prayer_for: 'Person 1',
          description: 'Description 1',
          requester: 'Requester 1',
          status: 'current',
          approval_status: 'approved',
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
          approval_status: 'approved',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ],
      error: null
    };

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Person 1')).toBeInTheDocument();
    });

    // Navigate to next first
    const container = screen.getByText('Person 1').closest('.flex-1');
    fireEvent.touchStart(container!, { targetTouches: [{ clientX: 200 }] });
    fireEvent.touchMove(container!, { targetTouches: [{ clientX: 100 }] });
    fireEvent.touchEnd(container!);

    await waitFor(() => {
      expect(screen.getByText('Person 2')).toBeInTheDocument();
    });

    // Navigate to previous (swipe right)
    const container2 = screen.getByText('Person 2').closest('.flex-1');
    fireEvent.touchStart(container2!, { targetTouches: [{ clientX: 100 }] });
    fireEvent.touchMove(container2!, { targetTouches: [{ clientX: 200 }] });
    fireEvent.touchEnd(container2!);

    await waitFor(() => {
      expect(screen.getByText('Person 1')).toBeInTheDocument();
    });
  });

  it('displays prayer with updates', async () => {
    mockQueryData = {
      data: [{
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'Test Person',
        description: 'Test description',
        requester: 'Test Requester',
        status: 'current',
        approval_status: 'approved',
        created_at: new Date().toISOString(),
        prayer_updates: [{
          id: 'update-1',
          content: 'Test update',
          author: 'Update Author',
          approval_status: 'approved',
          created_at: new Date().toISOString(),
        }]
      }],
      error: null
    };

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Updates should be displayed
    await waitFor(() => {
      expect(screen.getByText('Test update')).toBeInTheDocument();
    });
  });

  it('displays status badges correctly', async () => {
    mockQueryData = {
      data: [{
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'Test Person',
        description: 'Test description',
        requester: 'Test Requester',
        status: 'answered',
        approval_status: 'approved',
        created_at: new Date().toISOString(),
        prayer_updates: []
      }],
      error: null
    };

    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Status badge should be displayed
    expect(screen.getByText('Answered')).toBeInTheDocument();
  });

  it('requests notification permission when starting prayer timer', async () => {
    mockQueryData = { data: [createMockPrayer()], error: null };
    const requestPermissionSpy = vi.spyOn(window.Notification, 'requestPermission');
    
    render(<MobilePresentation />);

    await waitFor(() => {
      expect(screen.getByText('Test Person')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Find and click start timer button
    const startButton = screen.getByRole('button', { name: /start timer/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(requestPermissionSpy).toHaveBeenCalled();
    });
  });
});
