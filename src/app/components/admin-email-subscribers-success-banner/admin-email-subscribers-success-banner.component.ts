import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-email-subscribers-success-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message) {
      <div
        class="mb-4 flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md"
      >
        <svg
          class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <div class="flex-1">
          <span class="text-green-800 dark:text-green-200 text-sm">{{ message }}</span>
          @if (warnings.length > 0) {
            <div class="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
              <p class="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">
                ⚠️ Planning Center Lookup Issues:
              </p>
              <ul class="space-y-1">
                @for (warning of warnings; track warning) {
                  <li class="text-xs text-orange-700 dark:text-orange-300">
                    • {{ warning }}
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class AdminEmailSubscribersSuccessBannerComponent {
  @Input() message: string | null = null;
  @Input() warnings: string[] = [];
}
