import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { skip } from 'rxjs/operators';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    service = new ToastService();
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

  describe('clearAll', () => {
    it('should clear all toasts', async () => {
      service.showToast('Toast 1', 'success');
      service.showToast('Toast 2', 'error');
      service.clearAll();
      
      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts).toHaveLength(0);
    });
  });
});
