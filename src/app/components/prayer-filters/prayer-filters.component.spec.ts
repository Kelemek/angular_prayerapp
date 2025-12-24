import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { PrayerFiltersComponent, PrayerFilters } from './prayer-filters.component';

describe('PrayerFiltersComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(PrayerFiltersComponent);
    
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('default properties', () => {
    it('should have default filters as empty object', async () => {
      const { fixture } = await render(PrayerFiltersComponent);
      
      expect(fixture.componentInstance.filters).toEqual({});
    });
  });

  describe('search functionality', () => {
    it('should display search input', async () => {
      await render(PrayerFiltersComponent);
      
      const searchInput = screen.getByPlaceholderText('Search prayers...');
      expect(searchInput).toBeTruthy();
    });

    it('should bind search term to input', async () => {
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'test search' }
        }
      });
      
      const searchInput = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      expect(searchInput.value).toBe('test search');
    });

    it('should update search term when typing', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PrayerFiltersComponent);
      
      const searchInput = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      await user.type(searchInput, 'healing');
      
      expect(fixture.componentInstance.filters.searchTerm).toBe('healing');
    });

    it('should emit filtersChange when search term changes', async () => {
      const user = userEvent.setup();
      const filtersChangeSpy = vi.fn();
      
      await render(PrayerFiltersComponent, {
        componentProperties: {
          filtersChange: { emit: filtersChangeSpy } as any
        }
      });
      
      const searchInput = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      await user.type(searchInput, 'h');
      
      expect(filtersChangeSpy).toHaveBeenCalled();
    });
  });

  describe('onSearchChange method', () => {
    it('should emit filters with search term', async () => {
      const { fixture } = await render(PrayerFiltersComponent);
      const emitSpy = vi.spyOn(fixture.componentInstance.filtersChange, 'emit');
      
      fixture.componentInstance.onSearchChange('test');
      
      expect(emitSpy).toHaveBeenCalledWith({
        searchTerm: 'test'
      });
    });

    it('should emit filters with undefined for empty search term', async () => {
      const { fixture } = await render(PrayerFiltersComponent);
      const emitSpy = vi.spyOn(fixture.componentInstance.filtersChange, 'emit');
      
      fixture.componentInstance.onSearchChange('');
      
      expect(emitSpy).toHaveBeenCalledWith({
        searchTerm: undefined
      });
    });

    it('should preserve existing filters when updating search term', async () => {
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { status: 'current' as const, type: 'prompt' as const }
        }
      });
      const emitSpy = vi.spyOn(fixture.componentInstance.filtersChange, 'emit');
      
      fixture.componentInstance.onSearchChange('test');
      
      expect(emitSpy).toHaveBeenCalledWith({
        status: 'current',
        type: 'prompt',
        searchTerm: 'test'
      });
    });

    it('should handle null search term', async () => {
      const { fixture } = await render(PrayerFiltersComponent);
      const emitSpy = vi.spyOn(fixture.componentInstance.filtersChange, 'emit');
      
      fixture.componentInstance.onSearchChange(null as any);
      
      expect(emitSpy).toHaveBeenCalledWith({
        searchTerm: undefined
      });
    });
  });

  describe('clearFilters method', () => {
    it('should reset filters to empty object', async () => {
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'test', status: 'current' as const }
        }
      });
      
      fixture.componentInstance.clearFilters();
      
      expect(fixture.componentInstance.filters).toEqual({});
    });

    it('should emit empty filters object', async () => {
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'test' }
        }
      });
      const emitSpy = vi.spyOn(fixture.componentInstance.filtersChange, 'emit');
      
      fixture.componentInstance.clearFilters();
      
      expect(emitSpy).toHaveBeenCalledWith({});
    });
  });

  describe('clear button', () => {
    it('should not display clear button when no search term', async () => {
      await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: {}
        }
      });
      
      const clearButton = screen.queryByText('Clear search');
      expect(clearButton).toBeFalsy();
    });

    it('should display clear button when search term exists', async () => {
      await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'test' }
        }
      });
      
      const clearButton = screen.getByText('Clear search');
      expect(clearButton).toBeTruthy();
    });

    it('should call clearFilters when clicked', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'test' }
        }
      });
      const clearFiltersSpy = vi.spyOn(fixture.componentInstance, 'clearFilters');
      
      const clearButton = screen.getByText('Clear search');
      await user.click(clearButton);
      
      expect(clearFiltersSpy).toHaveBeenCalledOnce();
    });

    it('should clear search input when clear button is clicked', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'test' }
        }
      });
      
      const clearButton = screen.getByText('Clear search');
      await user.click(clearButton);
      
      const searchInput = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      expect(searchInput.value).toBe('');
    });
  });

  describe('template rendering', () => {
    it('should render search icon', async () => {
      const { container } = await render(PrayerFiltersComponent);
      
      const searchIcon = container.querySelector('svg');
      expect(searchIcon).toBeTruthy();
    });

    it('should render with correct container styling', async () => {
      const { container } = await render(PrayerFiltersComponent);
      
      const mainDiv = container.querySelector('.bg-white');
      expect(mainDiv).toBeTruthy();
      expect(mainDiv?.classList.contains('rounded-lg')).toBe(true);
      expect(mainDiv?.classList.contains('shadow-md')).toBe(true);
    });

    it('should have search input with correct classes', async () => {
      await render(PrayerFiltersComponent);
      
      const searchInput = screen.getByPlaceholderText('Search prayers...');
      expect(searchInput.classList.contains('pl-10')).toBe(true);
      expect(searchInput.classList.contains('pr-3')).toBe(true);
      expect(searchInput.classList.contains('py-3')).toBe(true);
      expect(searchInput.classList.contains('w-full')).toBe(true);
    });

    it('should render dark mode classes', async () => {
      const { container } = await render(PrayerFiltersComponent);
      
      const mainDiv = container.querySelector('.dark\\:bg-gray-800');
      expect(mainDiv).toBeTruthy();
    });
  });

  describe('input bindings', () => {
    it('should accept filters input', async () => {
      const filters: PrayerFilters = { searchTerm: 'test', status: 'current' };
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters
        }
      });
      
      expect(fixture.componentInstance.filters).toEqual(filters);
    });

    it('should update when filters input changes', async () => {
      const { fixture, rerender } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'first' }
        }
      });
      
      expect(fixture.componentInstance.filters.searchTerm).toBe('first');
      
      await rerender({
        componentProperties: {
          filters: { searchTerm: 'second' }
        }
      });
      
      expect(fixture.componentInstance.filters.searchTerm).toBe('second');
    });
  });

  describe('output events', () => {
    it('should have filtersChange output', async () => {
      const { fixture } = await render(PrayerFiltersComponent);
      
      expect(fixture.componentInstance.filtersChange).toBeTruthy();
      expect(typeof fixture.componentInstance.filtersChange.emit).toBe('function');
    });
  });

  describe('filter types', () => {
    it('should handle status filter', async () => {
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { status: 'answered' as const }
        }
      });
      
      expect(fixture.componentInstance.filters.status).toBe('answered');
    });

    it('should handle type filter', async () => {
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { type: 'prompt' as const }
        }
      });
      
      expect(fixture.componentInstance.filters.type).toBe('prompt');
    });

    it('should handle multiple filters', async () => {
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { 
            searchTerm: 'healing',
            status: 'current' as const,
            type: 'prompt' as const
          }
        }
      });
      
      expect(fixture.componentInstance.filters).toEqual({
        searchTerm: 'healing',
        status: 'current',
        type: 'prompt'
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper input type', async () => {
      await render(PrayerFiltersComponent);
      
      const searchInput = screen.getByPlaceholderText('Search prayers...');
      expect(searchInput.getAttribute('type')).toBe('text');
    });

    it('should have placeholder text', async () => {
      await render(PrayerFiltersComponent);
      
      const searchInput = screen.getByPlaceholderText('Search prayers...');
      expect(searchInput.getAttribute('placeholder')).toBe('Search prayers...');
    });

    it('should have clickable clear button', async () => {
      await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'test' }
        }
      });
      
      const clearButton = screen.getByText('Clear search');
      expect(clearButton.tagName).toBe('BUTTON');
    });
  });

  describe('user interactions', () => {
    it('should handle rapid typing', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PrayerFiltersComponent);
      const emitSpy = vi.spyOn(fixture.componentInstance.filtersChange, 'emit');
      
      const searchInput = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      await user.type(searchInput, 'test');
      
      expect(emitSpy).toHaveBeenCalled();
      expect(searchInput.value).toContain('test');
    });

    it('should handle backspace', async () => {
      const user = userEvent.setup();
      const { fixture } = await render(PrayerFiltersComponent, {
        componentProperties: {
          filters: { searchTerm: 'test' }
        }
      });
      
      const searchInput = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      await user.clear(searchInput);
      
      expect(searchInput.value).toBe('');
    });

    it('should handle paste', async () => {
      const user = userEvent.setup();
      await render(PrayerFiltersComponent);
      
      const searchInput = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      await user.click(searchInput);
      await user.paste('pasted text');
      
      expect(searchInput.value).toContain('pasted');
    });
  });
});
