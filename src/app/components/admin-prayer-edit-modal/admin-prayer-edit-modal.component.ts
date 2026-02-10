import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrayerRequest } from '../../services/prayer.service';
import { AdminDataService } from '../../services/admin-data.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-prayer-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen && prayer) {
    <div
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-prayer-title"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="edit-prayer-title" class="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Edit Prayer
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
          <!-- Title -->
          <div>
            <label for="prayer_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prayer For <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="prayer_title"
              [(ngModel)]="formData.prayer_for"
              name="prayer_for"
              required
              aria-required="true"
              aria-label="Prayer For"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prayer Request Details <span class="text-gray-500 dark:text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              [(ngModel)]="formData.description"
              name="description"
              aria-label="Prayer Request Details"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-24"
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
export class AdminPrayerEditModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() prayer: PrayerRequest | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  formData = {
    prayer_for: '',
    description: ''
  };

  isSubmitting = false;

  constructor(
    private adminDataService: AdminDataService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  ngOnChanges(): void {
    if (this.isOpen && this.prayer) {
      console.log('[AdminPrayerEditModal.ngOnChanges] Modal opened for prayer:', this.prayer.id);
      this.formData = {
        prayer_for: this.prayer.prayer_for,
        description: this.prayer.description
      };
    }
  }

  async handleSubmit(): Promise<void> {
    if (this.isSubmitting || !this.prayer) return;

    try {
      this.isSubmitting = true;
      this.cdr.markForCheck();

      const updates: Partial<PrayerRequest> = {
        prayer_for: this.formData.prayer_for,
        description: this.formData.description
      };

      console.log('[AdminPrayerEditModal.handleSubmit] Saving prayer:', this.prayer.id, updates);

      await this.adminDataService.editPrayer(this.prayer.id, updates as any);
      
      console.log('[AdminPrayerEditModal.handleSubmit] Prayer saved successfully');
      this.save.emit();
      this.close.emit();
    } catch (error) {
      console.error('[AdminPrayerEditModal.handleSubmit] Error updating prayer:', error);
      this.toast.error('Failed to update prayer. Please try again.');
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  cancel(): void {
    this.formData = {
      prayer_for: '',
      description: ''
    };
    this.close.emit();
  }
}
