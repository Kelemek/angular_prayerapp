import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrayerRequest } from '../../services/prayer.service';

@Component({
  selector: 'app-prayer-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] p-6 mb-4 transition-colors relative ' + getBorderClass()"
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <div class="relative flex items-center gap-2 flex-wrap">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-0 inline">
              Prayer for {{ prayer.prayer_for }}
            </h3>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Requested by: <span class="font-medium text-gray-800 dark:text-gray-100">{{ displayRequester() }}</span>
            </span>
          </div>
        </div>
        <button
          *ngIf="showDeleteButton()"
          (click)="handleDeleteClick()"
          aria-label="Delete prayer request"
          title="Delete prayer request"
          class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <!-- Centered timestamp -->
      <span class="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
        {{ formatDate(prayer.created_at) }}
      </span>

      <!-- Prayer Description -->
      <p class="text-gray-600 dark:text-gray-300 mb-4">{{ prayer.description }}</p>

      <!-- Action buttons -->
      <div *ngIf="showAddUpdateButton()" class="flex flex-wrap gap-1 mb-4">
        <button
          (click)="toggleAddUpdate()"
          title="Add an update to this prayer"
          class="px-3 py-1 text-xs bg-[#39704D] bg-opacity-10 dark:bg-opacity-20 text-[#39704D] dark:text-[#5FB876] rounded-md border border-[#39704D] hover:bg-opacity-20 dark:hover:bg-opacity-30"
        >
          Add Update
        </button>
      </div>

      <!-- Add Update Form -->
      <form *ngIf="showAddUpdateForm" #updateForm="ngForm" (ngSubmit)="updateForm.valid && handleAddUpdate()" class="mb-4 p-4 bg-[#39704D] bg-opacity-10 dark:bg-[#39704D] dark:bg-opacity-20 border border-[#39704D] dark:border-[#39704D] rounded-lg" role="region" [attr.aria-labelledby]="'addUpdateTitle-' + prayer.id">
        <h4 [id]="'addUpdateTitle-' + prayer.id" class="text-sm font-medium text-[#39704D] dark:text-[#5FB876] mb-3">Add Prayer Update</h4>
        <div class="space-y-2">
          <textarea
            [id]="'updateContent-' + prayer.id"
            placeholder="Prayer update..."
            [(ngModel)]="updateContent"
            name="updateContent"
            aria-label="Prayer update details"
            class="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D] h-20"
            required
          ></textarea>
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="updateIsAnonymous-{{prayer.id}}"
              [(ngModel)]="updateIsAnonymous"
              name="updateIsAnonymous"
              class="rounded border-gray-900 dark:border-white focus:ring-2 focus:ring-[#39704D]"
            />
            <label [for]="'updateIsAnonymous-' + prayer.id" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Post update anonymously
            </label>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="updateMarkAsAnswered-{{prayer.id}}"
              [(ngModel)]="updateMarkAsAnswered"
              name="updateMarkAsAnswered"
              class="rounded border-gray-900 dark:border-white focus:ring-2 focus:ring-[#39704D]"
            />
            <label [for]="'updateMarkAsAnswered-' + prayer.id" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Mark this prayer as answered
            </label>
          </div>
          <div class="flex gap-2">
            <button
              type="submit"
              [disabled]="!updateForm.valid"
              class="px-3 py-1 text-sm bg-[#39704D] text-white rounded-md hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Submit prayer update"
            >
              Add Update
            </button>
            <button
              type="button"
              (click)="showAddUpdateForm = false"
              class="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Cancel prayer update form"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <!-- Delete Request Form -->
      <form *ngIf="showDeleteRequestForm" #deleteForm="ngForm" (ngSubmit)="deleteForm.valid && handleDeleteRequest()" class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg" role="region" [attr.aria-labelledby]="'deleteFormTitle-' + prayer.id">
        <h4 [id]="'deleteFormTitle-' + prayer.id" class="text-sm font-medium text-red-700 dark:text-red-400 mb-3">Request Prayer Deletion</h4>
        <div class="space-y-2">
          <textarea
            [id]="'deleteReason-' + prayer.id"
            placeholder="Reason for deletion request..."
            [(ngModel)]="deleteReason"
            name="deleteReason"
            aria-label="Reason for deletion"
            class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
            required
          ></textarea>
          <div class="flex gap-2">
            <button
              type="submit"
              [disabled]="!deleteForm.valid"
              class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Submit deletion request"
            >
              Submit Request
            </button>
            <button
              type="button"
              (click)="showDeleteRequestForm = false"
              class="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Cancel deletion request form"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <!-- Recent Updates -->
      <div *ngIf="prayer.updates && prayer.updates.length > 0" class="pt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Recent Updates <span *ngIf="!showAllUpdates && getDisplayedUpdates().length < prayer.updates.length">({{ getDisplayedUpdates().length }} of {{ prayer.updates.length }})</span>
          </h4>
          <button
            *ngIf="shouldShowToggleButton()"
            (click)="showAllUpdates = !showAllUpdates"
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            {{ showAllUpdates ? 'Show less' : 'Show all' }}
            <svg [class]="'transform transition-transform ' + (showAllUpdates ? 'rotate-180' : '')" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div 
            *ngFor="let update of getDisplayedUpdates()"
            [class]="'bg-gray-100 dark:bg-gray-700 rounded-lg p-6 border ' + getBorderClass()"
          >
            <div class="relative mb-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  Requested by: <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ update.author }}</span>
                </span>
                <button
                  *ngIf="showUpdateDeleteButton()"
                  (click)="handleDeleteUpdate(update.id)"
                  aria-label="Delete prayer update"
                  title="Delete this update"
                  class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
              <span class="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {{ formatDate(update.created_at) }}
              </span>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300">{{ update.content }}</p>
            
            <form *ngIf="showUpdateDeleteRequestForm === update.id && !isAdmin" #updateDeleteForm="ngForm" (ngSubmit)="updateDeleteForm.valid && handleUpdateDeletionRequest()" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="region" [attr.aria-labelledby]="'updateDeleteFormTitle-' + update.id">
              <h4 [id]="'updateDeleteFormTitle-' + update.id" class="text-xs font-medium text-red-700 dark:text-red-400 mb-2">Request Update Deletion</h4>
              <div class="space-y-2">
                <textarea
                  [id]="'updateDeleteReason-' + update.id"
                  placeholder="Reason for deletion request..."
                  [(ngModel)]="updateDeleteReason"
                  name="updateDeleteReason"
                  aria-label="Reason for deletion"
                  class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
                  required
                ></textarea>
                <div class="flex gap-2">
                  <button
                    type="submit"
                    [disabled]="!updateDeleteForm.valid"
                    class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Submit update deletion request"
                  >
                    Submit Request
                  </button>
                  <button
                    type="button"
                    (click)="showUpdateDeleteRequestForm = null"
                    class="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    aria-label="Cancel update deletion request form"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PrayerCardComponent implements OnInit {
  @Input() prayer!: PrayerRequest;
  @Input() isAdmin = false;
  @Input() deletionsAllowed: 'everyone' | 'email-only' | 'admin-only' = 'everyone';
  @Input() updatesAllowed: 'everyone' | 'email-only' | 'admin-only' = 'everyone';
  
  @Output() delete = new EventEmitter<string>();
  @Output() addUpdate = new EventEmitter<any>();
  @Output() deleteUpdate = new EventEmitter<string>();
  @Output() requestDeletion = new EventEmitter<any>();
  @Output() requestUpdateDeletion = new EventEmitter<any>();

  showAddUpdateForm = false;
  showDeleteRequestForm = false;
  showUpdateDeleteRequestForm: string | null = null;
  showAllUpdates = false;

  // Update form fields
  updateContent = '';
  updateIsAnonymous = false;
  updateMarkAsAnswered = false;

  // Delete request form fields
  deleteReason = '';

  // Update deletion request form fields
  updateDeleteReason = '';

  ngOnInit(): void {
    // Any initialization logic
  }

  getBorderClass(): string {
    if (this.prayer.status === 'current') {
      return '!border-[#0047AB] dark:!border-[#0047AB]';
    } else if (this.prayer.status === 'answered') {
      return '!border-[#39704D] dark:!border-[#39704D]';
    } else {
      return '!border-[#C9A961] dark:!border-[#C9A961]';
    }
  }

  displayRequester(): string {
    return this.prayer.is_anonymous ? 'Anonymous' : this.prayer.requester;
  }

  showDeleteButton(): boolean {
    if (this.isAdmin) return true;
    if (this.deletionsAllowed === 'everyone') return true;
    if (this.deletionsAllowed === 'email-only') return true;
    return false;
  }

  showAddUpdateButton(): boolean {
    if (this.isAdmin) return true;
    
    if (this.updatesAllowed === 'everyone') return true;
    if (this.updatesAllowed === 'email-only') return true;
    
    return false;
  }

  showUpdateDeleteButton(): boolean {
    if (this.isAdmin) return true;
    if (this.deletionsAllowed === 'everyone') return true;
    if (this.deletionsAllowed === 'email-only') return true;
    return false;
  }

  handleDeleteClick(): void {
    if (this.isAdmin) {
      if (confirm('Are you sure you want to delete this prayer? This action cannot be undone.')) {
        this.delete.emit(this.prayer.id);
      }
    } else {
      this.showDeleteRequestForm = !this.showDeleteRequestForm;
      if (this.showDeleteRequestForm) {
        this.showAddUpdateForm = false;
      }
    }
  }

  toggleAddUpdate(): void {
    this.showAddUpdateForm = !this.showAddUpdateForm;
    if (this.showAddUpdateForm) {
      this.showDeleteRequestForm = false;
    }
  }

  handleAddUpdate(): void {
    const updateData = {
      prayer_id: this.prayer.id,
      content: this.updateContent,
      author: this.updateIsAnonymous ? 'Anonymous' : this.getCurrentUserName(),
      author_email: this.getCurrentUserEmail(),
      is_anonymous: this.updateIsAnonymous,
      mark_as_answered: this.updateMarkAsAnswered
    };

    this.addUpdate.emit(updateData);
    this.resetUpdateForm();
  }

  handleDeleteRequest(): void {
    const nameParts = this.getCurrentUserName().split(' ');
    const requestData = {
      prayer_id: this.prayer.id,
      requester_first_name: nameParts[0] || '',
      requester_last_name: nameParts.slice(1).join(' ') || '',
      requester_email: this.getCurrentUserEmail(),
      reason: this.deleteReason
    };

    this.requestDeletion.emit(requestData);
    this.resetDeleteForm();
  }

  handleDeleteUpdate(updateId: string): void {
    if (this.isAdmin) {
      if (confirm('Are you sure you want to delete this update? This action cannot be undone.')) {
        this.deleteUpdate.emit(updateId);
      }
    } else {
      // Toggle the form - close if already open for this update, open if closed
      if (this.showUpdateDeleteRequestForm === updateId) {
        this.showUpdateDeleteRequestForm = null;
      } else {
        this.showUpdateDeleteRequestForm = updateId;
        this.showAddUpdateForm = false;
        this.showDeleteRequestForm = false;
      }
    }
  }

  getDisplayedUpdates() {
    if (!this.prayer.updates) return [];
    const sortedUpdates = [...this.prayer.updates].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    if (this.showAllUpdates) return sortedUpdates;
    
    // Get updates from the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentUpdates = sortedUpdates.filter(update => 
      new Date(update.created_at).getTime() > oneWeekAgo.getTime()
    );
    
    // If there are updates less than 1 week old, show all of them
    // Otherwise, show only the most recent update
    return recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);
  }

  shouldShowToggleButton(): boolean {
    if (!this.prayer.updates) return false;
    const displayed = this.getDisplayedUpdates();
    return displayed.length < this.prayer.updates.length || this.showAllUpdates;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private resetUpdateForm(): void {
    this.updateContent = '';
    this.updateIsAnonymous = false;
    this.updateMarkAsAnswered = false;
    this.showAddUpdateForm = false;
  }

  private resetDeleteForm(): void {
    this.deleteReason = '';
    this.showDeleteRequestForm = false;
  }

  private getCurrentUserEmail(): string {
    // Try to get from localStorage (approval code flow)
    const approvalEmail = localStorage.getItem('approvalAdminEmail');
    if (approvalEmail) return approvalEmail;
    
    // Try other possible localStorage keys
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) return userEmail;
    
    const prayerappEmail = localStorage.getItem('prayerapp_user_email');
    if (prayerappEmail) return prayerappEmail;
    
    return '';
  }

  private getCurrentUserName(): string {
    const firstName = localStorage.getItem('userFirstName') || '';
    const lastName = localStorage.getItem('userLastName') || '';
    return `${firstName} ${lastName}`.trim();
  }

  handleUpdateDeletionRequest(): void {
    if (!this.showUpdateDeleteRequestForm) return;
    
    const nameParts = this.getCurrentUserName().split(' ');
    const requestData = {
      update_id: this.showUpdateDeleteRequestForm,
      requester_first_name: nameParts[0] || '',
      requester_last_name: nameParts.slice(1).join(' ') || '',
      requester_email: this.getCurrentUserEmail(),
      reason: this.updateDeleteReason
    };

    this.requestUpdateDeletion.emit(requestData);
    this.resetUpdateDeleteForm();
  }

  private resetUpdateDeleteForm(): void {
    this.updateDeleteReason = '';
    this.showUpdateDeleteRequestForm = null;
  }
}
