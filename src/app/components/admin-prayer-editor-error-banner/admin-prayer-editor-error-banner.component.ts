import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-prayer-editor-error-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message) {
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4"
      >
        <p class="text-sm text-red-800 dark:text-red-200">{{ message }}</p>
      </div>
    }
  `,
})
export class AdminPrayerEditorErrorBannerComponent {
  @Input() message: string | null = null;
}
