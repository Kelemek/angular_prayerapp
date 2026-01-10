import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PWAService } from '../../services/pwa.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * OfflineIndicatorComponent
 * Shows a banner when the app loses internet connection
 * Automatically hides when connection is restored
 */
@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!isOnline) {
      <div class="fixed top-0 left-0 right-0 z-50 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3 shadow-sm animate-in slide-in-from-top-4 duration-300">
        <div class="flex items-center justify-center gap-3 max-w-4xl mx-auto">
          <svg class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18.364 5.364l-1.414-1.414L9 12.586 3.05 6.636 1.636 8.05 9 15.414l9.364-9.364z" clip-rule="evenodd" />
          </svg>
          <span class="text-sm font-medium text-amber-800 dark:text-amber-200">
            You're offline. Some features may be limited.
          </span>
        </div>
      </div>
      <!-- Add padding to account for fixed banner -->
      <div class="h-12"></div>
    }
  `,
  styles: [`
    @keyframes slideInFromTop {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .animate-in {
      animation: slideInFromTop 0.3s ease-out;
    }
  `]
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  isOnline = true;
  private destroy$ = new Subject<void>();

  constructor(private pwaService: PWAService) {}

  ngOnInit(): void {
    // Set initial status
    this.isOnline = this.pwaService.getOnlineStatus();

    // Listen to online/offline changes
    this.pwaService.isOnline$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isOnline) => {
        this.isOnline = isOnline;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
