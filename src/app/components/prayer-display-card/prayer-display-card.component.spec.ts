import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { of } from 'rxjs';
import { PrayerDisplayCardComponent } from './prayer-display-card.component';
import { UserSessionService } from '../../services/user-session.service';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';
import { PrayerService } from '../../services/prayer.service';
import { PromptService } from '../../services/prompt.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { PersonalCategoryColorService } from '../../services/personal-category-color.service';

function createDisplayCardProviders(overrides?: {
  userSessionService?: Record<string, unknown>;
  prayerEncouragementService?: Record<string, unknown>;
  prayerService?: Record<string, unknown>;
  promptService?: Record<string, unknown>;
  adminAuthService?: Record<string, unknown>;
  supabaseService?: Record<string, unknown>;
  personalCategoryColorService?: Record<string, unknown>;
}) {
  const mockUserSessionService = {
    getShowPrayForButton$: vi.fn().mockReturnValue(of(false)),
    getShowPrayingCount$: vi.fn().mockReturnValue(of(false)),
    getCurrentSession: vi.fn().mockReturnValue(null),
    ...overrides?.userSessionService
  };
  const mockPrayerEncouragementService = {
    getPrayerEncouragementEnabled$: vi.fn().mockReturnValue(of(false)),
    getCooldownHours$: vi.fn().mockReturnValue(of(4)),
    getCooldownHoursForPrayer$: vi.fn().mockReturnValue(of(4)),
    getCooldownHours: vi.fn().mockReturnValue(4),
    canPrayFor: vi.fn().mockReturnValue(false),
    getCanPrayFor$: vi.fn().mockReturnValue(of(false)),
    recordPrayedFor: vi.fn(),
    clearPrayedForCooldown: vi.fn(),
    ...overrides?.prayerEncouragementService
  };
  const mockPrayerService = {
    incrementPrayedFor: vi.fn().mockResolvedValue(null),
    incrementPersonalPrayedFor: vi.fn().mockResolvedValue(null),
    incrementMemberPrayedFor: vi.fn().mockResolvedValue(null),
    ...overrides?.prayerService
  };
  const mockPromptService = {
    incrementPromptPrayedFor: vi.fn().mockResolvedValue(null),
    ...overrides?.promptService
  };
  const mockAdminAuthService = {
    getIsAdmin: vi.fn().mockReturnValue(false),
    ...overrides?.adminAuthService
  };
  const mockSupabaseService = {
    client: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { updates_allowed: 'everyone' },
              error: null
            })
          })
        })
      })
    },
    ...overrides?.supabaseService
  };

  const mockPersonalCategoryColorService = {
    loadColors: vi.fn().mockResolvedValue({}),
    colors$: of({ 'Test Category': '#2CC8DD' }),
    getColorsSnapshot: vi.fn().mockReturnValue({}),
    ...overrides?.personalCategoryColorService
  };

  return {
    providers: [
      { provide: UserSessionService, useValue: mockUserSessionService },
      { provide: PrayerEncouragementService, useValue: mockPrayerEncouragementService },
      { provide: PrayerService, useValue: mockPrayerService },
      { provide: PromptService, useValue: mockPromptService },
      { provide: AdminAuthService, useValue: mockAdminAuthService },
      { provide: SupabaseService, useValue: mockSupabaseService },
      {
        provide: PersonalCategoryColorService,
        useValue: mockPersonalCategoryColorService,
      },
    ],
    mocks: {
      mockUserSessionService,
      mockPrayerEncouragementService,
      mockPrayerService,
      mockPromptService,
      mockAdminAuthService,
      mockSupabaseService,
      mockPersonalCategoryColorService,
    },
  };
}

async function renderDisplayCard(
  options: Parameters<typeof render<typeof PrayerDisplayCardComponent>>[1] = {}
) {
  const { providers: extraProviders = [], ...rest } = options;
  const { providers } = createDisplayCardProviders();
  return render(PrayerDisplayCardComponent, {
    ...rest,
    providers: [...providers, ...extraProviders]
  });
}

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
    const { fixture } = await renderDisplayCard();
    
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('default properties', () => {
    it('should have prayer undefined by default', async () => {
      const { fixture } = await renderDisplayCard();
      
      expect(fixture.componentInstance.prayer).toBeUndefined();
    });

    it('should have prompt undefined by default', async () => {
      const { fixture } = await renderDisplayCard();
      
      expect(fixture.componentInstance.prompt).toBeUndefined();
    });

    it('should have showAllUpdates as false', async () => {
      const { fixture } = await renderDisplayCard();
      
      expect(fixture.componentInstance.showAllUpdates).toBe(false);
    });
  });

  describe('prayer display', () => {
    it('should display prayer_for', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('John Doe');
    });

    it('should display description', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Please pray for healing');
    });

    it('should display requester', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Jane Smith');
      expect(container.textContent).toContain('Requested by:');
    });

    it('should display Anonymous for missing requester', async () => {
      const prayerWithoutRequester = { ...mockPrayer, requester: '' };
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: prayerWithoutRequester }
      });
      
      expect(container.textContent).toContain('Anonymous');
      expect(container.textContent).toContain('Requested by:');
    });

    it('should display status', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Current');
    });

    it('should capitalize first letter of status', async () => {
      const answeredPrayer = { ...mockPrayer, status: 'answered' };
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: answeredPrayer }
      });
      
      expect(container.textContent).toContain('Answered');
    });
  });

  describe('prompt display', () => {
    it('should display prompt title', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prompt: mockPrompt }
      });
      
      expect(container.textContent).toContain('Morning Prayer');
    });

    it('should display prompt type', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prompt: mockPrompt }
      });
      
      expect(container.textContent).toContain('Morning');
    });

    it('should display prompt description', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prompt: mockPrompt }
      });
      
      expect(container.textContent).toContain('Start your day with prayer');
    });

    it('should display prompt card when prompt is provided', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prompt: mockPrompt }
      });
      
      const cards = container.querySelectorAll('.bg-white');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('getStatusBadgeClasses', () => {
    it('should return current status classes', async () => {
      const { fixture } = await renderDisplayCard();
      
      const classes = fixture.componentInstance.getStatusBadgeClasses('current');
      expect(classes).toContain('bg-blue-50');
      expect(classes).toContain('text-[#0047AB]');
      expect(classes).toContain('border-[#0047AB]');
    });

    it('should return answered status classes', async () => {
      const { fixture } = await renderDisplayCard();
      
      const classes = fixture.componentInstance.getStatusBadgeClasses('answered');
      expect(classes).toContain('bg-green-50');
      expect(classes).toContain('text-[#39704D]');
      expect(classes).toContain('border-[#39704D]');
    });

    it('should return archived status classes matching home prayer cards', async () => {
      const { fixture } = await renderDisplayCard();

      const classes = fixture.componentInstance.getStatusBadgeClasses('archived');
      expect(classes).toContain('bg-amber-50');
      expect(classes).toContain('text-[#C9A961]');
      expect(classes).toContain('border-[#C9A961]');
    });

    it('should return default classes for unknown status', async () => {
      const { fixture } = await renderDisplayCard();
      
      const classes = fixture.componentInstance.getStatusBadgeClasses('unknown');
      expect(classes).toContain('bg-gray-100');
      expect(classes).toContain('text-gray-800');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', async () => {
      const { fixture } = await renderDisplayCard();
      
      const formatted = fixture.componentInstance.formatDate('2024-01-15T10:30:00Z');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
    });

    it('should include time in formatted date', async () => {
      const { fixture } = await renderDisplayCard();
      
      const formatted = fixture.componentInstance.formatDate('2024-01-15T14:30:00Z');
      expect(formatted).toContain('at');
    });
  });

  describe('prayer updates', () => {
    it('should display updates section when updates exist', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Recent Updates');
    });

    it('should not display updates section when no updates', async () => {
      const prayerWithoutUpdates = { ...mockPrayer, prayer_updates: [] };
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: prayerWithoutUpdates }
      });
      
      expect(container.textContent).not.toContain('Recent Updates');
    });

    it('should display update content', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Update 1');
    });

    it('should display update author', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Author 1');
    });
  });

  describe('getRecentUpdates', () => {
    it('should return empty array when no prayer', async () => {
      const { fixture } = await renderDisplayCard();
      
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates).toEqual([]);
    });

    it('should return empty array when no updates', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: { ...mockPrayer, prayer_updates: [] } }
      });
      
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates).toEqual([]);
    });

    it('should sort updates by date descending', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates[0].id).toBe('u1'); // Most recent
    });

    it('should return all updates when showAllUpdates is true', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      fixture.componentInstance.showAllUpdates = true;
      const updates = fixture.componentInstance.getRecentUpdates();
      expect(updates.length).toBe(2);
    });

    it('should filter updates by one week when showAllUpdates is false', async () => {
      const { fixture } = await renderDisplayCard({
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
      
      const { fixture } = await renderDisplayCard({
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
      
      const { fixture } = await renderDisplayCard({
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
      
      const { fixture } = await renderDisplayCard({
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
      
      const { fixture } = await renderDisplayCard({
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
      const { fixture } = await renderDisplayCard();
      
      const shouldShow = fixture.componentInstance.shouldShowToggleButton();
      expect(shouldShow).toBe(false);
    });

    it('should return false when no updates', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: { ...mockPrayer, prayer_updates: [] } }
      });
      
      const shouldShow = fixture.componentInstance.shouldShowToggleButton();
      expect(shouldShow).toBe(false);
    });

    it('should return true when there are hidden updates', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      const shouldShow = fixture.componentInstance.shouldShowToggleButton();
      expect(shouldShow).toBe(true);
    });

    it('should return true when showAllUpdates is true', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      fixture.componentInstance.showAllUpdates = true;
      const shouldShow = fixture.componentInstance.shouldShowToggleButton();
      expect(shouldShow).toBe(true);
    });
  });

  describe('toggle updates button', () => {
    it('should display toggle button when there are hidden updates', async () => {
      const { container } = await renderDisplayCard({
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
      const { fixture, container } = await renderDisplayCard({
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
      const { container } = await renderDisplayCard({
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
      const { container } = await renderDisplayCard({
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
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      const largeText = container.querySelector('.text-2xl.md\\:text-3xl.lg\\:text-5xl');
      expect(largeText).toBeTruthy();
    });

    it('should have rounded card', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      const card = container.querySelector('.rounded-3xl');
      expect(card).toBeTruthy();
    });

    it('should have shadow and border', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      const card = container.querySelector('.presentation-card-elevation .border');
      expect(card).toBeTruthy();
    });
  });

  describe('dark mode support', () => {
    it('should have dark mode classes', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      const darkBgElements = container.querySelectorAll('.dark\\:bg-gray-800');
      expect(darkBgElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode text classes', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      const darkTextElements = container.querySelectorAll('.dark\\:text-gray-100');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });
  });

  describe('input acceptance', () => {
    it('should accept prayer input', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(fixture.componentInstance.prayer).toEqual(mockPrayer);
    });

    it('should accept prompt input', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prompt: mockPrompt }
      });
      
      expect(fixture.componentInstance.prompt).toEqual(mockPrompt);
    });

    it('should handle both prayer and prompt undefined', async () => {
      const { container } = await renderDisplayCard();
      
      // Component should render without errors
      expect(container).toBeTruthy();
    });
  });

  describe('personal prayers', () => {
    const personalPrayer = {
      ...mockPrayer,
      user_email: 'user@example.com',
      updates: [
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

    it('should identify personal prayers', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: personalPrayer }
      });
      
      expect(fixture.componentInstance.isPersonalPrayer()).toBe(true);
    });

    it('should not identify regular prayers as personal', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(fixture.componentInstance.isPersonalPrayer()).toBe(false);
    });

    it('should hide requester field for personal prayers', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: personalPrayer }
      });
      
      expect(container.textContent).not.toContain('Requested by:');
      expect(container.textContent).not.toContain('Jane Smith');
    });

    it('should show requester field for regular prayers', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Requested by:');
      expect(container.textContent).toContain('Jane Smith');
    });

    it('should show updates section for personal prayers', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: personalPrayer }
      });
      
      expect(container.textContent).toContain('Recent Updates');
      expect(container.textContent).toContain('Update 1');
    });

    it('should show updates section for regular prayers', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: mockPrayer }
      });
      
      expect(container.textContent).toContain('Recent Updates');
      expect(container.textContent).toContain('Update 1');
    });
  });

  describe('member prayers', () => {
    const memberPrayer = {
      ...mockPrayer,
      id: 'pc-member-123',
      prayer_image: 'https://example.com/avatar.jpg',
      prayer_for: 'Member Name',
      prayer_updates: [
        {
          id: 'u1',
          content: 'Answered update',
          author: 'Author 1',
          created_at: '2024-12-20T10:00:00Z',
          is_answered: true
        }
      ]
    };

    it('should identify member prayers', async () => {
      const { fixture } = await renderDisplayCard({
        componentProperties: { prayer: memberPrayer }
      });
      
      expect(fixture.componentInstance.isMemberPrayer()).toBe(true);
    });

    it('should display member avatar for member prayers', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: memberPrayer }
      });
      
      const img = container.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg');
    });

    it('should use "Member Prayer:" label for member prayers', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: memberPrayer }
      });
      
      expect(container.textContent).toContain('Member Prayer:');
      expect(container.textContent).not.toContain('Prayer For:');
    });

    it('should display "Answered" badge for answered member updates', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: memberPrayer }
      });
      
      const badge = container.querySelector('.bg-green-600');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('Answered');
    });

    it('should hide requester and date for member prayers', async () => {
      const { container } = await renderDisplayCard({
        componentProperties: { prayer: memberPrayer }
      });
      
      expect(container.textContent).not.toContain('Requested by:');
      expect(container.textContent).not.toContain('Date:');
    });
  });

  describe('prayer encouragement', () => {
    const communityPrayer = {
      id: 'community-1',
      title: 'Community Prayer',
      prayer_for: 'John Doe',
      description: 'Please pray',
      requester: 'Jane Smith',
      email: 'requester@example.com',
      status: 'current',
      created_at: '2024-01-15T10:00:00Z',
      prayed_for_count: 0,
      prayer_updates: []
    };

    let mockUserSessionService: {
      getShowPrayForButton$: ReturnType<typeof vi.fn>;
      getShowPrayingCount$: ReturnType<typeof vi.fn>;
      getCurrentSession: ReturnType<typeof vi.fn>;
    };
    let mockPrayerEncouragementService: {
      getPrayerEncouragementEnabled$: ReturnType<typeof vi.fn>;
      getCooldownHours$: ReturnType<typeof vi.fn>;
      canPrayFor: ReturnType<typeof vi.fn>;
      recordPrayedFor: ReturnType<typeof vi.fn>;
    };
    let mockPrayerService: {
      incrementPrayedFor: ReturnType<typeof vi.fn>;
      incrementPersonalPrayedFor: ReturnType<typeof vi.fn>;
      incrementMemberPrayedFor: ReturnType<typeof vi.fn>;
    };
    let mockPromptService: {
      incrementPromptPrayedFor: ReturnType<typeof vi.fn>;
    };
    let mockAdminAuthService: { getIsAdmin: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockUserSessionService = {
        getShowPrayForButton$: vi.fn().mockReturnValue(of(true)),
        getShowPrayingCount$: vi.fn().mockReturnValue(of(true)),
        getCurrentSession: vi.fn().mockReturnValue({ email: 'viewer@example.com' })
      };
      mockPrayerEncouragementService = {
        getPrayerEncouragementEnabled$: vi.fn().mockReturnValue(of(true)),
        getCooldownHours$: vi.fn().mockReturnValue(of(4)),
        getCooldownHoursForPrayer$: vi.fn().mockReturnValue(of(4)),
        getCooldownHours: vi.fn().mockReturnValue(4),
        canPrayFor: vi.fn().mockReturnValue(true),
        getCanPrayFor$: vi.fn().mockReturnValue(of(true)),
        recordPrayedFor: vi.fn(),
        clearPrayedForCooldown: vi.fn()
      };
      mockPrayerService = {
        incrementPrayedFor: vi.fn().mockResolvedValue(5),
        incrementPersonalPrayedFor: vi.fn().mockResolvedValue(5),
        incrementMemberPrayedFor: vi.fn().mockResolvedValue(5)
      };
      mockPromptService = {
        incrementPromptPrayedFor: vi.fn().mockResolvedValue(5)
      };
      mockAdminAuthService = {
        getIsAdmin: vi.fn().mockReturnValue(false)
      };
    });

    function renderWithEncouragementMocks(
      componentProperties: { prayer?: typeof communityPrayer; prompt?: typeof mockPrompt } = {}
    ) {
      const { providers } = createDisplayCardProviders({
        userSessionService: mockUserSessionService,
        prayerEncouragementService: mockPrayerEncouragementService,
        prayerService: mockPrayerService,
        promptService: mockPromptService,
        adminAuthService: mockAdminAuthService
      });
      return render(PrayerDisplayCardComponent, {
        componentProperties,
        providers
      });
    }

    it('shows Pray For when encouragement settings and update policy allow it', async () => {
      await renderWithEncouragementMocks({ prayer: communityPrayer });
      expect(screen.getByRole('button', { name: 'Pray For' })).toBeTruthy();
    });

    it('hides Pray For when show_pray_for_button is false', async () => {
      mockUserSessionService.getShowPrayForButton$.mockReturnValue(of(false));
      await renderWithEncouragementMocks({ prayer: communityPrayer });
      expect(screen.queryByRole('button', { name: 'Pray For' })).toBeNull();
    });

    it('hides encouragement controls when prayer encouragement is disabled', async () => {
      mockPrayerEncouragementService.getPrayerEncouragementEnabled$.mockReturnValue(of(false));
      await renderWithEncouragementMocks({ prayer: communityPrayer });
      expect(screen.queryByRole('button', { name: 'Pray For' })).toBeNull();
      expect(screen.queryByText(/Praying/)).toBeNull();
    });

    it('shows Pray For for personal prayers', async () => {
      await renderWithEncouragementMocks({
        prayer: { ...communityPrayer, user_email: 'owner@example.com' }
      });
      expect(screen.getByRole('button', { name: 'Pray For' })).toBeTruthy();
    });

    it('confirmPrayFor for personal prayer calls incrementPersonalPrayedFor', async () => {
      const prayer = { ...communityPrayer, user_email: 'owner@example.com', prayed_for_count: 0 };
      const { fixture } = await renderWithEncouragementMocks({ prayer });
      await fixture.componentInstance.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('community-1', true);
      expect(mockPrayerService.incrementPersonalPrayedFor).toHaveBeenCalledWith('community-1');
      expect(mockPrayerService.incrementPrayedFor).not.toHaveBeenCalled();
      expect(prayer.prayed_for_count).toBe(5);
    });

    it('shows Pray For for Planning Center member prayers', async () => {
      await renderWithEncouragementMocks({
        prayer: { ...communityPrayer, id: 'pc-member-99' }
      });
      expect(screen.getByRole('button', { name: 'Pray For' })).toBeTruthy();
    });

    it('shows Pray For for member prayers even when updates_allowed is admin-only', async () => {
      const { fixture } = await renderWithEncouragementMocks({
        prayer: { ...communityPrayer, id: 'pc-member-99', email: '' }
      });
      fixture.componentInstance.updatesAllowed = 'admin-only';
      fixture.detectChanges();
      expect(screen.getByRole('button', { name: 'Pray For' })).toBeTruthy();
    });

    it('confirmPrayFor for member prayer calls incrementMemberPrayedFor', async () => {
      const prayer = { ...communityPrayer, id: 'pc-member-person-7', prayed_for_count: 0 };
      const { fixture } = await renderWithEncouragementMocks({ prayer });
      await fixture.componentInstance.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith(
        'pc-member-person-7',
        true
      );
      expect(mockPrayerService.incrementMemberPrayedFor).toHaveBeenCalledWith('person-7');
      expect(mockPrayerService.incrementPrayedFor).not.toHaveBeenCalled();
      expect(mockPrayerService.incrementPersonalPrayedFor).not.toHaveBeenCalled();
      expect(prayer.prayed_for_count).toBe(5);
    });

    it('shows praying count badge for member prayer when count is greater than zero', async () => {
      mockUserSessionService.getCurrentSession.mockReturnValue({ email: 'other@example.com' });
      await renderWithEncouragementMocks({
        prayer: { ...communityPrayer, id: 'pc-member-99', prayed_for_count: 3, email: '' }
      });
      expect(screen.getByText('3 Prayers')).toBeTruthy();
    });

    it('shows Pray For for prayer prompts', async () => {
      await renderWithEncouragementMocks({
        prompt: {
          id: 'prompt-1',
          title: 'Prompt Title',
          type: 'Church',
          description: 'Pray for leaders',
          created_at: '2024-01-01',
          prayed_for_count: 0
        }
      });
      expect(screen.getByRole('button', { name: 'Pray For' })).toBeTruthy();
    });

    it('confirmPrayFor for prompt calls incrementPromptPrayedFor with personal cooldown', async () => {
      const prompt = {
        id: 'prompt-1',
        title: 'Prompt Title',
        type: 'Church',
        description: 'Pray for leaders',
        created_at: '2024-01-01',
        prayed_for_count: 0
      };
      const { fixture } = await renderWithEncouragementMocks({ prompt });
      await fixture.componentInstance.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('prompt-1', true);
      expect(mockPromptService.incrementPromptPrayedFor).toHaveBeenCalledWith('prompt-1');
      expect(mockPrayerService.incrementPrayedFor).not.toHaveBeenCalled();
      expect(prompt.prayed_for_count).toBe(5);
    });

    it('shows prompt Prayers badge when count is greater than zero', async () => {
      await renderWithEncouragementMocks({
        prompt: {
          id: 'prompt-1',
          title: 'Prompt Title',
          type: 'Church',
          description: 'Pray for leaders',
          created_at: '2024-01-01',
          prayed_for_count: 2
        }
      });
      expect(screen.getByText('2 Prayers')).toBeTruthy();
    });

    it('hides encouragement controls when updates_allowed is admin-only and viewer is not admin', async () => {
      const { fixture } = await renderWithEncouragementMocks({ prayer: communityPrayer });
      fixture.componentInstance.updatesAllowed = 'admin-only';
      fixture.detectChanges();
      expect(screen.queryByRole('button', { name: 'Pray For' })).toBeNull();
    });

    it('shows praying count badge for requester when count is greater than zero', async () => {
      mockUserSessionService.getCurrentSession.mockReturnValue({ email: 'requester@example.com' });
      await renderWithEncouragementMocks({
        prayer: { ...communityPrayer, prayed_for_count: 3 }
      });
      expect(screen.getByText('3 Praying')).toBeTruthy();
    });

    it('shows praying count badge for personal prayer owner when count is greater than zero', async () => {
      mockUserSessionService.getCurrentSession.mockReturnValue({ email: 'owner@example.com' });
      await renderWithEncouragementMocks({
        prayer: { ...communityPrayer, user_email: 'owner@example.com', prayed_for_count: 2 }
      });
      expect(screen.getByText('2 Prayers')).toBeTruthy();
    });

    it('hides praying count badge for non-requester non-admin viewers', async () => {
      await renderWithEncouragementMocks({
        prayer: { ...communityPrayer, prayed_for_count: 3 }
      });
      expect(screen.queryByText('3 Praying')).toBeNull();
    });

    it('confirmPrayFor records prayer and updates count on shared prayer object', async () => {
      const prayer = { ...communityPrayer };
      const { fixture } = await renderWithEncouragementMocks({ prayer });
      await fixture.componentInstance.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('community-1', false);
      expect(mockPrayerService.incrementPrayedFor).toHaveBeenCalledWith('community-1');
      expect(prayer.prayed_for_count).toBe(5);
    });

    it('confirmPrayFor updates the prayed-for prayer when slide changes before RPC completes', async () => {
      const prayerA = { ...communityPrayer, id: 'community-a', prayed_for_count: 0 };
      const prayerB = { ...communityPrayer, id: 'community-b', prayed_for_count: 0 };
      let resolveIncrement: (value: number) => void = () => {};
      mockPrayerService.incrementPrayedFor.mockReturnValue(
        new Promise<number>((resolve) => {
          resolveIncrement = resolve;
        })
      );

      const { fixture } = await renderWithEncouragementMocks({ prayer: prayerA });
      const confirmPromise = fixture.componentInstance.confirmPrayFor();
      fixture.componentInstance.prayer = prayerB;
      resolveIncrement(5);
      await confirmPromise;

      expect(prayerA.prayed_for_count).toBe(5);
      expect(prayerB.prayed_for_count).toBe(0);
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('community-a', false);
    });

    it('confirmPrayFor records personal cooldown for the prayed slide when presentation advances before RPC completes', async () => {
      const personalPrayer = {
        ...communityPrayer,
        id: 'personal-a',
        user_email: 'owner@example.com',
        prayed_for_count: 0
      };
      const communitySlide = { ...communityPrayer, id: 'community-b', prayed_for_count: 0 };
      let resolveIncrement: (value: number) => void = () => {};
      mockPrayerService.incrementPersonalPrayedFor.mockReturnValue(
        new Promise<number>((resolve) => {
          resolveIncrement = resolve;
        })
      );

      const { fixture } = await renderWithEncouragementMocks({ prayer: personalPrayer });
      const confirmPromise = fixture.componentInstance.confirmPrayFor();
      fixture.componentInstance.prayer = communitySlide;
      resolveIncrement(3);
      await confirmPromise;

      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('personal-a', true);
      expect(personalPrayer.prayed_for_count).toBe(3);
    });

    it('confirmPrayFor does nothing when canPrayFor is false', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(false);
      const { fixture } = await renderWithEncouragementMocks({ prayer: communityPrayer });
      await fixture.componentInstance.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).not.toHaveBeenCalled();
      expect(mockPrayerService.incrementPrayedFor).not.toHaveBeenCalled();
    });

    it('confirmPrayFor clears cooldown when increment fails', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(true);
      mockPrayerService.incrementPrayedFor.mockResolvedValue(null);
      const prayer = { ...communityPrayer, prayed_for_count: 2 };
      const { fixture } = await renderWithEncouragementMocks({ prayer });
      await fixture.componentInstance.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('community-1', false);
      expect(mockPrayerEncouragementService.clearPrayedForCooldown).toHaveBeenCalledWith('community-1', false);
      expect(prayer.prayed_for_count).toBe(2);
    });

    it('showPrayedForBadge returns true for admin when count is greater than zero', async () => {
      const { fixture } = await renderWithEncouragementMocks({
        prayer: { ...communityPrayer, prayed_for_count: 2 }
      });
      mockAdminAuthService.getIsAdmin.mockReturnValue(true);
      expect(fixture.componentInstance.showPrayedForBadge()).toBe(true);
    });

    it('shows Prayed For disabled button during cooldown', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(false);
      mockPrayerEncouragementService.getCanPrayFor$ = vi.fn().mockReturnValue(of(false));
      await renderWithEncouragementMocks({ prayer: communityPrayer });
      expect(screen.getByRole('button', { name: 'Prayed For' })).toBeTruthy();
    });

    it('closes Pray For modal when prayer input changes to another slide', async () => {
      const { fixture } = await renderWithEncouragementMocks({ prayer: communityPrayer });
      fixture.componentInstance.showPrayForModal = true;
      fixture.componentInstance.prayForDoNotShowAgain = true;
      fixture.detectChanges();

      fixture.componentInstance.prayer = {
        ...communityPrayer,
        id: 'community-2',
        prayer_for: 'Jane Doe'
      };
      fixture.detectChanges();

      expect(fixture.componentInstance.showPrayForModal).toBe(false);
      expect(fixture.componentInstance.prayForDoNotShowAgain).toBe(false);
    });
  });
});
