import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { ThemeService } from '../../services/theme.service';

describe('ThemeToggleComponent', () => {
  let component: ThemeToggleComponent;
  let fixture: ComponentFixture<ThemeToggleComponent>;

  beforeEach(() => {
    localStorage.clear();
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    
    TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [ThemeService]
    });

    fixture = TestBed.createComponent(ThemeToggleComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges here - let individual tests control when it's called
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should inject ThemeService', () => {
      fixture.detectChanges();
      expect(component.themeService).toBeTruthy();
      expect(component.themeService).toBeInstanceOf(ThemeService);
    });
  });

  describe('toggleTheme method', () => {
    it('should call themeService.toggleTheme when toggleTheme is called', () => {
      fixture.detectChanges();
      const toggleSpy = vi.spyOn(component.themeService, 'toggleTheme');
      
      component.toggleTheme();
      
      expect(toggleSpy).toHaveBeenCalledOnce();
    });

    it('should call toggleTheme when button is clicked', () => {
      fixture.detectChanges();
      const toggleSpy = vi.spyOn(component.themeService, 'toggleTheme');
      
      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      
      button.click();
      
      expect(toggleSpy).toHaveBeenCalledOnce();
    });
  });

  describe('template rendering', () => {
    it('should render button with correct classes', () => {
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.className).toContain('p-2');
      expect(button.className).toContain('rounded-lg');
    });

    it('should display sun icon when theme is light', () => {
      component.themeService.setTheme('light');
      fixture.detectChanges();
      
      const svgs = fixture.nativeElement.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
      
      // Check for sun icon path
      const sunIcon = Array.from(svgs).find((svg: any) => {
        const path = svg.querySelector('path');
        return path?.getAttribute('d')?.includes('M12 3v1m0 16v1m9-9h-1M4 12H3');
      });
      expect(sunIcon).toBeTruthy();
    });

    it('should display moon icon when theme is dark', () => {
      component.themeService.setTheme('dark');
      fixture.detectChanges();
      
      const svgs = fixture.nativeElement.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
      
      // Check for moon icon path
      const moonIcon = Array.from(svgs).find((svg: any) => {
        const path = svg.querySelector('path');
        return path?.getAttribute('d')?.includes('M20.354 15.354A9 9 0 018.646 3.646');
      });
      expect(moonIcon).toBeTruthy();
    });

    it('should have correct title attribute based on current theme', () => {
      component.themeService.setTheme('light');
      fixture.detectChanges();
      
      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('title')).toBe('Current theme: Default · Light');
    });

    it('should update title when theme changes', () => {
      component.themeService.setTheme('dark');
      fixture.detectChanges();
      
      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('title')).toBe('Current theme: Default · Dark');
    });

    it('should show system theme in title when theme is system', () => {
      component.themeService.setTheme('system');
      fixture.detectChanges();
      
      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('title')).toBe('Current theme: Default · System');
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible', () => {
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should have title attribute for screen readers', () => {
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button');
      expect(button.hasAttribute('title')).toBe(true);
    });
  });

  describe('icon visibility', () => {
    it('should only show sun icon when not dark', () => {
      component.themeService.setTheme('light');
      fixture.detectChanges();
      
      const svgs = fixture.nativeElement.querySelectorAll('svg');
      // Should only have one visible icon
      expect(svgs.length).toBe(1);
    });

    it('should only show moon icon when dark', () => {
      component.themeService.setTheme('dark');
      fixture.detectChanges();
      
      const svgs = fixture.nativeElement.querySelectorAll('svg');
      // Should only have one visible icon
      expect(svgs.length).toBe(1);
    });
  });

  describe('service interaction', () => {
    it('should call getAppearanceTitleSummary from service for title attribute', () => {
      const summarySpy = vi.spyOn(component.themeService, 'getAppearanceTitleSummary');
      
      fixture.detectChanges();
      
      expect(summarySpy).toHaveBeenCalled();
    });

    it('should call isDark from service for icon display', () => {
      const isDarkSpy = vi.spyOn(component.themeService, 'isDark');
      
      fixture.detectChanges();
      
      expect(isDarkSpy).toHaveBeenCalled();
    });
  });
});
