import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { PrayerRequest } from '../../types/prayer';

@Component({
  selector: 'app-pending-prayer-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Prayer for {{ prayer.prayer_for }}
          </h3>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            {{ prayer.description }}
          </p>
          <div class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>Requested by: {{ prayer.requester }} 
              <span *ngIf="prayer.is_anonymous" class="text-orange-600 dark:text-orange-400 font-medium">(Anonymous)</span>
            </p>
            <p *ngIf="prayer.email && !prayer.is_anonymous" class="break-words">Email: {{ prayer.email }}</p>
            <p>Status: {{ prayer.status }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">
              Submitted: {{ formatDate(prayer.created_at) }}
            </p>
          </div>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          Pending
        </span>
      </div>

      <!-- Edit Mode -->
      <div *ngIf="isEditing" class="mb-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prayer For
          </label>
          <input
            type="text"
            [(ngModel)]="editedPrayer.prayer_for"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            [(ngModel)]="editedPrayer.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          ></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Requester
          </label>
          <input
            type="text"
            [(ngModel)]="editedPrayer.requester"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div *ngIf="!prayer.is_anonymous">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            [(ngModel)]="editedPrayer.email"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2">
        <button
          *ngIf="!isEditing && !isDenying"
          (click)="handleApprove()"
          [disabled]="isApproving"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ isApproving ? 'Approving...' : 'Approve' }}
        </button>

        <button
          *ngIf="!isEditing && !isDenying"
          (click)="isEditing = true"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit
        </button>

        <button
          *ngIf="isEditing"
          (click)="handleSaveEdit()"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Save
        </button>

        <button
          *ngIf="isEditing"
          (click)="cancelEdit()"
          class="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Cancel
        </button>

        <button
          *ngIf="!isEditing && !isDenying"
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
          placeholder="Explain why this prayer is being denied..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
        ></textarea>
        <div class="flex gap-2">
          <button
            (click)="handleDeny()"
            [disabled]="!denialReason.trim() || isDenyingInProgress"
            class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ isDenyingInProgress ? 'Denying...' : 'Confirm Denial' }}
          </button>
          <button
            (click)="isDenying = false; denialReason = ''"
            class="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PendingPrayerCardComponent {
  @Input() prayer!: PrayerRequest;
  @Output() approve = new EventEmitter<string>();
  @Output() deny = new EventEmitter<{ id: string; reason: string }>();
  @Output() edit = new EventEmitter<{ id: string; updates: Partial<PrayerRequest> }>();

  isApproving = false;
  isEditing = false;
  isDenying = false;
  isDenyingInProgress = false;
  denialReason = '';
  editedPrayer: any = {};

  ngOnInit() {
    this.resetEditedPrayer();
  }

  resetEditedPrayer() {
    this.editedPrayer = {
      prayer_for: this.prayer.prayer_for,
      description: this.prayer.description,
      requester: this.prayer.requester,
      email: this.prayer.email
    };
  }

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
    this.isApproving = true;
    try {
      this.approve.emit(this.prayer.id);
    } finally {
      this.isApproving = false;
    }
  }

  async handleDeny() {
    if (!this.denialReason.trim()) return;
    
    this.isDenyingInProgress = true;
    try {
      this.deny.emit({ id: this.prayer.id, reason: this.denialReason });
      this.isDenying = false;
      this.denialReason = '';
    } finally {
      this.isDenyingInProgress = false;
    }
  }

  handleSaveEdit() {
    this.edit.emit({
      id: this.prayer.id,
      updates: {
        prayer_for: this.editedPrayer.prayer_for,
        description: this.editedPrayer.description,
        requester: this.editedPrayer.requester,
        email: this.editedPrayer.email
      }
    });
    this.isEditing = false;
  }

  cancelEdit() {
    this.isEditing = false;
    this.resetEditedPrayer();
  }
}
