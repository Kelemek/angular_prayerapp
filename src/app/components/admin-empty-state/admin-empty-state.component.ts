import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-admin-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700"
    >
      <svg
        class="mx-auto mb-4 text-gray-400 dark:text-gray-500"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">{{ title }}</h3>
      <p class="text-gray-500 dark:text-gray-400">{{ message }}</p>
    </div>
  `,
})
export class AdminEmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) message!: string;
}
