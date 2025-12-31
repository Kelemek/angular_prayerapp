import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { lookupPersonByEmail, formatPersonName, type PlanningCenterPerson } from '../../../lib/planning-center';
import { environment } from '../../../environments/environment';

export interface AccountApprovalRequest {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  approval_status: 'pending' | 'approved' | 'denied';
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-pending-account-approval-card',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            {{ request.first_name }} {{ request.last_name }}
          </h3>
          <div class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p class="break-words">
              Email: {{ request.email }}
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
                Not in Planning Center
              </span>
              }
              @if (!pcLoading && pcError) {
              <span class="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
                Verification error
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
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500">
              Requested: {{ formatDate(request.created_at) }}
            </p>
          </div>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Pending
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2 flex-wrap">
        @if (!isDenying) {
        <button
          (click)="handleApprove()"
          [disabled]="isApproving"
          class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ isApproving ? 'Approving...' : 'Approve' }}
        </button>
        }

        @if (!isDenying) {
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
      <div class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reason for denial (optional)
        </label>
        <textarea
          [(ngModel)]="denialReason"
          rows="3"
          placeholder="Explain why this account request is being denied..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
        ></textarea>
        <div class="flex gap-2">
          <button
            (click)="handleDeny()"
            [disabled]="isDenyingInProgress"
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
export class PendingAccountApprovalCardComponent implements OnInit {
  @Input() request!: AccountApprovalRequest;
  @Output() approve = new EventEmitter<string>();
  @Output() deny = new EventEmitter<{ id: string; reason: string }>();

  isApproving = false;
  isDenying = false;
  isDenyingInProgress = false;
  denialReason = '';

  // Planning Center verification
  pcPerson: PlanningCenterPerson | null = null;
  pcLoading = false;
  pcError = false;

  private supabase = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.lookupPlanningCenterPerson();
  }

  private async lookupPlanningCenterPerson() {
    if (!this.request?.email) {
      return;
    }

    this.pcLoading = true;
    this.pcError = false;

    try {
      const result = await lookupPersonByEmail(
        this.request.email,
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
      console.error('Planning Center lookup exception:', error);
      this.pcError = true;
    } finally {
      this.pcLoading = false;
      this.cdr.markForCheck();
    }
  }

  formatPersonName(person: PlanningCenterPerson | null): string {
    return person ? formatPersonName(person) : '';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  handleApprove() {
    if (this.isApproving) return;
    this.isApproving = true;
    this.approve.emit(this.request.id);
  }

  handleDeny() {
    if (this.isDenyingInProgress) return;
    this.isDenyingInProgress = true;
    this.deny.emit({ id: this.request.id, reason: this.denialReason.trim() });
  }
}
