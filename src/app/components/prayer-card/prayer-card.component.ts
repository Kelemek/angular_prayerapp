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
          class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
          [title]="isAdmin ? 'Delete prayer' : 'Request deletion'"
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
          class="px-3 py-1 text-xs bg-[#39704D] bg-opacity-10 dark:bg-opacity-20 text-[#39704D] dark:text-[#5FB876] rounded-md border border-[#39704D] hover:bg-opacity-20 dark:hover:bg-opacity-30"
        >
          Add Update
        </button>
      </div>

      <!-- Add Update Form -->
      <form *ngIf="showAddUpdateForm" (ngSubmit)="handleAddUpdate()" class="mb-4 p-4 bg-[#39704D] bg-opacity-10 dark:bg-[#39704D] dark:bg-opacity-20 border border-[#39704D] dark:border-[#39704D] rounded-lg">
        <h4 class="text-sm font-medium text-[#39704D] dark:text-[#5FB876] mb-3">Add Prayer Update</h4>
        <div class="space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="First name"
              [(ngModel)]="updateFirstName"
              name="updateFirstName"
              class="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D]"
              required
            />
            <input
              type="text"
              placeholder="Last name"
              [(ngModel)]="updateLastName"
              name="updateLastName"
              class="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D]"
              required
            />
          </div>
          <input
            type="email"
            placeholder="Your email"
            [(ngModel)]="updateEmail"
            name="updateEmail"
            class="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D]"
            required
          />
          <textarea
            placeholder="Prayer update..."
            [(ngModel)]="updateContent"
            name="updateContent"
            class="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D] h-20"
            required
          ></textarea>
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="updateIsAnonymous-{{prayer.id}}"
              [(ngModel)]="updateIsAnonymous"
              name="updateIsAnonymous"
              class="rounded border-gray-900 dark:border-white"
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
              class="rounded border-gray-900 dark:border-white"
            />
            <label [for]="'updateMarkAsAnswered-' + prayer.id" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Mark this prayer as answered
            </label>
          </div>
          <div class="flex gap-2">
            <button
              type="submit"
              class="px-3 py-1 text-sm bg-[#39704D] text-white rounded-md hover:bg-[#2d5a3f]"
            >
              Add Update
            </button>
            <button
              type="button"
              (click)="showAddUpdateForm = false"
              class="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <!-- Delete Request Form -->
      <form *ngIf="showDeleteRequestForm" (ngSubmit)="handleDeleteRequest()" class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg">
        <h4 class="text-sm font-medium text-red-700 dark:text-red-400 mb-3">Request Prayer Deletion</h4>
        <div class="space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="First name"
              [(ngModel)]="deleteFirstName"
              name="deleteFirstName"
              class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            <input
              type="text"
              placeholder="Last name"
              [(ngModel)]="deleteLastName"
              name="deleteLastName"
              class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <input
            type="email"
            placeholder="Your email"
            [(ngModel)]="deleteEmail"
            name="deleteEmail"
            class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
          <textarea
            placeholder="Reason for deletion request..."
            [(ngModel)]="deleteReason"
            name="deleteReason"
            class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
            required
          ></textarea>
          <div class="flex gap-2">
            <button
              type="submit"
              class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Submit Request
            </button>
            <button
              type="button"
              (click)="showDeleteRequestForm = false"
              class="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
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
            Recent Updates <span *ngIf="prayer.updates.length > 2">({{ showAllUpdates ? prayer.updates.length : 2 }} of {{ prayer.updates.length }})</span>
          </h4>
          <button
            *ngIf="prayer.updates.length > 2"
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
                  *ngIf="isAdmin"
                  (click)="handleDeleteUpdate(update.id)"
                  class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                  title="Delete update"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
              <span class="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-3 text-xs text-gray-500 dark:text-gray-400">
                {{ formatDate(update.created_at) }}
              </span>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300">{{ update.content }}</p>
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

  showAddUpdateForm = false;
  showDeleteRequestForm = false;
  showAllUpdates = false;

  // Update form fields
  updateFirstName = '';
  updateLastName = '';
  updateEmail = '';
  updateContent = '';
  updateIsAnonymous = false;
  updateMarkAsAnswered = false;

  // Delete request form fields
  deleteFirstName = '';
  deleteLastName = '';
  deleteEmail = '';
  deleteReason = '';

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
    if (this.deletionsAllowed === 'email-only' && this.prayer.email) return true;
    
    return false;
  }

  showAddUpdateButton(): boolean {
    if (this.isAdmin) return true;
    
    if (this.updatesAllowed === 'everyone') return true;
    if (this.updatesAllowed === 'email-only') return true;
    
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
      author: this.updateIsAnonymous ? 'Anonymous' : `${this.updateFirstName} ${this.updateLastName}`,
      author_email: this.updateEmail || null,
      is_anonymous: this.updateIsAnonymous,
      mark_as_answered: this.updateMarkAsAnswered
    };

    this.addUpdate.emit(updateData);
    this.resetUpdateForm();
  }

  handleDeleteRequest(): void {
    const requestData = {
      prayer_id: this.prayer.id,
      requester_first_name: this.deleteFirstName,
      requester_last_name: this.deleteLastName,
      requester_email: this.deleteEmail,
      reason: this.deleteReason
    };

    this.requestDeletion.emit(requestData);
    this.resetDeleteForm();
  }

  handleDeleteUpdate(updateId: string): void {
    if (confirm('Are you sure you want to delete this update? This action cannot be undone.')) {
      this.deleteUpdate.emit(updateId);
    }
  }

  getDisplayedUpdates() {
    if (!this.prayer.updates) return [];
    return this.showAllUpdates ? this.prayer.updates : this.prayer.updates.slice(0, 2);
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
    this.updateFirstName = '';
    this.updateLastName = '';
    this.updateEmail = '';
    this.updateContent = '';
    this.updateIsAnonymous = false;
    this.updateMarkAsAnswered = false;
    this.showAddUpdateForm = false;
  }

  private resetDeleteForm(): void {
    this.deleteFirstName = '';
    this.deleteLastName = '';
    this.deleteEmail = '';
    this.deleteReason = '';
    this.showDeleteRequestForm = false;
  }
}
