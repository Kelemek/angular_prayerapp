import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { PrayerUpdate } from '../../types/prayer';

@Component({
  selector: 'app-pending-update-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4">
      <!-- Header -->
      <div *ngIf="!isEditing" class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Prayer Update
          </h3>

          <!-- Update Content -->
          <div class="mb-4">
            <p class="text-gray-600 dark:text-gray-300">{{ update.content }}</p>
          </div>

          <!-- Meta Information -->
          <div class="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <div *ngIf="update.prayer_title" class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Update for: {{ update.prayer_title }}</span>
            </div>
            <div class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>By {{ update.author }}</span>
            </div>
            <div *ngIf="update.mark_as_answered" class="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Will mark prayer as answered</span>
            </div>
            <div *ngIf="update.author_email" class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="break-words">Email: {{ update.author_email }}</span>
            </div>
            <p class="text-xs text-gray-400 dark:text-gray-500">
              Submitted: {{ formatDate(update.created_at) }}
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
            Update Content
          </label>
          <textarea
            [(ngModel)]="editedUpdate.content"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          ></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Author Name
          </label>
          <input
            type="text"
            [(ngModel)]="editedUpdate.author"
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
          placeholder="Explain why this update is being denied..."
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
export class PendingUpdateCardComponent {
  @Input() update!: PrayerUpdate & { prayer_title?: string };
  @Output() approve = new EventEmitter<string>();
  @Output() deny = new EventEmitter<{ id: string; reason: string }>();
  @Output() edit = new EventEmitter<{ id: string; updates: Partial<PrayerUpdate> }>();

  isApproving = false;
  isEditing = false;
  isDenying = false;
  isDenyingInProgress = false;
  denialReason = '';
  editedUpdate: any = {};

  ngOnInit() {
    this.resetEditedUpdate();
  }

  resetEditedUpdate() {
    this.editedUpdate = {
      content: this.update.content,
      author: this.update.author
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
      this.approve.emit(this.update.id);
    } finally {
      this.isApproving = false;
    }
  }

  async handleDeny() {
    if (!this.denialReason.trim()) return;
    
    this.isDenyingInProgress = true;
    try {
      this.deny.emit({ id: this.update.id, reason: this.denialReason });
      this.isDenying = false;
      this.denialReason = '';
    } finally {
      this.isDenyingInProgress = false;
    }
  }

  handleSaveEdit() {
    this.edit.emit({
      id: this.update.id,
      updates: {
        content: this.editedUpdate.content,
        author: this.editedUpdate.author
      }
    });
    this.isEditing = false;
  }

  cancelEdit() {
    this.isEditing = false;
    this.resetEditedUpdate();
  }
}
