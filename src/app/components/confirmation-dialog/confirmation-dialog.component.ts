import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {{ title }}
          </h2>
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
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            (click)="onCancel()"
            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            {{ cancelText }}
          </button>
          <button
            (click)="onConfirm()"
            [class]="isDangerous ? 
              'px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium' :
              'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium'"
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
