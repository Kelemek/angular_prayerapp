import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-modal-overlay p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full modal-panel-edge">
        <!-- Header -->
        <div class="modal-chrome-header flex items-start justify-between gap-3 px-6 py-4">
          <h2 class="min-w-0 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {{ title }}
          </h2>
          <button
            type="button"
            class="shrink-0 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
            (click)="onCancel()"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-4">
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            {{ message }}
          </p>
          
          @if (details) {
            <div [class]="isDangerous ?
              'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3' :
              'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3'">
              <p [class]="isDangerous ?
                'text-sm text-red-700 dark:text-red-300' :
                'text-sm text-blue-700 dark:text-blue-300'">
                {{ details }}
              </p>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="modal-chrome-footer flex justify-end px-6 py-4">
          <button
            type="button"
            (click)="onConfirm()"
            [class]="isDangerous ?
              'px-4 py-2 rounded-md btn-chip btn-chip-red cursor-pointer' :
              'px-4 py-2 rounded-md btn-chip btn-chip-blue cursor-pointer'"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ConfirmationDialogComponent {
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure?';
  @Input() details: string | null = null;
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() isDangerous = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
