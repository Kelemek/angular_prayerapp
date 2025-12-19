import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { PendingPreferenceChange } from '../../services/admin-data.service';

@Component({
  selector: 'app-pending-preference-change-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Preference Change Request
          </h3>

          <!-- User Info -->
          <div class="mb-4">
            <div class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <div class="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>{{ change.name }}</span>
              </div>
              <div class="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span class="break-words">{{ change.email }}</span>
              </div>
              <div class="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{{ formatDate(change.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Requested Change -->
          <div class="p-3 rounded-lg border-2"
               [class]="change.receive_new_prayer_notifications ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'">
            <p class="text-sm font-medium mb-1"
               [class]="change.receive_new_prayer_notifications ? 'text-green-800 dark:text-green-200' : 'text-gray-800 dark:text-gray-200'">
              Requested Change:
            </p>
            <p class="text-sm"
               [class]="change.receive_new_prayer_notifications ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'">
              {{ change.receive_new_prayer_notifications ? 'Subscribe to' : 'Unsubscribe from' }} new prayer notifications
            </p>
          </div>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          Pending
        </span>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2">
        <button
          *ngIf="!isDenying"
          (click)="handleApprove()"
          [disabled]="isProcessing"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ isProcessing ? 'Approving...' : 'Approve' }}
        </button>

        <button
          *ngIf="!isDenying"
          (click)="isDenying = true"
          [disabled]="isProcessing"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Deny
        </button>
      </div>

      <!-- Denial Form -->
      <div *ngIf="isDenying" class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reason for denial (required)
        </label>
        <textarea
          [(ngModel)]="denialReason"
          rows="3"
          placeholder="Explain why this preference change is being denied..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
        ></textarea>
        <div class="flex gap-2">
          <button
            (click)="handleDeny()"
            [disabled]="!denialReason.trim() || isProcessing"
            class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ isProcessing ? 'Denying...' : 'Confirm Denial' }}
          </button>
          <button
            (click)="isDenying = false; denialReason = ''"
            [disabled]="isProcessing"
            class="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PendingPreferenceChangeCardComponent {
  @Input() change!: PendingPreferenceChange;
  @Output() approve = new EventEmitter<string>();
  @Output() deny = new EventEmitter<{ id: string; reason: string }>();

  isProcessing = false;
  isDenying = false;
  denialReason = '';

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async handleApprove() {
    this.isProcessing = true;
    try {
      this.approve.emit(this.change.id);
    } finally {
      this.isProcessing = false;
    }
  }

  async handleDeny() {
    if (!this.denialReason.trim()) return;
    
    this.isProcessing = true;
    try {
      this.deny.emit({ id: this.change.id, reason: this.denialReason });
      this.isDenying = false;
      this.denialReason = '';
    } finally {
      this.isProcessing = false;
    }
  }
}
