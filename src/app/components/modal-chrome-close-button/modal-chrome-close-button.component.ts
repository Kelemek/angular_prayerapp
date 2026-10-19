import { ChangeDetectionStrategy, Component } from '@angular/core';

/** 24×24 close icon for modal chrome headers (Safari-safe vs Unicode ✕). */
@Component({
  selector: 'button[appModalChromeClose]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="block size-6 shrink-0"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  `,
  host: {
    class:
      'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500',
    type: 'button',
  },
})
export class ModalChromeCloseButtonComponent {}
