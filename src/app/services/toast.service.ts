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
   * Uses transparent background with backdrop blur; border and text carry the type color.
   */
  getToastStyles(type: string): string {
    const base = 'backdrop-blur-md border shadow-lg ';
    switch (type) {
      case 'success':
        return base + 'bg-green-700/20 dark:bg-green-800/25 text-green-800 dark:text-green-100 border-green-600 dark:border-green-600';
      case 'error':
        return base + 'bg-red-700/20 dark:bg-red-800/25 text-red-800 dark:text-red-100 border-red-600 dark:border-red-600';
      case 'warning':
        return base + 'bg-amber-600/20 dark:bg-amber-700/25 text-amber-900 dark:text-amber-100 border-amber-500 dark:border-amber-600';
      default:
        return base + 'bg-blue-700/20 dark:bg-blue-800/25 text-blue-800 dark:text-blue-100 border-blue-600 dark:border-blue-600';
    }
  }
}
