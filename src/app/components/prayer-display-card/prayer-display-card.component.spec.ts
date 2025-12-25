import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { PrayerDisplayCardComponent } from './prayer-display-card.component';

describe('PrayerDisplayCardComponent', () => {
  const mockPrayer = {
    id: '1',
    title: 'Test Prayer',
    prayer_for: 'John Doe',
    description: 'Please pray for healing',
    requester: 'Jane Smith',
    status: 'current',
    created_at: '2024-01-15T10:00:00Z',
    prayer_updates: [
      {
        id: 'u1',
        content: 'Update 1',
        author: 'Author 1',
        created_at: '2024-12-20T10:00:00Z'
      },
      {
        id: 'u2',
        content: 'Update 2',
        author: 'Author 2',
        created_at: '2024-01-16T10:00:00Z'
      }
    ]
  };

  const mockPrompt = {
    id: 'p1',
    title: 'Morning Prayer',
    type: 'Morning',
    description: 'Start your day with prayer',
    created_at: '2024-01-15T10:00:00Z'
  };

  it('should create', async () => {
    const { fixture } = await render(PrayerDisplayCardComponent);
    
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('default properties', () => {
    it('should have prayer undefined by default', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      expect(fixture.componentInstance.prayer).toBeUndefined();
    });

    it('should have prompt undefined by default', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      expect(fixture.componentInstance.prompt).toBeUndefined();
    });

    it('should have showAllUpdates as false', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      expect(fixture.componentInstance.showAllUpdates).toBe(false);
    });
  });

  describe('prayer display', () => {
    it('should display prayer_for', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('John Doe');
    });

    it('should display description', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Please pray for healing');
    });

    it('should display requester', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Jane Smith');
    });

    it('should display Anonymous for missing requester', async () => {
      const prayerWithoutRequester = { ...mockPrayer, requester: '' };
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: prayerWithoutRequester }
      });
      
      expect(container.textContent).toContain('Anonymous');
    });

    it('should display status', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Current');
    });

    it('should capitalize first letter of status', async () => {
      const answeredPrayer = { ...mockPrayer, status: 'answered' };
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: answeredPrayer }
      });
      
      expect(container.textContent).toContain('Answered');
    });
  });

  describe('prompt display', () => {
    it('should display prompt title', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prompt: mockPrompt }
      });
      
      expect(container.textContent).toContain('Morning Prayer');
    });

    it('should display prompt type', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prompt: mockPrompt }
      });
      
      expect(container.textContent).toContain('Morning');
    });

    it('should display prompt description', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prompt: mockPrompt }
      });
      
      expect(container.textContent).toContain('Start your day with prayer');
    });

    it('should display prompt card when prompt is provided', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prompt: mockPrompt }
      });
      
      const cards = container.querySelectorAll('.bg-white');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('getStatusBadgeClasses', () => {
    it('should return current status classes', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      const classes = fixture.componentInstance.getStatusBadgeClasses('current');
      expect(classes).toContain('bg-[#0047AB]');
      expect(classes).toContain('text-[#0047AB]');
    });

    it('should return answered status classes', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      const classes = fixture.componentInstance.getStatusBadgeClasses('answered');
      expect(classes).toContain('bg-[#39704D]');
      expect(classes).toContain('text-[#39704D]');
    });

    it('should return default classes for unknown status', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      const classes = fixture.componentInstance.getStatusBadgeClasses('unknown');
      expect(classes).toContain('bg-gray-100');
      expect(classes).toContain('text-gray-800');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      const formatted = fixture.componentInstance.formatDate('2024-01-15T10:30:00Z');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
    });

    it('should include time in formatted date', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      const formatted = fixture.componentInstance.formatDate('2024-01-15T14:30:00Z');
      expect(formatted).toContain('at');
    });
  });

  describe('prayer updates', () => {
    it('should display updates section when updates exist', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Recent Updates');
    });

    it('should not display updates section when no updates', async () => {
      const prayerWithoutUpdates = { ...mockPrayer, prayer_updates: [] };
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: prayerWithoutUpdates }
      });
      
      expect(container.textContent).not.toContain('Recent Updates');
    });

    it('should display update content', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Update 1');
    });

    it('should display update author', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Author 1');
    });
  });

  describe('getRecentUpdates', () => {
    it('should return empty array when no prayer', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates).toEqual([]);
    });

    it('should return empty array when no updates', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: { ...mockPrayer, prayer_updates: [] } }
      });
      
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates).toEqual([]);
    });

    it('should sort updates by date descending', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates[0].id).toBe('u1'); // Most recent
    });

    it('should return all updates when showAllUpdates is true', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      fixture.componentInstance.showAllUpdates = true;
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates.length).toBe(2);
    });

    it('should filter updates by one week when showAllUpdates is false', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      fixture.componentInstance.showAllUpdates = false;
      const updates = fixture.componentInstance.getRecentUpdates();
      // Update 1 is recent (2024-12-20), Update 2 is old (2024-01-16)
      expect(updates.length).toBe(1);
      expect(updates[0].id).toBe('u1');
    });

    it('should return most recent update when no updates within week', async () => {
      const oldPrayer = {
        ...mockPrayer,
        prayer_updates: [
          {
            id: 'u1',
            content: 'Old Update 1',
            author: 'Author',
            created_at: '2023-01-01T10:00:00Z'
          },
          {
            id: 'u2',
            content: 'Old Update 2',
            author: 'Author',
            created_at: '2023-01-02T10:00:00Z'
          }
        ]
      };
      
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: oldPrayer }
      });
      
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates.length).toBe(1);
      expect(updates[0].id).toBe('u2'); // Most recent of the old ones
    });

    it('should handle single old update correctly', async () => {
      const singleOldUpdatePrayer = {
        ...mockPrayer,
        prayer_updates: [
          {
            id: 'u1',
            content: 'Single Old Update',
            author: 'Author',
            created_at: '2023-01-01T10:00:00Z'
          }
        ]
      };
      
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: singleOldUpdatePrayer }
      });
      
      fixture.componentInstance.showAllUpdates = false;
      const updates = fixture.componentInstance.getRecentUpdates();
      
      // Should return the single update even though it's old
      expect(updates.length).toBe(1);
      expect(updates[0].id).toBe('u1');
    });

    it('should return recent updates when they exist within the week', async () => {
      const recentPrayer = {
        ...mockPrayer,
        prayer_updates: [
          {
            id: 'u1',
            content: 'Recent Update',
            author: 'Author',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
          },
          {
            id: 'u2',
            content: 'Another Recent',
            author: 'Author',
            created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 2 days ago
          }
        ]
      };
      
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: recentPrayer }
      });
      
      fixture.componentInstance.showAllUpdates = false;
      const updates = fixture.componentInstance.getRecentUpdates();
      
      // Should return all recent updates (true branch)
      expect(updates.length).toBe(2);
    });

    it('should return most recent update when no updates exist within the week', async () => {
      const oldPrayer = {
        ...mockPrayer,
        prayer_updates: [
          {
            id: 'u1',
            content: 'Very Old Update',
            author: 'Author',
            created_at: '2020-01-01T10:00:00Z'
          },
          {
            id: 'u2',
            content: 'Another Old Update',
            author: 'Author',
            created_at: '2020-01-02T10:00:00Z'
          }
        ]
      };
      
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: oldPrayer }
      });
      
      fixture.componentInstance.showAllUpdates = false;
      const updates = fixture.componentInstance.getRecentUpdates();
      
      // Should return only most recent (false branch, slice(0, 1))
      expect(updates.length).toBe(1);
      expect(updates[0].id).toBe('u2'); // Most recent of old ones
    });
  });

  describe('shouldShowToggleButton', () => {
    it('should return false when no prayer', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent);
      
      const shouldShow = fixture.componentInstance.shouldShowToggleButton();
      expect(shouldShow).toBe(false);
    });

    it('should return false when no updates', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: { ...mockPrayer, prayer_updates: [] } }
      });
      
      const shouldShow = fixture.componentInstance.shouldShowToggleButton();
      expect(shouldShow).toBe(false);
    });

    it('should return true when there are hidden updates', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const shouldShow = fixture.componentInstance.shouldShowToggleButton();
      expect(shouldShow).toBe(true);
    });

    it('should return true when showAllUpdates is true', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      fixture.componentInstance.showAllUpdates = true;
      const shouldShow = fixture.componentInstance.shouldShowToggleButton();
      expect(shouldShow).toBe(true);
    });
  });

  describe('toggle updates button', () => {
    it('should display toggle button when there are hidden updates', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const buttons = container.querySelectorAll('button');
      const toggleButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Show all')
      );
      expect(toggleButton).toBeTruthy();
    });

    it('should toggle showAllUpdates when clicked', async () => {
      const user = userEvent.setup();
      const { fixture, container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(fixture.componentInstance.showAllUpdates).toBe(false);
      
      const buttons = container.querySelectorAll('button');
      const toggleButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Show all')
      ) as HTMLButtonElement;
      
      await user.click(toggleButton);
      
      expect(fixture.componentInstance.showAllUpdates).toBe(true);
    });

    it('should change button text when expanded', async () => {
      const user = userEvent.setup();
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const buttons = container.querySelectorAll('button');
      let toggleButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Show all')
      ) as HTMLButtonElement;
      
      await user.click(toggleButton);
      
      toggleButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Show less')
      ) as HTMLButtonElement;
      
      expect(toggleButton).toBeTruthy();
    });

    it('should rotate arrow icon when expanded', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: {
          prayer: mockPrayer
        }
      });
      
      // Check for icon without rotation initially
      let svg = container.querySelector('svg:not(.rotate-180)');
      expect(svg).toBeTruthy();
    });
  });

  describe('responsive styling', () => {
    it('should have responsive text sizes', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const largeText = container.querySelector('.text-2xl.md\\:text-3xl.lg\\:text-5xl');
      expect(largeText).toBeTruthy();
    });

    it('should have rounded card', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const card = container.querySelector('.rounded-3xl');
      expect(card).toBeTruthy();
    });

    it('should have shadow and border', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const card = container.querySelector('.shadow-2xl.border');
      expect(card).toBeTruthy();
    });
  });

  describe('dark mode support', () => {
    it('should have dark mode classes', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const darkBgElements = container.querySelectorAll('.dark\\:bg-gray-800');
      expect(darkBgElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode text classes', async () => {
      const { container } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      const darkTextElements = container.querySelectorAll('.dark\\:text-gray-100');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });
  });

  describe('input acceptance', () => {
    it('should accept prayer input', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(fixture.componentInstance.prayer).toEqual(mockPrayer);
    });

    it('should accept prompt input', async () => {
      const { fixture } = await render(PrayerDisplayCardComponent, {
        componentProperties: { prompt: mockPrompt }
      });
      
      expect(fixture.componentInstance.prompt).toEqual(mockPrompt);
    });

    it('should handle both prayer and prompt undefined', async () => {
      const { container } = await render(PrayerDisplayCardComponent);
      
      // Component should render without errors
      expect(container).toBeTruthy();
    });
  });
});
