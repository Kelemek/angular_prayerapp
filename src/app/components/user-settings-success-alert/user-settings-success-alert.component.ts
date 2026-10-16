import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-user-settings-success-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message) {
      <div
        class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-2"
        [class.mt-2]="extraTopMargin"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="flex items-start gap-2">
          <svg
            class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
            width="16"
            height="16"
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
          <p class="text-xs sm:text-sm text-green-800 dark:text-green-200">
            {{ message }}
          </p>
        </div>
      </div>
    }
  `,
})
export class UserSettingsSuccessAlertComponent {
  @Input() message: string | null = null;
  @Input() extraTopMargin = false;
}
