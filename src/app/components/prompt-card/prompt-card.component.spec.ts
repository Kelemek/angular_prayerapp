import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { PromptCardComponent, PrayerPrompt } from './prompt-card.component';

describe('PromptCardComponent', () => {
  const mockPrompt: PrayerPrompt = {
    id: '123',
    title: 'Test Prompt',
    type: 'Morning',
    description: 'This is a test prompt description',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  it('should create', async () => {
    const { fixture } = await render(PromptCardComponent, {
      componentProperties: {
        prompt: mockPrompt
      }
    });
    
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('default properties', () => {
    it('should have default isAdmin as false', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(fixture.componentInstance.isAdmin).toBe(false);
    });

    it('should have default isTypeSelected as false', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(fixture.componentInstance.isTypeSelected).toBe(false);
    });
  });

  describe('prompt display', () => {
    it('should display prompt title', async () => {
      await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(screen.getByText('Test Prompt')).toBeTruthy();
    });

    it('should display prompt description', async () => {
      await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(screen.getByText('This is a test prompt description')).toBeTruthy();
    });

    it('should display prompt type', async () => {
      await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(screen.getByText('Morning')).toBeTruthy();
    });

    it('should display multi-line description', async () => {
      const multiLinePrompt = {
        ...mockPrompt,
        description: 'Line 1\nLine 2\nLine 3'
      };
      
      const { container } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: multiLinePrompt
        }
      });
      
      const description = container.querySelector('.whitespace-pre-wrap');
      expect(description?.textContent?.trim()).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('type badge interaction', () => {
    it('should emit onTypeClick when type badge is clicked', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      const onTypeClickSpy = vi.fn();
      fixture.componentInstance.onTypeClick.subscribe(onTypeClickSpy);
      
      const typeButton = screen.getByText('Morning').closest('button')!;
      await user.click(typeButton);
      
      expect(onTypeClickSpy).toHaveBeenCalledWith('Morning');
    });

    it('should apply selected styling when isTypeSelected is true', async () => {
      const { container } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isTypeSelected: true
        }
      });
      
      const typeButton = screen.getByText('Morning').closest('button')!;
      expect(typeButton.className).toContain('bg-[#988F83]');
      expect(typeButton.className).toContain('text-white');
    });

    it('should apply default styling when isTypeSelected is false', async () => {
      const { container } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isTypeSelected: false
        }
      });
      
      const typeButton = screen.getByText('Morning').closest('button')!;
      expect(typeButton.className).toContain('bg-gray-100');
      expect(typeButton.className).toContain('dark:bg-gray-700');
    });

    it('should have correct title attribute when not selected', async () => {
      await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isTypeSelected: false
        }
      });
      
      const typeButton = screen.getByText('Morning').closest('button')!;
      expect(typeButton.getAttribute('title')).toBe('Filter by Morning');
    });

    it('should have correct title attribute when selected', async () => {
      await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isTypeSelected: true
        }
      });
      
      const typeButton = screen.getByText('Morning').closest('button')!;
      expect(typeButton.getAttribute('title')).toBe('Remove Morning filter');
    });
  });

  describe('delete button', () => {
    beforeEach(() => {
      // Mock window.confirm
      global.confirm = vi.fn();
    });

    it('should not show delete button when isAdmin is false', async () => {
      const { container } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isAdmin: false
        }
      });
      
      const deleteButtons = container.querySelectorAll('[title="Delete prompt"]');
      expect(deleteButtons).toHaveLength(0);
    });

    it('should show delete button when isAdmin is true', async () => {
      const { container } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isAdmin: true
        }
      });
      
      const deleteButtons = container.querySelectorAll('[title="Delete prompt"]');
      expect(deleteButtons).toHaveLength(1);
    });

    it('should call handleDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const { fixture, container } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isAdmin: true
        }
      });
      
      const handleDeleteSpy = vi.spyOn(fixture.componentInstance, 'handleDelete');
      
      const deleteButton = container.querySelector('[title="Delete prompt"]') as HTMLElement;
      await user.click(deleteButton);
      
      expect(handleDeleteSpy).toHaveBeenCalled();
    });
  });

  describe('handleDelete method', () => {
    beforeEach(() => {
      // Mock window.confirm
      global.confirm = vi.fn();
    });

    it('should emit delete event with prompt id when confirmed', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isAdmin: true
        }
      });
      
      const deleteSpy = vi.fn();
      fixture.componentInstance.delete.subscribe(deleteSpy);
      
      // Mock window.confirm to return true
      (global.confirm as any).mockReturnValue(true);
      
      fixture.componentInstance.handleDelete();
      
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this prayer prompt?');
      expect(deleteSpy).toHaveBeenCalledWith('123');
    });

    it('should not emit delete event when cancelled', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isAdmin: true
        }
      });
      
      const deleteSpy = vi.fn();
      fixture.componentInstance.delete.subscribe(deleteSpy);
      
      // Mock window.confirm to return false
      (global.confirm as any).mockReturnValue(false);
      
      fixture.componentInstance.handleDelete();
      
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this prayer prompt?');
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });

  describe('event emitters', () => {
    it('should have delete event emitter', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(fixture.componentInstance.delete).toBeTruthy();
    });

    it('should have onTypeClick event emitter', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(fixture.componentInstance.onTypeClick).toBeTruthy();
    });

    it('should emit correct prompt id on delete', async () => {
      const customPrompt = { ...mockPrompt, id: 'custom-id-456' };
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: customPrompt,
          isAdmin: true
        }
      });
      
      const deleteSpy = vi.fn();
      fixture.componentInstance.delete.subscribe(deleteSpy);
      
      (global.confirm as any).mockReturnValue(true);
      
      fixture.componentInstance.handleDelete();
      
      expect(deleteSpy).toHaveBeenCalledWith('custom-id-456');
    });

    it('should emit correct type on type click', async () => {
      const customPrompt = { ...mockPrompt, type: 'Evening' };
      const user = userEvent.setup();
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: customPrompt
        }
      });
      
      const onTypeClickSpy = vi.fn();
      fixture.componentInstance.onTypeClick.subscribe(onTypeClickSpy);
      
      const typeButton = screen.getByText('Evening').closest('button')!;
      await user.click(typeButton);
      
      expect(onTypeClickSpy).toHaveBeenCalledWith('Evening');
    });
  });

  describe('input property bindings', () => {
    it('should accept and use prompt input', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(fixture.componentInstance.prompt).toEqual(mockPrompt);
    });

    it('should accept and use isAdmin input', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isAdmin: true
        }
      });
      
      expect(fixture.componentInstance.isAdmin).toBe(true);
    });

    it('should accept and use isTypeSelected input', async () => {
      const { fixture } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isTypeSelected: true
        }
      });
      
      expect(fixture.componentInstance.isTypeSelected).toBe(true);
    });

    it('should update when prompt changes', async () => {
      const { fixture, rerender } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt
        }
      });
      
      expect(fixture.componentInstance.prompt).toEqual(mockPrompt);
      
      const newPrompt = { ...mockPrompt, title: 'Updated Title' };
      await rerender({
        componentProperties: {
          prompt: newPrompt
        }
      });
      
      expect(fixture.componentInstance.prompt).toEqual(newPrompt);
    });

    it('should update when isAdmin changes', async () => {
      const { fixture, rerender } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isAdmin: false
        }
      });
      
      expect(fixture.componentInstance.isAdmin).toBe(false);
      
      await rerender({
        componentProperties: {
          prompt: mockPrompt,
          isAdmin: true
        }
      });
      
      expect(fixture.componentInstance.isAdmin).toBe(true);
    });

    it('should update when isTypeSelected changes', async () => {
      const { fixture, rerender } = await render(PromptCardComponent, {
        componentProperties: {
          prompt: mockPrompt,
          isTypeSelected: false
        }
      });
      
      expect(fixture.componentInstance.isTypeSelected).toBe(false);
      
      await rerender({
        componentProperties: {
          prompt: mockPrompt,
          isTypeSelected: true
        }
      });
      
      expect(fixture.componentInstance.isTypeSelected).toBe(true);
    });
  });
});
