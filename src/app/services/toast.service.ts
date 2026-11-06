import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  /**
   * Show a toast notification
   */
  showToast(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info'): void {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, message, type };
    
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      this.removeToast(id);
    }, 5000);
  }

  /**
   * Show a success toast
   */
  success(message: string): void {
    this.showToast(message, 'success');
  }

  /**
   * Show an error toast
   */
  error(message: string): void {
    this.showToast(message, 'error');
  }

  /**
   * Show an info toast
   */
  info(message: string): void {
    this.showToast(message, 'info');
  }

  /**
   * Show a warning toast
   */
  warning(message: string): void {
    this.showToast(message, 'warning');
  }

  /**
   * Remove a specific toast
   */
  removeToast(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.toastsSubject.next([]);
  }

  /**
   * Get CSS classes for toast type.
   * Info matches the Request chip (`btn-chip-blue` on `contrast-chip-surface`):
   * `bg-blue-200` / `dark:bg-blue-900/20`, not translucent `bg-blue-700/20`.
   * Text and border stay on `btn-chip-blue` so Blossom does not remap `text-blue-700`.
   */
  getToastStyles(type: string): string {
    const base = 'backdrop-blur-md shadow-lg ';
    switch (type) {
      case 'success':
        return base + 'border bg-green-700/20 dark:bg-green-800/25 text-green-800 dark:text-green-100 border-green-600 dark:border-green-600';
      case 'error':
        return base + 'border bg-red-700/20 dark:bg-red-800/25 text-red-800 dark:text-red-100 border-red-600 dark:border-red-600';
      case 'warning':
        return base + 'border bg-amber-600/20 dark:bg-amber-700/25 text-amber-900 dark:text-amber-100 border-amber-500 dark:border-amber-600';
      default:
        return base + 'btn-chip-blue bg-blue-200 hover:bg-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30';
    }
  }
}
