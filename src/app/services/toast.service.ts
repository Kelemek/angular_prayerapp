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
   * Get CSS classes for toast type
   */
  getToastStyles(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
    }
  }
}
