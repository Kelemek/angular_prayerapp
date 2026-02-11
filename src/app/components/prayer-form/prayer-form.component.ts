import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Observable } from 'rxjs';
import type { User } from '@supabase/supabase-js';
import { PrayerService } from '../../services/prayer.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { UserSessionService } from '../../services/user-session.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-prayer-form',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    @if (isOpen) {
    <div
      class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prayer-form-title"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="prayer-form-title" class="text-xl font-semibold text-gray-800 dark:text-gray-200">
            New Prayer Request
          </h2>
          <button
            (click)="cancel()"
            aria-label="Close prayer form dialog"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form #prayerForm="ngForm" (ngSubmit)="prayerForm.valid && handleSubmit()" class="p-6 space-y-4">
          <!-- Success Message -->
          @if (showSuccessMessage) {
          <div
            class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div class="flex items-center gap-2 text-green-800 dark:text-green-200">
              <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <div class="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div>
                <p class="font-medium">Prayer request submitted successfully!</p>
                <p class="text-sm text-green-600 dark:text-green-300">Your request is pending admin approval and will appear in the list once reviewed.</p>
              </div>
            </div>
          </div>
          }

          <!-- Prayer For -->
          <div>
            <label for="prayer_for" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prayer For <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="prayer_for"
              [(ngModel)]="formData.prayer_for"
              name="prayer_for"
              required
              aria-required="true"
              aria-label="Prayer For"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Who or what this prayer is for"
            />
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prayer Request Details <span aria-label="required">*</span>
            </label>
            <textarea
              id="description"
              [(ngModel)]="formData.description"
              name="description"
              required
              aria-required="true"
              aria-label="Prayer Request Details"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-24"
              placeholder="Describe the prayer request in detail"
            ></textarea>
          </div>

          <!-- Prayer Visibility Toggle Buttons -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Prayer Visibility
            </label>
            <div class="grid grid-cols-2 gap-3">
              <!-- Public Prayer Button -->
              <button
                type="button"
                (click)="formData.is_personal = false"
                [class.ring-2]="!formData.is_personal"
                class="relative py-3 px-4 rounded-lg border-2 transition-all font-medium"
                [ngClass]="
                  !formData.is_personal
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-blue-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-gray-800'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                "
                aria-pressed="!formData.is_personal"
                aria-label="Select public prayer - requires admin approval"
              >
                <div class="flex items-center justify-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  <div class="text-left">
                    <div class="font-semibold">Public Prayer</div>
                    <div class="text-xs opacity-75">Pending admin approval</div>
                  </div>
                </div>
              </button>

              <!-- Personal Prayer Button -->
              <button
                type="button"
                (click)="formData.is_personal = true"
                [class.ring-2]="formData.is_personal"
                class="relative py-3 px-4 rounded-lg border-2 transition-all font-medium"
                [ngClass]="
                  formData.is_personal
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-blue-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-gray-800'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                "
                aria-pressed="formData.is_personal"
                aria-label="Select personal prayer - private, no approval needed"
              >
                <div class="flex items-center justify-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <div class="text-left">
                    <div class="font-semibold">Personal Prayer</div>
                    <div class="text-xs opacity-75">Private, no approval</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Anonymous Checkbox - only show for public prayers -->
          @if (!formData.is_personal) {
          <div class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              [(ngModel)]="formData.is_anonymous"
              name="is_anonymous"
              id="is_anonymous"
              class="w-4 h-4 text-blue-600 border-gray-900 dark:border-white rounded focus:ring-blue-500 bg-white dark:bg-gray-800"
            />
            <label for="is_anonymous" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Make this prayer anonymous (your name will not be shown publicly)
            </label>
          </div>
          }

          <!-- Category Field - only show for personal prayers -->
          @if (formData.is_personal) {
          <div class="relative">
            <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category <span class="text-gray-500 dark:text-gray-400">(optional, {{ formData.category.length }}/50 characters max)</span>
            </label>
            <input
              type="text"
              id="category"
              [(ngModel)]="formData.category"
              name="category"
              autocomplete="off"
              maxlength="50"
              aria-label="Prayer category"
              (focus)="showCategoryDropdown = true"
              (input)="onCategoryInput($event)"
              (keydown)="onCategoryKeyDown($event)"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., Health, Family, Work (or create a new category)"
            />
            <!-- Category Dropdown -->
            @if (showCategoryDropdown && filteredCategories.length > 0) {
            <div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
              @for (category of filteredCategories; track category; let i = $index) {
              <button
                type="button"
                (click)="selectCategory(category)"
                [class.bg-blue-100]="i === selectedCategoryIndex"
                [class.dark:bg-gray-600]="i === selectedCategoryIndex"
                class="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:bg-blue-100 dark:focus:bg-gray-600 transition-colors"
              >
                {{ category }}
              </button>
              }
            </div>
            }
          </div>
          }

          <!-- Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              [disabled]="!prayerForm.valid || !isFormValid() || isSubmitting || showSuccessMessage"
              class="flex-1 bg-blue-600 dark:bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Submit prayer request"
            >
              {{ isSubmitting ? 'Submitting...' : (showSuccessMessage ? 'Submitted' : 'Submit Prayer Request') }}
            </button>
            <button
              type="button"
              (click)="cancel()"
              [disabled]="showSuccessMessage"
              class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Cancel and close form"
            >
              {{ showSuccessMessage ? 'Closing...' : 'Close' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    }
  `,
  styles: []
})
export class PrayerFormComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<{isPersonal?: boolean}>();

  formData: {
    title: string;
    description: string;
    prayer_for: string;
    is_anonymous: boolean;
    is_personal: boolean;
    category: string;
  } = {
    title: '',
    description: '',
    prayer_for: '',
    is_anonymous: false,
    is_personal: false,
    category: ''
  };

  isSubmitting = false;
  showSuccessMessage = false;
  isAdmin = false;
  currentUserEmail = '';
  availableCategories: string[] = [];
  filteredCategories: string[] = [];
  selectedCategoryIndex = -1;
  showCategoryDropdown = false;
  user$!: Observable<User | null>;

  constructor(
    private prayerService: PrayerService,
    private adminAuthService: AdminAuthService,
    private userSessionService: UserSessionService,
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.user$ = this.adminAuthService.user$;
    this.adminAuthService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
    // Load available categories for personal prayers
    this.prayerService.getUniqueCategoriesForUser().then(cats => {
      this.availableCategories = cats;
    });
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.loadUserInfo();
      this.prayerService.getUniqueCategoriesForUser().then(cats => {
        this.availableCategories = cats;
      });
    }
  }

  private loadUserInfo(): void {
    try {
      // Get current user's email from UserSessionService (cached from database)
      this.userSessionService.userSession$.subscribe(session => {
        if (session?.email) {
          this.currentUserEmail = session.email;
        }
      });
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }

  private saveUserInfo(): void {
    // Names are no longer saved - they come from localStorage managed by home component
  }

  private getCurrentUserName(): string {
    const firstName = localStorage.getItem('prayerapp_user_first_name') || '';
    const lastName = localStorage.getItem('prayerapp_user_last_name') || '';
    return `${firstName} ${lastName}`.trim();
  }

  isFormValid(): boolean {
    return !!(
      this.currentUserEmail.trim() &&
      this.formData.prayer_for.trim() &&
      this.formData.description.trim()
    );
  }

  onCategoryInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    this.formData.category = input;
    this.updateFilteredCategories();
    // Show dropdown if there are filtered results
    if (this.filteredCategories.length > 0) {
      this.showCategoryDropdown = true;
    }
  }

  private updateFilteredCategories(): void {
    const searchTerm = this.formData.category.toLowerCase().trim();
    if (searchTerm === '') {
      this.filteredCategories = [];
    } else {
      this.filteredCategories = this.availableCategories.filter(cat =>
        cat.toLowerCase().includes(searchTerm)
      );
    }
    this.selectedCategoryIndex = -1;
  }

  selectCategory(category: string): void {
    this.formData.category = category;
    this.showCategoryDropdown = false;
    this.filteredCategories = [];
    this.selectedCategoryIndex = -1;
    this.cdr.markForCheck();
  }

  onCategoryKeyDown(event: KeyboardEvent): void {
    if (!this.showCategoryDropdown || this.filteredCategories.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedCategoryIndex = Math.min(
          this.selectedCategoryIndex + 1,
          this.filteredCategories.length - 1
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedCategoryIndex = Math.max(this.selectedCategoryIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedCategoryIndex >= 0) {
          this.selectCategory(this.filteredCategories[this.selectedCategoryIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.showCategoryDropdown = false;
        this.selectedCategoryIndex = -1;
        break;
    }
    this.cdr.markForCheck();
  }

  async handleSubmit(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      this.cdr.markForCheck();

      // Get user name from UserSessionService cache
      const userSession = this.userSessionService.getCurrentSession();
      const fullName = userSession?.fullName || this.getCurrentUserName();

      const prayerData = {
        title: `Prayer for ${this.formData.prayer_for}`,
        description: this.formData.description,
        requester: fullName,
        prayer_for: this.formData.prayer_for,
        email: this.currentUserEmail,
        is_anonymous: this.formData.is_anonymous,
        category: this.formData.category || undefined,
        status: 'current' as const
      };

      // User is logged in - submit directly without verification
      await this.submitPrayer(prayerData);
    } catch (error) {
      console.error('Failed to initiate prayer submission:', error);
      this.isSubmitting = false;
      this.cdr.markForCheck();
      this.toast.error('Failed to submit prayer request. Please try again.');
    }
  }

  private async submitPrayer(prayerData: any): Promise<void> {
    try {
      const isPersonal = this.formData.is_personal;
      const success = isPersonal
        ? await this.prayerService.addPersonalPrayer(prayerData)
        : await this.prayerService.addPrayer(prayerData);

      if (success) {
        this.showSuccessMessage = true;
        this.cdr.markForCheck();
        
        // Emit close immediately so personal prayers list refreshes right away
        this.close.emit({ isPersonal });
        
        // Reset form
        this.formData = {
          title: '',
          description: '',
          prayer_for: '',
          is_anonymous: false,
          is_personal: false,
          category: ''
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          this.showSuccessMessage = false;
          this.cdr.markForCheck();
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to add prayer:', error);
      throw error;
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }





  cancel(): void {
    this.formData = {
      title: '',
      description: '',
      prayer_for: '',
      is_anonymous: false,
      is_personal: false,
      category: ''
    };
    this.showSuccessMessage = false;
    this.isSubmitting = false;
    this.showCategoryDropdown = false;
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.cancel();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showCategoryDropdown) {
      const target = event.target as HTMLElement;
      // Close dropdown if click is outside the category input area
      if (!target.closest('#category') && !target.closest('[class*="dropdown"]')) {
        this.showCategoryDropdown = false;
        this.cdr.markForCheck();
      }
    }
  }
}
