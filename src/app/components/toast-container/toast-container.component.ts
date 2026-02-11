import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Toast Container: centered at top -->
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-full max-w-md px-4">
      @for (toast of toasts$ | async; track toast.id) {
        <div
          [class]="'flex items-center gap-3 px-4 py-3 rounded-lg animate-slide-down ' + toastService.getToastStyles(toast.type)"
        >
          <!-- Icon -->
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          
          <!-- Message -->
          <span class="text-sm font-medium">{{ toast.message }}</span>
          
          <!-- Close Button -->
          <button
            (click)="toastService.removeToast(toast.id)"
            class="opacity-90 hover:opacity-100 text-inherit ml-auto p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Dismiss"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-down {
      from {
        transform: translateY(-120%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .animate-slide-down {
      animation: slide-down 0.3s ease-out;
    }
  `]
})
export class ToastContainerComponent implements OnInit {
  toasts$!: Observable<Toast[]>;
  public toastService = inject(ToastService);

  ngOnInit(): void {
    this.toasts$ = this.toastService.toasts$;
  }
}
