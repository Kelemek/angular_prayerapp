import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import type { User } from '@supabase/supabase-js';
import { PrayerService } from '../../services/prayer.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-prayer-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (isOpen) {
    <div
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
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

          <!-- Anonymous Checkbox -->
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
  @Output() close = new EventEmitter<void>();

  formData = {
    title: '',
    description: '',
    prayer_for: '',
    is_anonymous: false
  };

  isSubmitting = false;
  showSuccessMessage = false;
  isAdmin = false;
  currentUserEmail = '';
  user$!: Observable<User | null>;

  constructor(
    private prayerService: PrayerService,
    private adminAuthService: AdminAuthService,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.user$ = this.adminAuthService.user$;
    this.adminAuthService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.loadUserInfo();
    }
  }

  private loadUserInfo(): void {
    try {
      // Get current user's email from Supabase user or localStorage fallback
      this.adminAuthService.user$.subscribe(user => {
        if (user?.email) {
          this.currentUserEmail = user.email;
        } else {
          // Fallback to localStorage for approval code flow
          const approvalEmail = localStorage.getItem('approvalAdminEmail');
          const userEmail = localStorage.getItem('userEmail');
          this.currentUserEmail = approvalEmail || userEmail || '';
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

  private async fetchUserNameFromDatabase(email: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.client
        .from('email_subscribers')
        .select('name')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (!error && data?.name) {
        return data.name;
      }
    } catch (err) {
      console.error('Error fetching user name from database:', err);
    }
    return this.getCurrentUserName();
  }

  isFormValid(): boolean {
    return !!(
      this.currentUserEmail.trim() &&
      this.formData.prayer_for.trim() &&
      this.formData.description.trim()
    );
  }

  async handleSubmit(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      this.cdr.markForCheck();

      // Fetch user name from database, falling back to localStorage if needed
      const fullName = await this.fetchUserNameFromDatabase(this.currentUserEmail);

      const prayerData = {
        title: `Prayer for ${this.formData.prayer_for}`,
        description: this.formData.description,
        requester: fullName,
        prayer_for: this.formData.prayer_for,
        email: this.currentUserEmail,
        is_anonymous: this.formData.is_anonymous,
        status: 'current' as const
      };

      // User is logged in - submit directly without verification
      await this.submitPrayer(prayerData);
    } catch (error) {
      console.error('Failed to initiate prayer submission:', error);
      this.isSubmitting = false;
      this.cdr.markForCheck();
      alert('Failed to submit prayer request. Please try again.');
    }
  }

  private async submitPrayer(prayerData: any): Promise<void> {
    try {
      const success = await this.prayerService.addPrayer(prayerData);

      if (success) {
        this.showSuccessMessage = true;
        this.cdr.markForCheck();
        
        // Reset form
        this.formData = {
          title: '',
          description: '',
          prayer_for: '',
          is_anonymous: false
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          this.showSuccessMessage = false;
          this.cdr.markForCheck();
          this.close.emit();
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
      is_anonymous: false
    };
    this.showSuccessMessage = false;
    this.isSubmitting = false;
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.cancel();
    }
  }
}
