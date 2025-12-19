import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UpdateDeletionRequest {
  id: string;
  update_id: string;
  reason?: string | null;
  requested_by: string;
  requested_email?: string | null;
  approval_status: 'pending' | 'approved' | 'denied';
  created_at: string;
  prayer_updates?: {
    id?: string;
    content?: string;
    author?: string;
    author_email?: string;
    created_at?: string;
    prayers?: {
      title?: string;
      prayer_for?: string;
    };
  };
}

@Component({
  selector: 'app-pending-update-deletion-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Update Deletion Request
          </h3>

          <!-- Prayer Title -->
          <div *ngIf="deletionRequest.prayer_updates?.prayers?.title" class="mb-4">
            <p class="text-gray-600 dark:text-gray-300 font-medium">
              Prayer: {{ deletionRequest.prayer_updates?.prayers?.title }}
            </p>
          </div>

          <!-- Update Content -->
          <div *ngIf="deletionRequest.prayer_updates?.content" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Update to be deleted:</p>
            <p class="text-gray-700 dark:text-gray-300">{{ deletionRequest.prayer_updates?.content }}</p>
            <p *ngIf="deletionRequest.prayer_updates?.author" class="text-xs text-gray-500 dark:text-gray-400 mt-2">
              By: {{ deletionRequest.prayer_updates?.author }} 
              <span *ngIf="deletionRequest.prayer_updates?.created_at">
                on {{ formatDate(deletionRequest.prayer_updates!.created_at!) }}
              </span>
            </p>
          </div>

          <!-- Reason for deletion -->
          <div *ngIf="deletionRequest.reason" class="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for deletion:</p>
            <p class="text-gray-600 dark:text-gray-400">{{ deletionRequest.reason }}</p>
          </div>

          <!-- Meta Information -->
          <div class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <div class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Requested by: {{ deletionRequest.requested_by }}</span>
            </div>
            <div *ngIf="deletionRequest.requested_email" class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="break-words">Email: {{ deletionRequest.requested_email }}</span>
            </div>
            <div class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{{ formatDate(deletionRequest.created_at) }}</span>
            </div>
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
          [disabled]="isApproving"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ isApproving ? 'Approving...' : 'Approve & Delete Update' }}
        </button>

        <button
          *ngIf="!isDenying"
          (click)="isDenying = true"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
          placeholder="Explain why this update deletion request is being denied..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
        ></textarea>
        <div class="flex gap-2">
          <button
            (click)="handleDeny()"
            [disabled]="!denialReason.trim()"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Denial
          </button>
          <button
            (click)="isDenying = false; denialReason = ''"
            class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PendingUpdateDeletionCardComponent {
  @Input() deletionRequest!: UpdateDeletionRequest;
  @Output() approve = new EventEmitter<string>();
  @Output() deny = new EventEmitter<{ id: string; reason: string }>();

  isDenying = false;
  denialReason = '';
  isApproving = false;

  handleApprove(): void {
    if (confirm('Are you sure you want to approve this update deletion request? The update will be permanently deleted.')) {
      this.isApproving = true;
      this.approve.emit(this.deletionRequest.id);
    }
  }

  handleDeny(): void {
    if (this.denialReason.trim()) {
      this.deny.emit({
        id: this.deletionRequest.id,
        reason: this.denialReason
      });
      this.isDenying = false;
      this.denialReason = '';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
