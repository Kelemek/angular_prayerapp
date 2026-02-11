import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { skip } from 'rxjs/operators';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ToastService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('showToast', () => {
    it('should emit toast with success type', async () => {
      const message = 'Success message';
      const toastPromise = firstValueFrom(service.toasts$.pipe(skip(1))); // Skip initial empty array
      
      service.showToast(message, 'success');
      const toasts = await toastPromise;
      
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe(message);
      expect(toasts[0].type).toBe('success');
    });

    it('should emit toast with error type', async () => {
      const message = 'Error message';
      const toastPromise = firstValueFrom(service.toasts$.pipe(skip(1)));
      
      service.showToast(message, 'error');
      const toasts = await toastPromise;
      
      expect(toasts[0].type).toBe('error');
    });

    it('should auto-remove toast after 5 seconds', async () => {
      service.showToast('Test message', 'info');
      let toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(1);
      
      // Fast forward time by 5 seconds
      vi.advanceTimersByTime(5000);
      
      toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(0);
    });

    it('should generate unique IDs for toasts', async () => {
      service.showToast('Message 1', 'info');
      service.showToast('Message 2', 'info');
      
      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].id).not.toBe(toasts[1].id);
      expect(toasts[0].id).toBeTruthy();
      expect(toasts[1].id).toBeTruthy();
    });
  });

  describe('success', () => {
    it('should show success toast', async () => {
      const toastPromise = firstValueFrom(service.toasts$.pipe(skip(1)));
      service.success('Success!');
      
      const toasts = await toastPromise;
      expect(toasts[0].type).toBe('success');
    });
  });

  describe('error', () => {
    it('should show error toast', async () => {
      const toastPromise = firstValueFrom(service.toasts$.pipe(skip(1)));
      service.error('Error!');
      
      const toasts = await toastPromise;
      expect(toasts[0].type).toBe('error');
    });
  });

  describe('info', () => {
    it('should show info toast', async () => {
      const toastPromise = firstValueFrom(service.toasts$.pipe(skip(1)));
      service.info('Info!');
      
      const toasts = await toastPromise;
      expect(toasts[0].type).toBe('info');
    });
  });

  describe('warning', () => {
    it('should show warning toast', async () => {
      const toastPromise = firstValueFrom(service.toasts$.pipe(skip(1)));
      service.warning('Warning!');
      
      const toasts = await toastPromise;
      expect(toasts[0].type).toBe('warning');
    });
  });

  describe('removeToast', () => {
    it('should remove a specific toast by ID', async () => {
      service.showToast('Toast 1', 'success');
      service.showToast('Toast 2', 'error');
      let toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(2);
      
      const firstToastId = toasts[0].id;
      service.removeToast(firstToastId);
      
      toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Toast 2');
    });

    it('should not affect other toasts when removing one', async () => {
      service.showToast('Toast 1', 'info');
      service.showToast('Toast 2', 'success');
      service.showToast('Toast 3', 'warning');
      let toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(3);
      
      const secondToastId = toasts[1].id;
      service.removeToast(secondToastId);
      
      toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(2);
      expect(toasts[0].message).toBe('Toast 1');
      expect(toasts[1].message).toBe('Toast 3');
    });

    it('should handle removing non-existent toast gracefully', async () => {
      service.showToast('Toast 1', 'info');
      let toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(1);
      
      service.removeToast('non-existent-id');
      
      toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('should clear all toasts', async () => {
      service.showToast('Toast 1', 'success');
      service.showToast('Toast 2', 'error');
      service.clearAll();
      
      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(0);
    });

    it('should handle clearing when no toasts exist', async () => {
      service.clearAll();
      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(0);
    });
  });

  describe('getToastStyles', () => {
    it('should return success styles for success type', () => {
      const styles = service.getToastStyles('success');
      expect(styles).toContain('bg-green-700');
      expect(styles).toContain('text-green-800');
      expect(styles).toContain('border-green-600');
      expect(styles).toContain('backdrop-blur-md');
    });

    it('should return error styles for error type', () => {
      const styles = service.getToastStyles('error');
      expect(styles).toContain('bg-red-700');
      expect(styles).toContain('text-red-800');
      expect(styles).toContain('border-red-600');
      expect(styles).toContain('backdrop-blur-md');
    });

    it('should return warning styles for warning type', () => {
      const styles = service.getToastStyles('warning');
      expect(styles).toContain('bg-amber-600');
      expect(styles).toContain('text-amber-900');
      expect(styles).toContain('border-amber-500');
      expect(styles).toContain('backdrop-blur-md');
    });

    it('should return info styles for info type (default)', () => {
      const styles = service.getToastStyles('info');
      expect(styles).toContain('bg-blue-700');
      expect(styles).toContain('text-blue-800');
      expect(styles).toContain('border-blue-600');
      expect(styles).toContain('backdrop-blur-md');
    });

    it('should return default info styles for any other type', () => {
      const styles = service.getToastStyles('custom');
      expect(styles).toContain('bg-blue-700');
      expect(styles).toContain('text-blue-800');
      expect(styles).toContain('border-blue-600');
      expect(styles).toContain('backdrop-blur-md');
    });
  });
});
