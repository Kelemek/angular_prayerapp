import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from "@angular/core";

@Component({
  selector: "app-modal-shell",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        [id]="panelId || null"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
      >
        <div
          class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
        >
          <h2
            [id]="titleId"
            class="text-xl font-semibold text-gray-800 dark:text-gray-200"
          >
            {{ title }}
          </h2>
          <button
            type="button"
            (click)="close.emit()"
            [attr.aria-label]="closeAriaLabel"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1 cursor-pointer"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class ModalShellComponent {
  @Input() title = "";
  @Input() titleId = "modal-title";
  @Input() panelId = "";
  @Input() closeAriaLabel = "Close dialog";

  @Output() close = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
