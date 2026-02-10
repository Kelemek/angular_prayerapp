import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-update-approval',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="space-y-4">
      <!-- Update Card (Frontend Style) -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <!-- Prayer Reference -->
        <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h4 class="font-semibold text-gray-800 dark:text-gray-100">
            Prayer: {{ update.prayer_title }}
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Prayer ID: {{ update.prayer_id }}
          </p>
        </div>

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
        } @else if (!isDenying) {
          <!-- Update Content (View Mode) -->
          <div class="mb-4">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Update:</p>
            <div class="bg-gray-50 dark:bg-gray-700 rounded p-4 text-gray-800 dark:text-gray-100">
              {{ update.content }}
            </div>
          </div>

          <!-- Author Info -->
          <div class="mb-4 space-y-2 text-sm">
            <p class="text-gray-600 dark:text-gray-400">
              <span class="font-medium">Author:</span> {{ update.author }}
              @if (update.is_anonymous) {
                <span class="inline-flex items-center gap-1 px-2 py-0.5 ml-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                  (Anonymous)
                </span>
              }
              @if (update.author_email) {
                ({{ update.author_email }})
              }
            </p>
            <p class="text-gray-600 dark:text-gray-400">
              <span class="font-medium">Submitted:</span> {{ update.created_at | date: 'short' }}
            </p>
            @if (update.is_answered) {
              <p class="text-emerald-600 dark:text-emerald-400">✓ Marked as answered</p>
            }
          </div>
        }

        <!-- Denial Form -->
        @if (isDenying) {
          <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for denial (optional)
            </label>
            <textarea
              [(ngModel)]="denialReason"
              rows="3"
              placeholder="Explain why this update is being denied..."
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
            ></textarea>
          </div>
        }
      </div>

      <!-- Admin Action Buttons -->
      <div class="flex gap-3 justify-end bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        @if (!isEditing && !isDenying) {
          <button
            (click)="isEditing = true; editedUpdate = { content: update.content, author: update.author }"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Edit
          </button>
          <button
            (click)="isDenying = true"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Deny
          </button>
          <button
            (click)="onApprove.emit(update.id)"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Approve
          </button>
        } @else if (isEditing) {
          <button
            (click)="handleSaveEdit()"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Save
          </button>
          <button
            (click)="cancelEdit()"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
        } @else if (isDenying) {
          <button
            (click)="handleDeny()"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Confirm Denial
          </button>
          <button
            (click)="isDenying = false; denialReason = ''"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
        }
      </div>
    </div>
  `,
  styles: []
})
export class AdminUpdateApprovalComponent {
  @Input() update!: any; // Update with prayer details
  
  @Output() onApprove = new EventEmitter<string>();
  @Output() onDeny = new EventEmitter<{ id: string; reason: string | null }>();
  @Output() onEdit = new EventEmitter<{ id: string; updates: any }>();

  isDenying = false;
  denialReason = '';
  isEditing = false;
  editedUpdate: any = { content: '', author: '' };

  handleDeny(): void {
    this.onDeny.emit({ id: this.update.id, reason: this.denialReason || null });
    this.isDenying = false;
    this.denialReason = '';
  }

  handleSaveEdit(): void {
    this.onEdit.emit({ id: this.update.id, updates: this.editedUpdate });
    this.isEditing = false;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editedUpdate = { content: '', author: '' };
  }
}


