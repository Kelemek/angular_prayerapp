import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PWAService } from '../../services/pwa.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * InstallPromptComponent
 * Displays "Add to Home Screen" button when install prompt is available
 * Dismissed after user takes action or clicks close
 */
@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showPrompt) {
      <div class="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm animate-in slide-in-from-bottom-4 duration-300">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
              Install Prayer App
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Add the app to your home screen for quick access
            </p>
          </div>
          <button
            (click)="onDismiss()"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div class="flex gap-2 mt-4">
          <button
            (click)="onDismiss()"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Not now
          </button>
          <button
            (click)="onInstall()"
            [disabled]="installing"
            class="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            @if (installing) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Installing...
            } @else {
              Install
            }
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slideInFromBottom {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .animate-in {
      animation: slideInFromBottom 0.3s ease-out;
    }
  `]
})
export class InstallPromptComponent implements OnInit, OnDestroy {
  showPrompt = false;
  installing = false;
  private destroy$ = new Subject<void>();

  constructor(private pwaService: PWAService) {}

  ngOnInit(): void {
    this.pwaService.installPromptAvailable$
      .pipe(takeUntil(this.destroy$))
      .subscribe((available) => {
        this.showPrompt = available;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onInstall(): Promise<void> {
    this.installing = true;
    try {
      const success = await this.pwaService.promptInstall();
      if (success) {
        this.showPrompt = false;
      }
    } finally {
      this.installing = false;
    }
  }

  onDismiss(): void {
    this.showPrompt = false;
  }
}
