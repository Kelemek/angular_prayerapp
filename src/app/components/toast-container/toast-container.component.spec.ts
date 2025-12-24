import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService } from '../../services/toast.service';

describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [ToastService]
    });

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should inject ToastService', () => {
      expect(component.toastService).toBeTruthy();
      expect(component.toastService).toBeInstanceOf(ToastService);
    });

    it('should initialize toasts$ in ngOnInit', () => {
      component.ngOnInit();
      
      expect(component.toasts$).toBeDefined();
    });

    it('should set toasts$ observable on initialization', () => {
      // ngOnInit is automatically called during fixture creation
      expect(component.toasts$).toBeDefined();
    });
  });

  describe('toast display', () => {
    it('should display no toasts initially', () => {
      const toastContainer = fixture.nativeElement.querySelector('.fixed');
      expect(toastContainer).toBeTruthy();
      
      // Check that no toast divs are rendered
      const toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
      expect(toasts).toHaveLength(0);
    });

    it('should display a single toast', async () => {
      component.toastService.success('Test message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const message = fixture.nativeElement.textContent;
        expect(message).toContain('Test message');
      });
      
      const toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
      expect(toasts).toHaveLength(1);
    });

    it('should display multiple toasts', async () => {
      component.toastService.success('First message');
      component.toastService.error('Second message');
      component.toastService.info('Third message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const content = fixture.nativeElement.textContent;
        expect(content).toContain('First message');
        expect(content).toContain('Second message');
        expect(content).toContain('Third message');
      });
      
      const toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
      expect(toasts).toHaveLength(3);
    });

    it('should display toast with correct message', async () => {
      component.toastService.info('Custom test message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const content = fixture.nativeElement.textContent;
        expect(content).toContain('Custom test message');
      });
    });
  });

  describe('toast styling', () => {
    it('should apply correct styles for success toast', async () => {
      component.toastService.success('Success message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const toast = fixture.nativeElement.querySelector('.animate-slide-down');
        expect(toast?.className).toContain('bg-green-100');
      });
    });

    it('should apply correct styles for error toast', async () => {
      component.toastService.error('Error message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const toast = fixture.nativeElement.querySelector('.animate-slide-down');
        expect(toast?.className).toContain('bg-red-100');
      });
    });

    it('should apply correct styles for warning toast', async () => {
      component.toastService.warning('Warning message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const toast = fixture.nativeElement.querySelector('.animate-slide-down');
        expect(toast?.className).toContain('bg-yellow-100');
      });
    });

    it('should apply correct styles for info toast', async () => {
      component.toastService.info('Info message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const toast = fixture.nativeElement.querySelector('.animate-slide-down');
        expect(toast?.className).toContain('bg-blue-100');
      });
    });
  });

  describe('toast removal', () => {
    it('should call removeToast when close button is clicked', async () => {
      component.toastService.success('Test message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const content = fixture.nativeElement.textContent;
        expect(content).toContain('Test message');
      });
      
      const removeToastSpy = vi.spyOn(component.toastService, 'removeToast');
      
      const closeButtons = fixture.nativeElement.querySelectorAll('button');
      const closeButton = Array.from(closeButtons).find((button: any) => 
        button.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
      );
      
      expect(closeButton).toBeTruthy();
      (closeButton as HTMLElement).click();
      
      expect(removeToastSpy).toHaveBeenCalled();
    });

    it('should remove toast from display when removeToast is called', async () => {
      component.toastService.success('Test message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        let toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
        expect(toasts).toHaveLength(1);
      });
      
      // Clear all toasts
      component.toastService.clearAll();
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
        expect(toasts).toHaveLength(0);
      });
    });
  });

  describe('template structure', () => {
    it('should have fixed positioning container', () => {
      const fixedContainer = fixture.nativeElement.querySelector('.fixed');
      expect(fixedContainer).toBeTruthy();
      expect(fixedContainer.className).toContain('top-4');
      expect(fixedContainer.className).toContain('z-50');
    });

    it('should render icon in toast', async () => {
      component.toastService.success('Test message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const svgs = fixture.nativeElement.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
    });

    it('should render close button in toast', async () => {
      component.toastService.success('Test message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const closeButtons = fixture.nativeElement.querySelectorAll('button');
        expect(closeButtons.length).toBeGreaterThan(0);
      });
    });

    it('should apply animation class to toasts', async () => {
      component.toastService.success('Test message');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const toast = fixture.nativeElement.querySelector('.animate-slide-down');
        expect(toast).toBeTruthy();
      });
    });
  });

  describe('observable behavior', () => {
    it('should update when toasts$ emits new values', async () => {
      // Initially no toasts
      let toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
      expect(toasts).toHaveLength(0);
      
      // Add new toast
      component.toastService.info('New toast');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
        expect(toasts).toHaveLength(1);
      });
    });

    it('should update when toasts are removed', async () => {
      component.toastService.success('First');
      component.toastService.info('Second');
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        let toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
        expect(toasts).toHaveLength(2);
      });
      
      // Clear all
      component.toastService.clearAll();
      fixture.detectChanges();
      
      await vi.waitFor(() => {
        const toasts = fixture.nativeElement.querySelectorAll('.animate-slide-down');
        expect(toasts).toHaveLength(0);
      });
    });
  });
});
