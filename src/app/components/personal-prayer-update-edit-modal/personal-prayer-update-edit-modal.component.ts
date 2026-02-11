import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrayerService, PrayerUpdate } from '../../services/prayer.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-personal-prayer-update-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen && update) {
    <div
      class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-update-title"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="edit-update-title" class="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Edit Prayer Update
          </h2>
          <button
            (click)="cancel()"
            aria-label="Close edit dialog"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form #editForm="ngForm" (ngSubmit)="editForm.valid && handleSubmit()" class="p-6 space-y-4">
          <!-- Content -->
          <div>
            <label for="content" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Update Content <span aria-label="required">*</span>
            </label>
            <textarea
              id="content"
              [(ngModel)]="formData.content"
              name="content"
              required
              aria-required="true"
              aria-label="Prayer update content"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-32"
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              [disabled]="!editForm.valid || isSubmitting"
              class="flex-1 bg-blue-600 dark:bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Save changes"
            >
              {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
            </button>
            <button
              type="button"
              (click)="cancel()"
              [disabled]="isSubmitting"
              class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Cancel and close dialog"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
    }
  `,
  styles: []
})
export class PersonalPrayerUpdateEditModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() update: PrayerUpdate | null = null;
  @Input() prayerId: string = '';
  @Input() isMemberUpdate = false;
  @Input() planningCenterListId: string | null = null; // For cache invalidation on member updates
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Partial<PrayerUpdate>>();

  formData = {
    content: ''
  };

  isSubmitting = false;

  constructor(
    private prayerService: PrayerService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  ngOnChanges(): void {
    if (this.isOpen && this.update) {
      this.formData = {
        content: this.update.content
      };
    }
  }

  async handleSubmit(): Promise<void> {
    if (this.isSubmitting || !this.update) return;

    try {
      this.isSubmitting = true;
      this.cdr.markForCheck();

      const updates: Partial<PrayerUpdate> = {
        content: this.formData.content
      };

      let success: boolean;
      
      if (this.isMemberUpdate) {
        // For member updates, extract person_id from prayerId
        const personId = this.prayerId.substring('pc-member-'.length);
        success = await this.prayerService.updateMemberPrayerUpdate(
          this.update.id,
          personId,
          updates,
          this.planningCenterListId ?? undefined // Pass listId for cache invalidation
        );
      } else {
        success = await this.prayerService.updatePersonalPrayerUpdate(
          this.update.id,
          this.prayerId,
          updates
        );
      }

      if (success) {
        this.save.emit(updates);
        this.close.emit();
      }
    } catch (error) {
      console.error('Error updating prayer update:', error);
      this.toast.error('Failed to save prayer update. Please try again.');
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  cancel(): void {
    this.formData = {
      content: ''
    };
    this.close.emit();
  }
}
