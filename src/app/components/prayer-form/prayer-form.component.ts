import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrayerService } from '../../services/prayer.service';
import { VerificationService } from '../../services/verification.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { VerificationDialogComponent } from '../verification-dialog/verification-dialog.component';

@Component({
  selector: 'app-prayer-form',
  standalone: true,
  imports: [CommonModule, FormsModule, VerificationDialogComponent],
  template: `
    <div
      *ngIf="isOpen"
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
          <div
            *ngIf="showSuccessMessage"
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

          <!-- First and Last Name Grid -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="firstName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name <span aria-label="required">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                [(ngModel)]="firstName"
                name="firstName"
                required
                aria-required="true"
                aria-label="First Name"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="First name"
              />
            </div>
            <div>
              <label for="lastName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name <span aria-label="required">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                [(ngModel)]="lastName"
                name="lastName"
                required
                aria-required="true"
                aria-label="Last Name"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Last name"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address <span aria-label="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              [(ngModel)]="formData.email"
              name="email"
              required
              aria-required="true"
              aria-label="Email Address"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Your email address"
            />
          </div>

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
              {{ showSuccessMessage ? 'Closing...' : 'Done' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Verification Dialog -->
    <app-verification-dialog
      [isOpen]="verificationState.isOpen"
      [email]="verificationState.email"
      [codeId]="verificationState.codeId"
      [expiresAt]="verificationState.expiresAt"
      (onClose)="handleVerificationCancel()"
      (onVerified)="handleVerified($event)"
      (onResend)="handleResendCode()">
    </app-verification-dialog>
  `,
  styles: []
})
export class PrayerFormComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  firstName = '';
  lastName = '';
  formData = {
    title: '',
    description: '',
    prayer_for: '',
    email: '',
    is_anonymous: false
  };

  isSubmitting = false;
  showSuccessMessage = false;
  isVerificationEnabled = false;
  isAdmin = false;

  verificationState = {
    isOpen: false,
    codeId: '',
    expiresAt: '',
    email: ''
  };

  constructor(
    private prayerService: PrayerService,
    private verificationService: VerificationService,
    private adminAuthService: AdminAuthService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.verificationService.isEnabled$.subscribe(enabled => {
      this.isVerificationEnabled = enabled;
    });
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
      const firstName = localStorage.getItem('userFirstName');
      const lastName = localStorage.getItem('userLastName');
      const email = localStorage.getItem('userEmail');

      if (firstName) this.firstName = firstName;
      if (lastName) this.lastName = lastName;
      if (email) this.formData.email = email;
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }

  private saveUserInfo(): void {
    try {
      localStorage.setItem('userFirstName', this.firstName);
      localStorage.setItem('userLastName', this.lastName);
      localStorage.setItem('userEmail', this.formData.email);
    } catch (error) {
      console.error('Error saving user info:', error);
    }
  }

  isFormValid(): boolean {
    return !!(
      this.firstName.trim() &&
      this.lastName.trim() &&
      this.formData.email.trim() &&
      this.formData.prayer_for.trim() &&
      this.formData.description.trim()
    );
  }

  async handleSubmit(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting) return;

    try {
      this.isSubmitting = true;

      const fullName = `${this.firstName.trim()} ${this.lastName.trim()}`;
      this.saveUserInfo();

      const prayerData = {
        title: `Prayer for ${this.formData.prayer_for}`,
        description: this.formData.description,
        requester: fullName,
        prayer_for: this.formData.prayer_for,
        email: this.formData.email,
        is_anonymous: this.formData.is_anonymous,
        status: 'current' as const
      };

      // Check if verification is required (skip if admin is logged in)
      const isAdmin = this.adminAuthService.getIsAdmin();
      if (this.isVerificationEnabled && !isAdmin) {
        const verificationResult = await this.verificationService.requestCode(
          this.formData.email,
          'prayer_submission',
          prayerData
        );

        // If null, user was recently verified - skip verification dialog
        if (verificationResult === null) {
          await this.submitPrayer(prayerData);
          return;
        }

        // Show verification dialog
        this.verificationState = {
          isOpen: true,
          codeId: verificationResult.codeId,
          expiresAt: verificationResult.expiresAt,
          email: this.formData.email
        };
      } else {
        // No verification required, submit directly
        await this.submitPrayer(prayerData);
      }
    } catch (error) {
      console.error('Failed to initiate prayer submission:', error);
      this.isSubmitting = false;
      alert('Failed to submit prayer request. Please try again.');
    }
  }

  private async submitPrayer(prayerData: any): Promise<void> {
    try {
      const success = await this.prayerService.addPrayer(prayerData);

      if (success) {
        this.showSuccessMessage = true;
        
        // Reset form but keep name and email
        this.formData = {
          title: '',
          description: '',
          prayer_for: '',
          email: this.formData.email,
          is_anonymous: false
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          this.showSuccessMessage = false;
          this.close.emit();
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to add prayer:', error);
      throw error;
    } finally {
      this.isSubmitting = false;
    }
  }

  async handleVerified(actionData: any): Promise<void> {
    try {
      await this.submitPrayer(actionData);
      
      // Close verification dialog
      this.verificationState = {
        isOpen: false,
        codeId: '',
        expiresAt: '',
        email: ''
      };
    } catch (error) {
      console.error('Failed to submit verified prayer:', error);
      // Don't close verification dialog on error
      throw error;
    }
  }

  handleVerificationCancel(): void {
    this.verificationState = {
      isOpen: false,
      codeId: '',
      expiresAt: '',
      email: ''
    };
    this.isSubmitting = false;
  }

  async handleResendCode(): Promise<void> {
    try {
      if (!this.formData.email) return;

      const fullName = `${this.firstName.trim()} ${this.lastName.trim()}`;

      const prayerData = {
        title: `Prayer for ${this.formData.prayer_for}`,
        description: this.formData.description,
        requester: fullName,
        prayer_for: this.formData.prayer_for,
        email: this.formData.email,
        is_anonymous: this.formData.is_anonymous,
        status: 'current' as const
      };

      const verificationResult = await this.verificationService.requestCode(
        this.formData.email,
        'prayer_submission',
        prayerData
      );

      if (verificationResult === null) {
        console.warn('User was recently verified, no need to resend code');
        return;
      }

      // Update verification state with new code
      this.verificationState = {
        ...this.verificationState,
        codeId: verificationResult.codeId,
        expiresAt: verificationResult.expiresAt
      };
    } catch (error) {
      console.error('Failed to resend verification code:', error);
      throw error
      console.error('Failed to submit prayer:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  cancel(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.cancel();
    }
  }
}
