import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PrayerUpdate } from '../../types/prayer';
import { SupabaseService } from '../../services/supabase.service';
import { lookupPersonByEmail, formatPersonName, type PlanningCenterPerson } from '../../../lib/planning-center';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-pending-update-card',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4">
      <!-- Header -->
      @if (!isEditing) {
      <div class="flex items-start justify-between mb-4">
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
            <div class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>By {{ update.author }}</span>
            </div>
            @if (update.mark_as_answered) {
            <div class="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Will mark prayer as answered</span>
            </div>
            }
            @if (update.author_email) {
            <div class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="break-words">Email: {{ update.author_email }}
                <!-- Planning Center Verification Badge -->
                @if (!pcLoading && pcPerson) {
                <span class="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  Planning Center: {{ formatPersonName(pcPerson) }}
                </span>
                }
                @if (!pcLoading && !pcPerson && !pcError) {
                <span class="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  Not found
                </span>
                }
                @if (!pcLoading && pcError) {
                <span class="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                  Error
                </span>
                }
                @if (pcLoading) {
                <span class="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                  <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
                }
              </span>
            </div>
            }
            <p class="text-xs text-gray-400 dark:text-gray-500">
              Submitted: {{ formatDate(update.created_at) }}
            </p>
          </div>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          Pending
        </span>
      </div>
      }

      <!-- Edit Mode -->
      @if (isEditing) {
      <div class="mb-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
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
      }

      <!-- Actions -->
      <div class="flex flex-wrap gap-2">
        @if (!isEditing && !isDenying) {
        <button
          (click)="handleApprove()"
          title="Approve this update"
          [disabled]="isApproving"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ isApproving ? 'Approving...' : 'Approve' }}
        </button>
        }

        @if (!isEditing && !isDenying) {
        <button
          (click)="isEditing = true"
          title="Edit this update"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit
        </button>
        }

        @if (isEditing) {
        <button
          (click)="handleSaveEdit()"
          title="Save changes"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Save
        </button>
        }

        @if (isEditing) {
        <button
          (click)="cancelEdit()"
          class="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Cancel
        </button>
        }

        @if (!isEditing && !isDenying) {
        <button
          (click)="isDenying = true"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Deny
        </button>
        }
      </div>

      <!-- Denial Form -->
      @if (isDenying) {
      <div class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
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
      }
    </div>
  `,
  styles: []
})
export class PendingUpdateCardComponent implements OnInit {
  @Input() update!: PrayerUpdate;
  @Output() approve = new EventEmitter<string>();
  @Output() deny = new EventEmitter<{ id: string; reason: string }>();
  @Output() edit = new EventEmitter<{ id: string; updates: Partial<PrayerUpdate> }>();

  isApproving = false;
  isEditing = false;
  isDenying = false;
  isDenyingInProgress = false;
  denialReason = '';
  editedUpdate: any = {};

  // Planning Center verification
  pcPerson: PlanningCenterPerson | null = null;
  pcLoading = false;
  pcError = false;

  private supabase = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.resetEditedUpdate();
    this.lookupPlanningCenterPerson();
  }

  private async lookupPlanningCenterPerson() {
    if (!this.update?.author_email) {
      return;
    }

    this.pcLoading = true;
    this.pcError = false;

    try {
      const result = await lookupPersonByEmail(
        this.update.author_email,
        environment.supabaseUrl,
        environment.supabaseAnonKey
      );

      if (result.error) {
        console.error('Planning Center lookup error:', result.error);
        this.pcError = true;
      } else if (result.people && result.people.length > 0) {
        this.pcPerson = result.people[0];
      }
    } catch (error) {
      console.error('Unexpected error during Planning Center lookup:', error);
      this.pcError = true;
    } finally {
      this.pcLoading = false;
      this.cdr.markForCheck();
    }
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

  formatPersonName(person: PlanningCenterPerson): string {
    return formatPersonName(person);
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
