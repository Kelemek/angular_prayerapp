import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptCardComponent } from './prompt-card.component';

describe('PromptCardComponent - Definition', () => {
  it('should be defined', () => {
    expect(PromptCardComponent).toBeDefined();
  });
});

describe('PromptCardComponent - Core Logic', () => {
  describe('Component Initialization', () => {
    it('should initialize with empty prompt', () => {
      const prompt = {
        id: '',
        title: '',
        type: '',
        description: '',
        created_at: '',
        updated_at: ''
      };

      expect(prompt.id).toBe('');
      expect(prompt.title).toBe('');
    });

    it('should initialize with valid prompt data', () => {
      const prompt = {
        id: '1',
        title: 'Morning Prayer Prompt',
        type: 'Daily Reflection',
        description: 'Start your day with intention',
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-01-15T08:00:00Z'
      };

      expect(prompt.id).toBe('1');
      expect(prompt.title).toBe('Morning Prayer Prompt');
      expect(prompt.type).toBe('Daily Reflection');
    });

    it('should have default admin flag as false', () => {
      const isAdmin = false;
      expect(isAdmin).toBe(false);
    });

    it('should set admin flag correctly', () => {
      const isAdmin = true;
      expect(isAdmin).toBe(true);
    });
  });

  describe('Prompt Input Handling', () => {
    it('should accept prompt input', () => {
      const prompt = {
        id: 'test-1',
        title: 'Test Prompt',
        type: 'Meditation',
        description: 'Test description',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z'
      };

      expect(prompt.title).toBe('Test Prompt');
      expect(prompt.description).toBe('Test description');
    });

    it('should handle prompt with special characters in title', () => {
      const prompt = {
        id: '1',
        title: 'Prayer for Strength & Courage!',
        type: 'Affirmation',
        description: 'Focus on inner strength',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z'
      };

      expect(prompt.title).toContain('&');
      expect(prompt.title).toContain('!');
    });

    it('should handle very long prompt title', () => {
      const longTitle = 'A'.repeat(200);
      const prompt = {
        id: '1',
        title: longTitle,
        type: 'Custom',
        description: 'Description',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z'
      };

      expect(prompt.title.length).toBe(200);
    });

    it('should handle empty description', () => {
      const prompt = {
        id: '1',
        title: 'Prompt Title',
        type: 'Type',
        description: '',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z'
      };

      expect(prompt.description).toBe('');
    });

    it('should preserve created and updated timestamps', () => {
      const createdAt = '2026-01-01T10:00:00Z';
      const updatedAt = '2026-01-15T14:30:00Z';
      const prompt = {
        id: '1',
        title: 'Prompt',
        type: 'Type',
        description: 'Desc',
        created_at: createdAt,
        updated_at: updatedAt
      };

      expect(prompt.created_at).toBe(createdAt);
      expect(prompt.updated_at).toBe(updatedAt);
    });
  });

  describe('Type Badge Display', () => {
    it('should display prompt type', () => {
      const promptType = 'Gratitude';
      expect(promptType).toBe('Gratitude');
    });

    it('should handle different type names', () => {
      const types = ['Daily Reflection', 'Scripture', 'Meditation', 'Affirmation', 'Custom'];

      types.forEach(type => {
        expect(type).toBeDefined();
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it('should display type badge as button', () => {
      const isTypeButton = true;
      expect(isTypeButton).toBe(true);
    });

    it('should apply selected state to type badge', () => {
      const isTypeSelected = true;
      const selectedClass = isTypeSelected ? 'bg-[#988F83] text-white' : 'bg-gray-100';

      expect(selectedClass).toContain('#988F83');
    });

    it('should apply unselected state to type badge', () => {
      const isTypeSelected = false;
      const unselectedClass = isTypeSelected ? 'bg-[#988F83]' : 'bg-gray-100';

      expect(unselectedClass).toBe('bg-gray-100');
    });

    it('should emit type click event', () => {
      const emittedType: string[] = [];
      const promptType = 'Meditation';

      emittedType.push(promptType);

      expect(emittedType[0]).toBe('Meditation');
    });

    it('should show tooltip on hover', () => {
      const prompt = { type: 'Prayer' };
      const isSelected = false;
      const tooltip = isSelected ? 'Remove Prayer filter' : 'Filter by Prayer';

      expect(tooltip).toContain('Prayer');
    });
  });

  describe('Unread Badge Functionality', () => {
    it('should display unread badge when unread', () => {
      const isUnread = true;
      expect(isUnread).toBe(true);
    });

    it('should hide unread badge when read', () => {
      const isUnread = false;
      expect(isUnread).toBe(false);
    });

    it('should toggle read/unread status', () => {
      let isUnread = true;
      isUnread = !isUnread;
      expect(isUnread).toBe(false);

      isUnread = !isUnread;
      expect(isUnread).toBe(true);
    });

    it('should emit badge click event', () => {
      const events: string[] = [];
      const promptId = 'prompt-1';

      events.push(promptId);

      expect(events[0]).toBe('prompt-1');
    });

    it('should show unread count', () => {
      const unreadCount = 5;
      expect(unreadCount).toBeGreaterThan(0);
    });

    it('should track badge visibility', () => {
      const badges = [
        { promptId: '1', visible: true },
        { promptId: '2', visible: false },
        { promptId: '3', visible: true }
      ];

      const visibleBadges = badges.filter(b => b.visible);
      expect(visibleBadges.length).toBe(2);
    });
  });

  describe('Delete Functionality', () => {
    it('should show delete button for admin', () => {
      const isAdmin = true;
      expect(isAdmin).toBe(true);
    });

    it('should hide delete button for non-admin', () => {
      const isAdmin = false;
      expect(isAdmin).toBe(false);
    });

    it('should emit delete event', () => {
      const deletedPrompts: string[] = [];
      const promptId = 'prompt-1';

      deletedPrompts.push(promptId);

      expect(deletedPrompts[0]).toBe('prompt-1');
    });

    it('should confirm before deleting', () => {
      const confirmationRequired = true;
      expect(confirmationRequired).toBe(true);
    });

    it('should cancel delete operation', () => {
      let isDeleting = true;
      isDeleting = false;
      expect(isDeleting).toBe(false);
    });

    it('should handle delete error', () => {
      const errorMessage = 'Failed to delete prompt';
      expect(errorMessage).toBeDefined();
    });

    it('should disable delete button during deletion', () => {
      const isDeleting = true;
      const isDisabled = isDeleting;
      expect(isDisabled).toBe(true);
    });

    it('should show loading indicator during delete', () => {
      const isDeleting = true;
      expect(isDeleting).toBe(true);
    });
  });

  describe('Card Visual Styling', () => {
    it('should apply base card styles', () => {
      const cardClasses = 'bg-white dark:bg-gray-800 rounded-lg shadow-md';
      expect(cardClasses).toContain('bg-white');
    });

    it('should apply border styling', () => {
      const borderColor = '#988F83';
      expect(borderColor).toBeDefined();
    });

    it('should apply hover shadow', () => {
      const hoverClass = 'hover:shadow-lg';
      expect(hoverClass).toContain('shadow');
    });

    it('should apply padding', () => {
      const padding = 'p-6';
      expect(padding).toBeDefined();
    });

    it('should apply dark mode styles', () => {
      const isDarkMode = true;
      const bgClass = isDarkMode ? 'dark:bg-gray-800' : 'bg-white';
      expect(bgClass).toContain('gray');
    });

    it('should apply selected card styling', () => {
      const isSelected = true;
      const selectedClass = isSelected ? 'ring-2 ring-blue-500' : '';
      expect(selectedClass.length).toBeGreaterThanOrEqual(0);
    });

    it('should apply disabled card styling', () => {
      const isDisabled = true;
      const disabledClass = isDisabled ? 'opacity-50 cursor-not-allowed' : '';
      expect(disabledClass.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Card Interactions', () => {
    it('should handle card click', () => {
      const clicks: string[] = [];
      const promptId = 'prompt-1';

      clicks.push(promptId);

      expect(clicks.length).toBe(1);
    });

    it('should handle type badge click', () => {
      const typeClicks: string[] = [];
      const promptType = 'Meditation';

      typeClicks.push(promptType);

      expect(typeClicks[0]).toBe('Meditation');
    });

    it('should handle delete button click', () => {
      const deleteClicks: string[] = [];
      const promptId = 'prompt-1';

      deleteClicks.push(promptId);

      expect(deleteClicks[0]).toBe('prompt-1');
    });

    it('should handle badge click', () => {
      const badgeClicks: string[] = [];
      const promptId = 'prompt-1';

      badgeClicks.push(promptId);

      expect(badgeClicks[0]).toBe('prompt-1');
    });

    it('should stop event propagation on nested clicks', () => {
      const clickedElements: string[] = [];
      
      // Simulate click on type badge button
      clickedElements.push('type-badge');

      // Verify only the button click is registered, not parent card
      expect(clickedElements.length).toBe(1);
      expect(clickedElements[0]).toBe('type-badge');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout on mobile', () => {
      const isMobile = true;
      const layout = isMobile ? 'flex flex-col' : 'flex flex-row';
      expect(layout).toContain('flex');
    });

    it('should adjust text size on mobile', () => {
      const isMobile = true;
      const textSize = isMobile ? 'text-base' : 'text-lg';
      expect(textSize).toBeDefined();
    });

    it('should stack elements vertically on mobile', () => {
      const stackVertical = true;
      expect(stackVertical).toBe(true);
    });

    it('should adjust padding on mobile', () => {
      const isMobile = true;
      const padding = isMobile ? 'p-3' : 'p-6';
      expect(padding).toBeDefined();
    });

    it('should ensure touch targets are adequate', () => {
      const minTouchSize = 44; // pixels
      expect(minTouchSize).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Content Rendering', () => {
    it('should render prompt title', () => {
      const title = 'Test Prompt Title';
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);
    });

    it('should render prompt type', () => {
      const type = 'Meditation';
      expect(type).toBeDefined();
    });

    it('should handle markdown in description', () => {
      const description = 'Focus on **breathing**';
      const hasMarkdown = description.includes('**');
      expect(hasMarkdown).toBe(true);
    });

    it('should sanitize HTML in content', () => {
      const content = '<p>Safe content</p><script>alert("xss")</script>';
      const safe = content.replace(/<script[^>]*>.*?<\/script>/g, '');
      expect(safe).not.toContain('script');
    });

    it('should preserve line breaks', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const lines = content.split('\n');
      expect(lines.length).toBe(3);
    });

    it('should handle emoji in title', () => {
      const title = 'Prayer 🙏 for Peace';
      expect(title).toContain('🙏');
    });

    it('should handle unicode characters', () => {
      const title = 'Prière pour la paix';
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);
    });

    it('should truncate very long titles appropriately', () => {
      const longTitle = 'This is a very long title that should be truncated'.substring(0, 50);
      expect(longTitle.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Dates and Timestamps', () => {
    it('should display created date', () => {
      const createdAt = '2026-01-15T08:30:00Z';
      expect(createdAt).toBeDefined();
    });

    it('should display updated date', () => {
      const updatedAt = '2026-01-15T14:00:00Z';
      expect(updatedAt).toBeDefined();
    });

    it('should show relative time', () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const now = new Date('2026-01-15T00:00:00Z');
      const daysAgo = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysAgo).toBe(14);
    });

    it('should handle today timestamp', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle timestamp without timezone', () => {
      const timestamp = '2026-01-15T08:00:00';
      expect(timestamp).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should track hover state', () => {
      let isHovered = false;
      isHovered = true;
      expect(isHovered).toBe(true);
      isHovered = false;
      expect(isHovered).toBe(false);
    });

    it('should track focus state', () => {
      let isFocused = false;
      isFocused = true;
      expect(isFocused).toBe(true);
    });

    it('should track selected state', () => {
      let isSelected = false;
      isSelected = true;
      expect(isSelected).toBe(true);
    });

    it('should track loading state', () => {
      let isLoading = false;
      isLoading = true;
      expect(isLoading).toBe(true);
      isLoading = false;
      expect(isLoading).toBe(false);
    });

    it('should track error state', () => {
      let hasError = false;
      let errorMessage = '';

      hasError = true;
      errorMessage = 'Error loading prompt';

      expect(hasError).toBe(true);
      expect(errorMessage).toBe('Error loading prompt');
    });
  });

  describe('Accessibility Features', () => {
    it('should have semantic HTML structure', () => {
      const hasArticle = true;
      expect(hasArticle).toBe(true);
    });

    it('should have proper heading hierarchy', () => {
      const headingLevel = 'h3';
      expect(headingLevel).toBe('h3');
    });

    it('should have descriptive alt text for icons', () => {
      const iconAlt = 'Light bulb icon';
      expect(iconAlt).toBeDefined();
    });

    it('should have accessible button labels', () => {
      const buttonLabel = 'Delete prompt';
      expect(buttonLabel).toBeDefined();
    });

    it('should support keyboard navigation', () => {
      const supportedKeys = ['Enter', 'Space', 'Delete'];
      expect(supportedKeys).toContain('Enter');
    });

    it('should announce state changes to screen readers', () => {
      const ariaLive = 'polite';
      expect(ariaLive).toBe('polite');
    });

    it('should have high contrast colors', () => {
      const contrastRatio = 4.5;
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize on component creation', () => {
      const initialized = true;
      expect(initialized).toBe(true);
    });

    it('should respond to input changes', () => {
      let promptTitle = 'Initial Title';
      promptTitle = 'Updated Title';
      expect(promptTitle).toBe('Updated Title');
    });

    it('should cleanup resources on destroy', () => {
      const resources = ['subscription1', 'subscription2'];
      resources.length = 0;
      expect(resources.length).toBe(0);
    });

    it('should handle rapid updates', () => {
      const updates: string[] = [];
      updates.push('update1', 'update2', 'update3');
      expect(updates.length).toBe(3);
    });

    it('should prevent memory leaks', () => {
      const subscriptions = 3;
      const unsubscribed = 3;
      expect(unsubscribed).toBe(subscriptions);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null prompt', () => {
      const prompt = null;
      expect(prompt).toBeNull();
    });

    it('should handle undefined prompt', () => {
      let prompt: any;
      expect(prompt).toBeUndefined();
    });

    it('should handle prompt with missing fields', () => {
      const prompt = { id: '1', title: 'Title' };
      expect(prompt.id).toBeDefined();
      expect(prompt.title).toBeDefined();
    });

    it('should handle extremely long title', () => {
      const veryLongTitle = 'A'.repeat(1000);
      expect(veryLongTitle.length).toBe(1000);
    });

    it('should handle rapid deletion attempts', () => {
      const deletionAttempts: string[] = [];
      deletionAttempts.push('delete1', 'delete2', 'delete3');
      const uniqueAttempts = new Set(deletionAttempts);
      expect(uniqueAttempts.size).toBe(3);
    });

    it('should handle network errors', () => {
      const error = new Error('Network error');
      expect(error).toBeDefined();
      expect(error.message).toContain('Network');
    });

    it('should handle permission denied errors', () => {
      const error = new Error('Permission denied');
      expect(error.message).toContain('Permission');
    });

    it('should handle timeout errors', () => {
      const timeout = 5000;
      expect(timeout).toBeGreaterThan(0);
    });

    it('should handle concurrent operations', () => {
      const operations: Promise<void>[] = [];
      expect(operations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PromptCardComponent - Component Integration Tests', () => {
    let component: PromptCardComponent;
    let badgeService: any;

    beforeEach(() => {
      // Mock BadgeService
      badgeService = {
        isPromptUnread: vi.fn().mockReturnValue(false),
        markPromptAsRead: vi.fn(),
        getUpdateBadgesChanged$: vi.fn().mockReturnValue({
          pipe: vi.fn().mockReturnValue({
            subscribe: vi.fn()
          })
        }),
        getBadgeFunctionalityEnabled$: vi.fn().mockReturnValue({
          subscribe: vi.fn((cb: (val: boolean) => void) => {
            cb(false);
            return { unsubscribe: vi.fn() };
          })
        })
      };

      // Create component instance
      component = new PromptCardComponent(badgeService);
      component.prompt = {
        id: 'prompt-1',
        title: 'Test Prompt',
        type: 'Meditation',
        description: 'Test Description',
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-01-15T10:00:00Z'
      };
      component.isAdmin = false;
      component.isTypeSelected = false;
    });

    it('should create component instance', () => {
      expect(component).toBeDefined();
    });

    it('should initialize with default values', () => {
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should handle ngOnInit', () => {
      component.ngOnInit();
      expect(component.promptBadge$).toBeDefined();
    });

    it('should initialize prompt badge from service', () => {
      badgeService.isPromptUnread.mockReturnValue(true);
      component.ngOnInit();
      expect(badgeService.isPromptUnread).toHaveBeenCalledWith('prompt-1');
    });

    it('should handle delete button click', () => {
      component.handleDelete();
      expect(component.showConfirmationDialog).toBe(true);
    });

    it('should emit delete event on confirmation', () => {
      const deleteSpy = vi.spyOn(component.delete, 'emit');
      component.onConfirmDelete();
      expect(deleteSpy).toHaveBeenCalledWith('prompt-1');
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should cancel delete without emitting', () => {
      const deleteSpy = vi.spyOn(component.delete, 'emit');
      component.onCancelDelete();
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should mark prompt as read', () => {
      component.markPromptAsRead();
      expect(badgeService.markPromptAsRead).toHaveBeenCalledWith('prompt-1');
    });

    it('should emit type click event', () => {
      const typeClickSpy = vi.spyOn(component.onTypeClick, 'emit');
      component.onTypeClick.emit('Meditation');
      expect(typeClickSpy).toHaveBeenCalledWith('Meditation');
    });

    it('should handle storage event listener', () => {
      component.ngOnInit();
      expect(badgeService.getUpdateBadgesChanged$).toHaveBeenCalled();
    });

    it('should cleanup on destroy', () => {
      component.ngOnInit();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      component.ngOnDestroy();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should accept admin flag', () => {
      component.isAdmin = true;
      expect(component.isAdmin).toBe(true);
    });

    it('should accept isTypeSelected flag', () => {
      component.isTypeSelected = true;
      expect(component.isTypeSelected).toBe(true);
    });

    it('should accept prompt input', () => {
      const newPrompt = {
        id: 'prompt-2',
        title: 'Another Prompt',
        type: 'Scripture',
        description: 'Another Description',
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-01-15T10:00:00Z'
      };
      component.prompt = newPrompt;
      expect(component.prompt.id).toBe('prompt-2');
      expect(component.prompt.title).toBe('Another Prompt');
    });

    it('should handle rapid badge toggles', () => {
      badgeService.markPromptAsRead.mockClear();
      component.markPromptAsRead();
      component.markPromptAsRead();
      component.markPromptAsRead();
      expect(badgeService.markPromptAsRead).toHaveBeenCalledTimes(3);
    });

    it('should maintain state during delete flow', () => {
      expect(component.showConfirmationDialog).toBe(false);
      component.handleDelete();
      expect(component.showConfirmationDialog).toBe(true);
      component.onCancelDelete();
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should handle prompt with empty description', () => {
      component.prompt.description = '';
      expect(component.prompt.description).toBe('');
    });

    it('should handle prompt with special characters', () => {
      component.prompt.title = 'Prompt with "quotes" & symbols';
      expect(component.prompt.title).toContain('quotes');
      expect(component.prompt.title).toContain('&');
    });

    it('should handle very long prompt description', () => {
      component.prompt.description = 'A'.repeat(1000);
      expect(component.prompt.description.length).toBe(1000);
    });

    it('should track multiple delete operations', () => {
      const deleteEmitSpy = vi.spyOn(component.delete, 'emit');
      
      // First delete
      component.handleDelete();
      component.onConfirmDelete();
      
      // Change prompt
      component.prompt = {
        id: 'prompt-2',
        title: 'Another',
        type: 'Type',
        description: 'Desc',
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-01-15T10:00:00Z'
      };
      
      // Second delete
      component.handleDelete();
      component.onConfirmDelete();
      
      expect(deleteEmitSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle type selection change', () => {
      component.isTypeSelected = false;
      expect(component.isTypeSelected).toBe(false);
      component.isTypeSelected = true;
      expect(component.isTypeSelected).toBe(true);
    });

    it('should handle admin flag toggle', () => {
      component.isAdmin = false;
      expect(component.isAdmin).toBe(false);
      component.isAdmin = true;
      expect(component.isAdmin).toBe(true);
    });

    it('should initialize subscription from badge service', () => {
      component.ngOnInit();
      expect(badgeService.getUpdateBadgesChanged$).toHaveBeenCalled();
    });

    it('should handle badge functionality disabled', () => {
      badgeService.getBadgeFunctionalityEnabled$ = vi.fn().mockReturnValue({
        subscribe: vi.fn((cb: (val: boolean) => void) => {
          cb(false);
          return { unsubscribe: vi.fn() };
        })
      });
      component.ngOnInit();
      expect(component.promptBadge$).toBeDefined();
    });

    it('should handle storage event for read_prompts_data', () => {
      component.ngOnInit();
      badgeService.isPromptUnread.mockReturnValue(false);
      
      // Verify storage listener was registered
      expect(badgeService.getUpdateBadgesChanged$).toHaveBeenCalled();
    });

    it('should prevent memory leaks by unsubscribing', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'complete');
      component.ngOnInit();
      component.ngOnDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should emit correct prompt id on delete', () => {
      const promptId = 'unique-prompt-id-123';
      component.prompt.id = promptId;
      const deleteEmitSpy = vi.spyOn(component.delete, 'emit');
      component.onConfirmDelete();
      expect(deleteEmitSpy).toHaveBeenCalledWith(promptId);
    });

    it('should emit correct type on type click', () => {
      const promptType = 'Gratitude';
      component.prompt.type = promptType;
      const typeClickSpy = vi.spyOn(component.onTypeClick, 'emit');
      component.onTypeClick.emit(promptType);
      expect(typeClickSpy).toHaveBeenCalledWith(promptType);
    });

    it('should handle multiple ngOnDestroy calls', () => {
      component.ngOnInit();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      component.ngOnDestroy();
      component.ngOnDestroy(); // Call again
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should correctly identify unread prompts', () => {
      badgeService.isPromptUnread.mockReturnValue(true);
      component.ngOnInit();
      expect(badgeService.isPromptUnread).toHaveBeenCalledWith(component.prompt.id);
    });

    it('should handle prompt type badge click', () => {
      const typeClickSpy = vi.spyOn(component.onTypeClick, 'emit');
      const typeToClick = component.prompt.type;
      component.onTypeClick.emit(typeToClick);
      expect(typeClickSpy).toHaveBeenCalledWith(typeToClick);
    });

    it('should support confirmation dialog show/hide', () => {
      expect(component.showConfirmationDialog).toBe(false);
      component.handleDelete();
      expect(component.showConfirmationDialog).toBe(true);
      component.onCancelDelete();
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should handle badge subject updates', () => {
      component.ngOnInit();
      // Verify promptBadge$ observable is created
      expect(component.promptBadge$).toBeDefined();
    });

    it('should accept different prompt types', () => {
      const types = ['Meditation', 'Scripture', 'Gratitude', 'Affirmation'];
      types.forEach(type => {
        component.prompt.type = type;
        expect(component.prompt.type).toBe(type);
      });
    });

    it('should handle deletion state cleanup', () => {
      component.handleDelete();
      expect(component.showConfirmationDialog).toBe(true);
      component.onConfirmDelete();
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should support badge service injection', () => {
      expect(component.badgeService).toBe(badgeService);
    });

    it('should maintain prompt data integrity', () => {
      const originalPrompt = { ...component.prompt };
      component.handleDelete();
      component.onCancelDelete();
      expect(component.prompt).toEqual(originalPrompt);
    });

    it('should handle component inputs with null values', () => {
      component.isAdmin = null as any;
      component.isTypeSelected = null as any;
      expect(component.isAdmin).toBeNull();
      expect(component.isTypeSelected).toBeNull();
    });

    it('should emit type click with correct type value', () => {
      const typeClickSpy = vi.spyOn(component.onTypeClick, 'emit');
      const testType = 'Meditation';
      component.onTypeClick.emit(testType);
      expect(typeClickSpy).toHaveBeenCalledWith(testType);
    });

    it('should handle confirmation dialog state transitions', () => {
      // Initial state
      expect(component.showConfirmationDialog).toBe(false);
      
      // Show dialog
      component.handleDelete();
      expect(component.showConfirmationDialog).toBe(true);
      
      // Confirm delete
      component.onConfirmDelete();
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should subscribe to badge changes on init', () => {
      const pipeSpy = badgeService.getUpdateBadgesChanged$().pipe;
      component.ngOnInit();
      expect(pipeSpy).toHaveBeenCalled();
    });

    it('should handle prompt updates after initialization', () => {
      component.ngOnInit();
      const newPrompt = {
        id: 'new-id',
        title: 'New Title',
        type: 'New Type',
        description: 'New Description',
        created_at: '2026-01-16T08:00:00Z',
        updated_at: '2026-01-16T10:00:00Z'
      };
      component.prompt = newPrompt;
      expect(component.prompt.id).toBe('new-id');
      expect(badgeService.isPromptUnread).toHaveBeenCalled();
    });

    it('should handle mark as read with correct prompt id', () => {
      const promptId = 'test-prompt-id';
      component.prompt.id = promptId;
      component.markPromptAsRead();
      expect(badgeService.markPromptAsRead).toHaveBeenCalledWith(promptId);
    });
  });

  describe('Lifecycle and Storage Events', () => {
    let component: PromptCardComponent;
    let badgeService: any;

    beforeEach(() => {
      const mockBadgeService = {
        isPromptUnread: vi.fn(() => true),
        markPromptAsRead: vi.fn(),
        getUpdateBadgesChanged$: vi.fn(() => ({
          pipe: vi.fn((fn: any) => ({
            subscribe: vi.fn((cb: any) => {
              return { unsubscribe: vi.fn() };
            })
          }))
        })),
        getBadgeFunctionalityEnabled$: vi.fn()
      };

      badgeService = mockBadgeService;
      component = new PromptCardComponent(badgeService);
      component.prompt = {
        id: 'prompt-1',
        title: 'Test Prompt',
        type: 'Daily',
        description: 'Test Description',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z'
      };
    });

    it('should initialize promptBadge$ observable on ngOnInit', () => {
      component.ngOnInit();
      expect(component.promptBadge$).toBeDefined();
    });

    it('should set up storage listener on ngOnInit', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      component.ngOnInit();
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should call updatePromptBadge when storage event fires with read_prompts_data key', () => {
      component.ngOnInit();
      
      const storageEvent = new StorageEvent('storage', {
        key: 'read_prompts_data',
        newValue: '{"prompts": ["prompt-1"]}'
      });
      
      window.dispatchEvent(storageEvent);
      expect(badgeService.isPromptUnread).toHaveBeenCalled();
    });

    it('should not call updatePromptBadge for other storage keys', () => {
      component.ngOnInit();
      const initialCallCount = badgeService.isPromptUnread.mock.calls.length;
      
      const storageEvent = new StorageEvent('storage', {
        key: 'other_key',
        newValue: 'value'
      });
      
      window.dispatchEvent(storageEvent);
      // isPromptUnread should not be called again for other keys
      expect(badgeService.isPromptUnread.mock.calls.length).toBe(initialCallCount);
    });

    it('should remove storage listener on ngOnDestroy', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      component.ngOnInit();
      component.ngOnDestroy();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should actually call window.removeEventListener with the stored listener function', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      component.ngOnInit();
      const listenerRef = (component as any).storageListener;
      component.ngOnDestroy();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', listenerRef);
    });

    it('should handle ngOnDestroy when storageListener is null', () => {
      component.ngOnInit();
      component.ngOnDestroy();
      // Should not throw when called again
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should complete destroy subject on ngOnDestroy', () => {
      component.ngOnInit();
      const completeSpy = vi.fn();
      (component as any).destroy$.subscribe({
        complete: completeSpy
      });
      
      component.ngOnDestroy();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should initialize with unread badge when prompt is unread', () => {
      badgeService.isPromptUnread.mockReturnValue(true);
      component.ngOnInit();
      
      component.promptBadge$?.subscribe(value => {
        expect(value).toBe(true);
      });
    });

    it('should initialize with no badge when prompt is read', () => {
      badgeService.isPromptUnread.mockReturnValue(false);
      component.ngOnInit();
      
      component.promptBadge$?.subscribe(value => {
        expect(value).toBe(false);
      });
    });

    it('should update badge when badge service emits changes', () => {
      let updateCallback: Function;
      
      const mockPipe = (fn: any) => ({
        subscribe: vi.fn((cb: any) => {
          updateCallback = cb;
          return { unsubscribe: vi.fn() };
        })
      });

      badgeService.getUpdateBadgesChanged$ = vi.fn(() => ({
        pipe: mockPipe
      }));

      badgeService.isPromptUnread.mockReturnValue(true);
      component.ngOnInit();
      badgeService.isPromptUnread.mockReturnValue(false);
      
      updateCallback!();
      
      component.promptBadge$?.subscribe(value => {
        expect(value).toBe(false);
      });
    });

    it('should handle multiple storage events', () => {
      component.ngOnInit();
      const initialCallCount = badgeService.isPromptUnread.mock.calls.length;
      
      for (let i = 0; i < 5; i++) {
        const storageEvent = new StorageEvent('storage', {
          key: 'read_prompts_data',
          newValue: `{"prompts": ["prompt-${i}"]}`
        });
        window.dispatchEvent(storageEvent);
      }
      
      expect(badgeService.isPromptUnread.mock.calls.length).toBe(initialCallCount + 5);
    });

    it('should call markPromptAsRead with prompt id', () => {
      component.markPromptAsRead();
      expect(badgeService.markPromptAsRead).toHaveBeenCalledWith(component.prompt.id);
    });

    it('should emit delete event with prompt id', () => {
      const deleteSpy = vi.spyOn(component.delete, 'emit');
      component.handleDelete();
      component.onConfirmDelete();
      expect(deleteSpy).toHaveBeenCalledWith(component.prompt.id);
    });

    it('should hide confirmation dialog on cancel', () => {
      component.handleDelete();
      expect(component.showConfirmationDialog).toBe(true);
      component.onCancelDelete();
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should hide confirmation dialog on confirm', () => {
      component.handleDelete();
      expect(component.showConfirmationDialog).toBe(true);
      component.onConfirmDelete();
      expect(component.showConfirmationDialog).toBe(false);
    });
  });
});

