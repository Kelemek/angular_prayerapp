import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NotificationType = 'prayer' | 'update' | 'subscriber';

@Component({
  selector: 'app-send-notification-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Send Email Notification?
          </h2>
        </div>

        <!-- Content -->
        <div class="px-6 py-4">
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            {{ getMessageText() }}
          </p>
          
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p class="text-sm text-blue-700 dark:text-blue-300">
              📧 {{ getNotificationInfoText() }}
            </p>
          </div>

          @if (prayerTitle) {
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ notificationType === 'prayer' ? 'Prayer:' : 'Prayer:' }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ prayerTitle }}</p>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            (click)="onDecline()"
            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Don't Send
          </button>
          <button
            (click)="onConfirm()"
            class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            Send Email
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SendNotificationDialogComponent {
  @Input() notificationType: NotificationType = 'prayer';
  @Input() prayerTitle?: string;
  @Output() confirm = new EventEmitter<void>();
  @Output() decline = new EventEmitter<void>();

  getMessageText(): string {
    if (this.notificationType === 'prayer') {
      return 'Would you like to send an email notification to all subscribers about this new prayer?';
    } else if (this.notificationType === 'update') {
      return 'Would you like to send an email notification to all subscribers about this prayer update?';
    } else if (this.notificationType === 'subscriber') {
      return 'Would you like to send a welcome email to this new subscriber?';
    }
    return '';
  }

  getNotificationInfoText(): string {
    if (this.notificationType === 'subscriber') {
      return 'Email will be sent to this new subscriber with the welcome template.';
    }
    return 'Email will be sent to all active subscribers with the appropriate notification template.';
  }

  onConfirm() {
    this.confirm.emit();
  }

  onDecline() {
    this.decline.emit();
  }
}
