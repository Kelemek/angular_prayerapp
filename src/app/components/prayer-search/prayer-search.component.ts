import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PrayerService } from '../../services/prayer.service';
import { AdminDataService } from '../../services/admin-data.service';
import { SendNotificationDialogComponent, type NotificationType } from '../send-notification-dialog/send-notification-dialog.component';

interface PrayerUpdate {
  id: string;
  content: string;
  author: string;
  created_at: string;
  denial_reason?: string | null;
  approval_status?: string;
}

interface Prayer {
  id: string;
  title: string;
  requester: string;
  email: string | null;
  status: string;
  created_at: string;
  denial_reason?: string | null;
  description?: string | null;
  approval_status?: string;
  prayer_for?: string;
  prayer_updates?: PrayerUpdate[];
}

interface EditForm {
  title: string;
  description: string;
  requester: string;
  email: string;
  prayer_for: string;
  status: string;
}

interface CreateForm {
  description: string;
  firstName: string;
  lastName: string;
  email: string;
  prayer_for: string;
  status: string;
  is_anonymous: boolean;
}

interface NewUpdate {
  content: string;
  firstName: string;
  lastName: string;
  author_email: string;
}

@Component({
  selector: 'app-prayer-search',
  standalone: true,
  imports: [CommonModule, FormsModule, SendNotificationDialogComponent],
  template: `
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
  <div class="flex items-center gap-2 mb-4">
    <svg class="text-red-600 dark:text-red-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
    <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100">
      Prayer Editor
    </h3>
  </div>

  <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
    Search and filter prayers by title, requester, email, description, or denial reasons. Use dropdown filters to automatically load results. Delete individually or in bulk.
  </p>

  <!-- Create New Prayer Button -->
  <div class="mb-4">
    <button
      (click)="startCreatePrayer()"
      class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Create New Prayer
    </button>
  </div>

  <!-- Create Prayer Form -->
  @if (creatingPrayer) {
  <div class="mb-4 p-4 border-2 border-green-300 dark:border-green-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100">
        Create New Prayer
      </h4>
      <button
        type="button"
        (click)="cancelCreatePrayer()"
        class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <form (submit)="createPrayer($event)" class="space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First Name *
          </label>
          <input
            type="text"
            [(ngModel)]="createForm.firstName"
            name="firstName"
            required
            placeholder="First name"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            [(ngModel)]="createForm.lastName"
            name="lastName"
            required
            placeholder="Last name"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email *
        </label>
        <input
          type="email"
          [(ngModel)]="createForm.email"
          name="email"
          required
          placeholder="email@example.com"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Praying For *
        </label>
        <input
          type="text"
          [(ngModel)]="createForm.prayer_for"
          name="prayer_for"
          required
          placeholder="e.g., healing, guidance, strength"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Title will be generated as "Prayer for [praying for]"
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description *
        </label>
        <textarea
          [(ngModel)]="createForm.description"
          name="description"
          required
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
        ></textarea>
      </div>

      <div class="flex items-center cursor-pointer">
        <input
          type="checkbox"
          [(ngModel)]="createForm.is_anonymous"
          name="is_anonymous"
          id="create_is_anonymous"
          class="w-4 h-4 text-green-600 border-gray-900 dark:border-white rounded focus:ring-green-500 bg-white dark:bg-gray-800"
        />
        <label for="create_is_anonymous" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Submit anonymously (your name will not be shown publicly)
        </label>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Status *
        </label>
        <div class="relative">
          <select
            [(ngModel)]="createForm.status"
            name="status"
            required
            class="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 pr-10 cursor-pointer"
          >
            <option value="current">Current</option>
            <option value="answered">Answered</option>
            <option value="archived">Archived</option>
          </select>
          <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 dark:text-green-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          type="submit"
          [disabled]="!isCreateFormValid() || saving"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
        >
          @if (saving) {
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          }
          @if (!saving) {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          }
          {{ saving ? 'Creating...' : 'Create Prayer' }}
        </button>

        <button
          type="button"
          (click)="cancelCreatePrayer()"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
  }

  <!-- Search Input -->
  <div class="flex gap-2 mb-4">
    <div class="flex-1 relative">
      <input
        type="text"
        [(ngModel)]="searchTerm"
        (keypress)="onKeyPress($event)"
        placeholder="Search by title, requester, email, description, or denial reasons..."
        class="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      @if (searchTerm) {
      <button
        (click)="clearSearch()"
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      }
    </div>
    <button
      (click)="handleSearch()"
      [disabled]="searching"
      class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
    >
      @if (searching) {
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      }
      @if (!searching) {
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
      }
      {{ searching ? 'Searching...' : 'Search' }}
    </button>
  </div>

  <!-- Filter Dropdowns -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
    <!-- Prayer Status Filter -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Prayer Status
      </label>
      <div class="relative">
        <select
          [(ngModel)]="statusFilter"
          (change)="onStatusFilterChange()"
          class="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
        >
          <option value="">Select status...</option>
          <option value="all">All Statuses</option>
          <option value="current">Current</option>
          <option value="answered">Answered</option>
          <option value="archived">Archived</option>
        </select>
        <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>

    <!-- Approval Status Filter -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Approval Status
      </label>
      <div class="relative">
        <select
          [(ngModel)]="approvalFilter"
          (change)="onApprovalFilterChange()"
          class="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
        >
          <option value="">Select approval...</option>
          <option value="all">All Approvals</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="denied">Denied</option>
        </select>
        <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
  </div>

  <!-- Error Message -->
  @if (error) {
  <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
    <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
  </div>
  }

  <!-- Bulk Actions -->
  @if (displayPrayers.length > 0) {
  <div class="flex flex-wrap items-start justify-between gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
    <div class="flex items-center gap-3 w-full sm:w-auto">
      <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          [checked]="selectedPrayers.size === displayPrayers.length && displayPrayers.length > 0"
          (change)="toggleSelectAll()"
          class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
        />
        <span>Select All ({{ displayPrayers.length }})</span>
      </label>
      @if (selectedPrayers.size > 0) {
      <span class="text-sm text-red-600 dark:text-red-400 font-medium">
        {{ selectedPrayers.size }} selected
      </span>
      }
    </div>
    @if (selectedPrayers.size > 0) {
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
      <!-- Bulk Status Change -->
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <label class="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap sm:mr-2">
          Change Status:
        </label>
        <div class="relative flex-1 sm:flex-none">
          <select
            [(ngModel)]="bulkStatus"
            class="w-full appearance-none px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer"
          >
            <option value="">Select...</option>
            <option value="current">Current</option>
            <option value="answered">Answered</option>
            <option value="archived">Archived</option>
          </select>
          <svg class="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <!-- Buttons row -->
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <button
          (click)="updateSelectedStatus()"
          [disabled]="!bulkStatus || updatingStatus"
          class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-sm"
        >
          @if (updatingStatus) {
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          }
          @if (!updatingStatus) {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          }
          {{ updatingStatus ? 'Updating...' : 'Update (' + selectedPrayers.size + ')' }}
        </button>

        <button
          (click)="deleteSelected()"
          [disabled]="deleting"
          class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm"
        >
          @if (deleting) {
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          }
          @if (!deleting) {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          }
          {{ deleting ? 'Deleting...' : 'Delete (' + selectedPrayers.size + ')' }}
        </button>
      </div>
    </div>
    }
  </div>
  }

  <!-- Search Results -->
  @if (searching) {
  <div class="flex flex-col items-center justify-center py-12">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 dark:border-red-400 mb-4"></div>
    <p class="text-gray-600 dark:text-gray-400">Loading prayer data...</p>
  </div>
  }

  @if (!searching && displayPrayers.length > 0) {
  <div class="space-y-1">
    @for (prayer of displayPrayers; track prayer.id) {
    <div [class]="'border rounded-lg transition-all duration-200 ' + (selectedPrayers.has(prayer.id) ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800')">
      
      <!-- Compact Header - Always Visible -->
      <div class="flex items-center gap-3 p-3">
        <input
          type="checkbox"
          [checked]="selectedPrayers.has(prayer.id)"
          (change)="toggleSelectPrayer(prayer.id)"
          (click)="$event.stopPropagation()"
          class="w-4 h-4 text-red-600 border-gray-800 dark:border-gray-600 rounded focus:ring-red-500 cursor-pointer"
        />
        
        <button
          (click)="toggleExpandCard(prayer.id)"
          class="flex-1 flex flex-col gap-1.5 text-left min-w-0"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="font-medium text-gray-900 dark:text-gray-100">
              {{ prayer.title }}
            </h4>
            <span [class]="'px-2 py-0.5 text-xs rounded-full capitalize flex-shrink-0 ' + getStatusColor(prayer.status)">
              {{ prayer.status }}
            </span>
            @if (prayer.approval_status) {
            <span [class]="'px-2 py-0.5 text-xs rounded-full capitalize flex-shrink-0 ' + getApprovalStatusColor(prayer.approval_status)">
              {{ prayer.approval_status }}
            </span>
            }
            @if (prayer.denial_reason) {
            <span class="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex-shrink-0">
              Has Denial
            </span>
            }
          </div>
          
          <div class="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span class="font-medium">Requester:</span> {{ prayer.requester }}
            </div>
            @if (prayer.email) {
            <div class="truncate">
              <span class="font-medium">Email:</span> {{ prayer.email }}
            </div>
            }
            <div>
              <span class="font-medium">Created:</span> {{ prayer.created_at | date:'shortDate' }}
            </div>
          </div>
        </button>

        <div class="flex flex-col gap-2 flex-shrink-0">
          @if (expandedCards.has(prayer.id)) {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          }
          @if (!expandedCards.has(prayer.id)) {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          }
          <button
            (click)="$event.stopPropagation(); startEditPrayer(prayer)"
            [disabled]="saving"
            class="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
            title="Edit this prayer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button
            (click)="$event.stopPropagation(); deletePrayer(prayer)"
            [disabled]="deleting"
            class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
            title="Delete this prayer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Expanded Details - Only Visible When Expanded -->
      @if (expandedCards.has(prayer.id)) {
      <div class="px-6 pb-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="pt-4 space-y-3">
          <div class="flex items-center justify-between mb-3">
            <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ editingPrayer === prayer.id ? 'Edit Prayer Details' : 'Complete Prayer Details' }}
            </h5>
            @if (editingPrayer === prayer.id) {
            <div class="flex gap-2">
              <button
                (click)="savePrayer(prayer.id)"
                [disabled]="saving"
                class="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button
                (click)="cancelEdit()"
                [disabled]="saving"
                class="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Cancel
              </button>
            </div>
            }
          </div>
          
          <!-- Edit Mode Form -->
          @if (editingPrayer === prayer.id) {
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                [(ngModel)]="editForm.title"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Prayer title"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                [(ngModel)]="editForm.description"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Prayer description"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Requester *
                </label>
                <input
                  type="text"
                  [(ngModel)]="editForm.requester"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Requester name"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  [(ngModel)]="editForm.email"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Praying For
              </label>
              <input
                type="text"
                [(ngModel)]="editForm.prayer_for"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Person being prayed for"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <div class="relative">
                <select
                  [(ngModel)]="editForm.status"
                  class="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                >
                  <option value="current">Current</option>
                  <option value="answered">Answered</option>
                  <option value="archived">Archived</option>
                </select>
                <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          </div>
          }

          <!-- View Mode -->
          @if (editingPrayer !== prayer.id) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Basic Information -->
              <div class="space-y-3">
                <div class="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h6 class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                    Basic Information
                  </h6>
                  
                  <div class="space-y-2 text-sm">
                    <div>
                      <span class="font-medium text-gray-700 dark:text-gray-300">Title:</span>
                      <span class="ml-2 text-gray-600 dark:text-gray-400">{{ prayer.title }}</span>
                    </div>
                    
                    <div>
                      <span class="font-medium text-gray-700 dark:text-gray-300">Requester:</span>
                      <span class="ml-2 text-gray-600 dark:text-gray-400">{{ prayer.requester }}</span>
                    </div>
                    
                    @if (prayer.email) {
                    <div>
                      <span class="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                      <span class="ml-2 text-gray-600 dark:text-gray-400">{{ prayer.email }}</span>
                    </div>
                    }
                    
                    @if (prayer.prayer_for) {
                    <div>
                      <span class="font-medium text-gray-700 dark:text-gray-300">Praying For:</span>
                      <span class="ml-2 text-gray-600 dark:text-gray-400">{{ prayer.prayer_for }}</span>
                    </div>
                    }
                  </div>
                </div>
              </div>
              
              <!-- Status Information -->
              <div class="space-y-3">
                <div class="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h6 class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                    Status Information
                  </h6>
                  
                  <div class="space-y-2 text-sm">
                    <div>
                      <span class="font-medium text-gray-700 dark:text-gray-300">Prayer Status:</span>
                      <span [class]="'ml-2 px-2 py-0.5 text-xs rounded-full capitalize ' + getStatusColor(prayer.status)">
                        {{ prayer.status }}
                      </span>
                    </div>
                    
                    @if (prayer.approval_status) {
                    <div>
                      <span class="font-medium text-gray-700 dark:text-gray-300">Approval Status:</span>
                      <span [class]="'ml-2 px-2 py-0.5 text-xs rounded-full capitalize ' + getApprovalStatusColor(prayer.approval_status)">
                        {{ prayer.approval_status }}
                      </span>
                    </div>
                    }
                    
                    <div>
                      <span class="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                      <div class="ml-2 text-gray-600 dark:text-gray-400">
                        <div>{{ prayer.created_at | date:'fullDate' }}</div>
                        <div class="text-xs">{{ prayer.created_at | date:'mediumTime' }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Description -->
            @if (prayer.description) {
            <div class="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <h6 class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                Prayer Description
              </h6>
              <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                {{ prayer.description }}
              </p>
            </div>
            }
            
            <!-- Denial Reason - Highlighted if present -->
            @if (prayer.denial_reason) {
            <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              <h6 class="text-xs font-semibold text-red-700 dark:text-red-300 uppercase mb-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Denial Reason
              </h6>
              <p class="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap leading-relaxed">
                {{ prayer.denial_reason }}
              </p>
            </div>
            }
            
            <!-- Prayer Updates Section -->
            @if (prayer.prayer_updates && prayer.prayer_updates.length > 0) {
            <div class="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <h6 class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">
                Prayer Updates ({{ prayer.prayer_updates.length }})
              </h6>
              <div class="space-y-3">
                @for (update of prayer.prayer_updates; track update.id; let i = $index) {
                <div [class]="'p-3 rounded border ' + (update.denial_reason ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700')">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Update #{{ prayer.prayer_updates!.length - i }}
                      </span>
                      @if (update.approval_status) {
                      <span [class]="'px-2 py-0.5 text-xs rounded-full capitalize ' + getApprovalStatusColor(update.approval_status)">
                        {{ update.approval_status }}
                      </span>
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500 dark:text-gray-500">
                        {{ update.created_at | date:'shortDate' }}
                      </span>
                      <button
                        (click)="deleteUpdate(prayer.id, update.id, update.content)"
                        [disabled]="deleting"
                        class="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                        title="Delete this update"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-2">
                    {{ update.content }}
                  </p>
                  @if (update.denial_reason) {
                  <div class="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded border-l-2 border-red-500">
                    <div class="flex items-start gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <div>
                        <p class="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                          Denial Reason:
                        </p>
                        <p class="text-xs text-red-600 dark:text-red-400">
                          {{ update.denial_reason }}
                        </p>
                      </div>
                    </div>
                  </div>
                  }
                  <div class="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    <span class="font-medium">By:</span> {{ update.author }}
                  </div>
                </div>
                }
              </div>
            </div>
            }

            <!-- Add Update Section -->
            @if (!editingPrayer) {
            <div class="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              @if (addingUpdate === prayer.id) {
              <div class="space-y-3">
                <div class="flex items-center justify-between mb-2">
                  <h6 class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    Add New Update
                  </h6>
                  <div class="flex gap-2">
                    <button
                      (click)="saveNewUpdate(prayer.id)"
                      [disabled]="!isUpdateFormValid() || savingUpdate"
                      class="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      {{ savingUpdate ? 'Saving...' : 'Save Update' }}
                    </button>
                    <button
                      (click)="cancelAddUpdate()"
                      [disabled]="savingUpdate"
                      class="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                      Cancel
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="newUpdate.firstName"
                      required
                      placeholder="First name"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="newUpdate.lastName"
                      required
                      placeholder="Last name"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Author Email *
                  </label>
                  <input
                    type="email"
                    [(ngModel)]="newUpdate.author_email"
                    required
                    placeholder="email@example.com"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Update Content *
                  </label>
                  <textarea
                    [(ngModel)]="newUpdate.content"
                    required
                    rows="4"
                    placeholder="Enter the update content..."
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
              </div>
              }

              @if (addingUpdate !== prayer.id) {
              <button
                (click)="addingUpdate = prayer.id"
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Update
              </button>
              }
            </div>
            }
          }
        </div>
      </div>
      }
    </div>
    }
  </div>
  }

  <!-- Empty States -->
  @if (!searching && allPrayers.length === 0 && searchTerm && !statusFilter && !approvalFilter) {
  <div class="text-center py-8 text-gray-500 dark:text-gray-400">
    <svg class="mx-auto mb-2 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    <p>No prayers found</p>
    <p class="text-sm mt-1">Try a different search term</p>
  </div>
  }

  @if (!searching && allPrayers.length === 0 && !searchTerm && !statusFilter && !approvalFilter) {
  <div class="text-center py-8 text-gray-500 dark:text-gray-400">
    <svg class="mx-auto mb-2 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
    <p>Search Prayers & Audit Log</p>
    <div class="text-sm mt-2 space-y-1">
      <p>• Select a filter from the dropdowns to automatically load results</p>
      <p>• Or search by title, requester, email, description, or denial reasons</p>
      <p>• Select "Denied" to see all denied prayers and activities</p>
    </div>
  </div>
  }

  <!-- Results Summary -->
  @if (allPrayers.length > 0) {
  <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-600 dark:text-gray-400">
        Found: <span class="font-semibold">{{ totalItems }}</span> prayer(s) | 
        Showing: <span class="font-semibold">{{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalItems) }}</span>
      </span>
      @if (selectedPrayers.size > 0) {
      <span class="text-red-600 dark:text-red-400">
        Selected: <span class="font-semibold">{{ selectedPrayers.size }}</span>
      </span>
      }
    </div>

    <!-- Page Size Selector -->
    <div class="flex items-center gap-2">
      <label for="pageSize" class="text-sm text-gray-600 dark:text-gray-400">Items per page:</label>
      <select
        id="pageSize"
        [(ngModel)]="pageSize"
        (change)="changePageSize()"
        class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
      >
        <option [value]="10">10</option>
        <option [value]="50">50</option>
        <option [value]="100">100</option>
      </select>
    </div>

    <!-- Pagination Controls -->
    @if (totalPages > 1) {
    <div class="flex items-center justify-between">
      <div class="flex gap-2">
        <button
          (click)="previousPage()"
          [disabled]="isFirstPage"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <span class="hidden sm:inline">← Previous</span>
          <span class="sm:hidden">←</span>
        </button>
        <button
          (click)="nextPage()"
          [disabled]="isLastPage"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <span class="hidden sm:inline">Next →</span>
          <span class="sm:hidden">→</span>
        </button>
      </div>
      
      <div class="flex items-center gap-2">
        <span class="text-gray-600 dark:text-gray-400 text-sm">
          Page <span class="font-semibold">{{ currentPage }}</span> of <span class="font-semibold">{{ totalPages }}</span>
        </span>
        
        <div class="flex gap-1">
          @for (page of getPaginationRange(); track $index) {
          <button
            (click)="goToPage(page)"
            [class]="page === currentPage ? 
              'px-3 py-1 bg-red-600 text-white rounded-lg text-sm' :
              'px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm'"
          >
            {{ page }}
          </button>
          }
        </div>
      </div>
    </div>
    }
  </div>
  }

  <!-- Warning Notice -->
  <div class="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    <p class="text-sm text-amber-800 dark:text-amber-200">
      <strong>Warning:</strong> Deleting prayers is permanent and cannot be undone. All associated updates will also be deleted.
    </p>
  </div>
</div>

  <!-- Send Notification Dialog -->
  @if (showSendNotificationDialog) {
    <app-send-notification-dialog
      [notificationType]="sendDialogType"
      [prayerTitle]="sendDialogPrayerTitle"
      (confirm)="onConfirmSendNotification()"
      (decline)="onDeclineSendNotification()"
    ></app-send-notification-dialog>
  }
  `
})
export class PrayerSearchComponent implements OnInit {
  Math = Math;
  searchTerm = '';
  statusFilter = '';
  approvalFilter = '';
  searchResults: Prayer[] = [];
  searching = false;
  deleting = false;
  error: string | null = null;
  selectedPrayers = new Set<string>();
  expandedCards = new Set<string>();
  editingPrayer: string | null = null;
  editForm: EditForm = {
    title: '',
    description: '',
    requester: '',
    email: '',
    prayer_for: '',
    status: ''
  };
  creatingPrayer = false;
  createForm: CreateForm = {
    description: '',
    firstName: '',
    lastName: '',
    email: '',
    prayer_for: '',
    status: 'current',
    is_anonymous: false
  };
  saving = false;
  bulkStatus = '';
  updatingStatus = false;
  addingUpdate: string | null = null;
  newUpdate: NewUpdate = { content: '', firstName: '', lastName: '', author_email: '' };
  savingUpdate = false;
  
  // Dialog state for send notification
  showSendNotificationDialog = false;
  sendDialogType: NotificationType = 'prayer';
  sendDialogPrayerTitle?: string;
  private sendDialogPrayerId?: string;
  
  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  allPrayers: Prayer[] = [];
  displayPrayers: Prayer[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private prayerService: PrayerService,
    private adminDataService: AdminDataService
  ) {}

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  get isLastPage(): boolean {
    return this.currentPage >= this.totalPages;
  }

  ngOnInit(): void {
    // Load initial results with default 10 items
    this.handleSearch();
  }

  async handleSearch(): Promise<void> {
    const hasSearchTerm = this.searchTerm.trim().length > 0;
    const hasStatusFilter = this.statusFilter && this.statusFilter !== 'all';
    const hasApprovalFilter = this.approvalFilter && this.approvalFilter !== 'all';
    const hasAllStatusFilter = this.statusFilter === 'all';
    const hasAllApprovalFilter = this.approvalFilter === 'all';

    try {
      this.searching = true;
      this.error = null;
      this.selectedPrayers = new Set();
      this.cdr.markForCheck();

      const supabaseUrl = this.supabaseService.getSupabaseUrl();
      const supabaseKey = this.supabaseService.getSupabaseKey();

      const params = new URLSearchParams();
      params.set('select', 'id,title,requester,email,status,created_at,denial_reason,description,approval_status,prayer_for,prayer_updates(id,content,author,created_at,denial_reason,approval_status)');
      params.set('order', 'created_at.desc');
      params.set('limit', '100');

      if (this.searchTerm.trim()) {
        params.set('or', `(requester.ilike.%${this.searchTerm}%,email.ilike.%${this.searchTerm}%,title.ilike.%${this.searchTerm}%,description.ilike.%${this.searchTerm}%,denial_reason.ilike.%${this.searchTerm}%)`);
      }

      if (this.statusFilter && this.statusFilter !== 'all') {
        params.set('status', `eq.${this.statusFilter}`);
      }

      if (this.approvalFilter && this.approvalFilter !== 'all' && this.approvalFilter !== 'denied' && this.approvalFilter !== 'pending') {
        params.set('approval_status', `eq.${this.approvalFilter}`);
      }

      const url = `${supabaseUrl}/rest/v1/prayers?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Query failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      let results = data || [];

      if (this.approvalFilter === 'denied') {
        results = results.filter((prayer: Prayer) => {
          if (prayer.denial_reason) return true;
          if (prayer.prayer_updates && prayer.prayer_updates.length > 0) {
            return prayer.prayer_updates.some(update =>
              update.denial_reason !== null &&
              update.denial_reason !== undefined &&
              update.denial_reason !== ''
            );
          }
          return false;
        });
      }

      if (this.approvalFilter === 'pending') {
        results = results.filter((prayer: Prayer) => {
          const isPrayerPending = prayer.approval_status === 'pending' || prayer.approval_status === null || prayer.approval_status === undefined;
          const hasPendingUpdates = prayer.prayer_updates && prayer.prayer_updates.length > 0 &&
            prayer.prayer_updates.some(update =>
              update.approval_status === 'pending' || update.approval_status === null || update.approval_status === undefined
            );
          return isPrayerPending || hasPendingUpdates;
        });
      }

      this.allPrayers = results;
      this.totalItems = results.length;
      this.currentPage = 1;
      this.loadPageData();
      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error('Error searching prayers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to search prayers';
      this.error = errorMessage;
      this.toast.error(errorMessage);
      this.cdr.markForCheck();
    } finally {
      this.searching = false;
      this.cdr.markForCheck();
    }
  }

  loadPageData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayPrayers = this.allPrayers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    this.currentPage = Math.max(1, Math.min(page, Math.ceil(this.totalItems / this.pageSize)));
    this.loadPageData();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPaginationRange(): number[] {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    const maxPages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.loadPageData();
    this.cdr.markForCheck();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.handleSearch();
    }
  }

  onStatusFilterChange(): void {
    if (this.statusFilter === 'all' || this.statusFilter) {
      this.handleSearch();
    }
  }

  onApprovalFilterChange(): void {
    if (this.approvalFilter === 'all' || this.approvalFilter) {
      this.handleSearch();
    }
  }

  toggleSelectPrayer(prayerId: string): void {
    const newSelected = new Set(this.selectedPrayers);
    if (newSelected.has(prayerId)) {
      newSelected.delete(prayerId);
    } else {
      newSelected.add(prayerId);
    }
    this.selectedPrayers = newSelected;
    this.cdr.markForCheck();
  }

  toggleSelectAll(): void {
    if (this.selectedPrayers.size === this.displayPrayers.length) {
      this.selectedPrayers = new Set();
    } else {
      this.selectedPrayers = new Set(this.displayPrayers.map(p => p.id));
    }
    this.cdr.markForCheck();
  }

  toggleExpandCard(id: string): void {
    const newExpanded = new Set(this.expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    this.expandedCards = newExpanded;
  }

  async deletePrayer(prayer: Prayer): Promise<void> {
    if (!confirm(`Are you sure you want to delete the prayer "${prayer.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      this.deleting = true;
      this.error = null;

      const { error: updatesError } = await this.supabaseService.getClient()
        .from('prayer_updates')
        .delete()
        .eq('prayer_id', prayer.id);

      if (updatesError) {
        throw new Error(`Failed to delete prayer updates: ${updatesError.message}`);
      }

      const { error: prayerError } = await this.supabaseService.getClient()
        .from('prayers')
        .delete()
        .eq('id', prayer.id);

      if (prayerError) {
        throw new Error(`Failed to delete prayer: ${prayerError.message}`);
      }

      this.searchResults = this.searchResults.filter(p => p.id !== prayer.id);
      this.allPrayers = this.allPrayers.filter(p => p.id !== prayer.id);
      this.totalItems = this.allPrayers.length;
      this.loadPageData();
      this.selectedPrayers.delete(prayer.id);
      this.prayerService.loadPrayers().catch(err => {
        console.debug('[PrayerSearch] Refresh after delete failed:', err);
      });
      this.toast.success('Prayer deleted successfully');
    } catch (err: unknown) {
      console.error('Error deleting prayer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete prayer';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.deleting = false;
    }
  }

  startEditPrayer(prayer: Prayer): void {
    this.editForm = {
      title: prayer.title,
      description: prayer.description || '',
      requester: prayer.requester,
      email: prayer.email || '',
      prayer_for: prayer.prayer_for || '',
      status: prayer.status
    };
    this.editingPrayer = prayer.id;
    this.expandedCards.add(prayer.id);
  }

  cancelEdit(): void {
    this.editingPrayer = null;
    this.editForm = {
      title: '',
      description: '',
      requester: '',
      email: '',
      prayer_for: '',
      status: ''
    };
  }

  startCreatePrayer(): void {
    this.creatingPrayer = true;
    this.createForm = {
      description: '',
      firstName: '',
      lastName: '',
      email: '',
      prayer_for: '',
      status: 'current',
      is_anonymous: false
    };
    this.error = null;
  }

  cancelCreatePrayer(): void {
    this.creatingPrayer = false;
    this.createForm = {
      description: '',
      firstName: '',
      lastName: '',
      email: '',
      prayer_for: '',
      status: 'current',
      is_anonymous: false
    };
  }

  isCreateFormValid(): boolean {
    return !!(
      this.createForm.firstName.trim() &&
      this.createForm.lastName.trim() &&
      this.createForm.email.trim() &&
      this.createForm.prayer_for.trim() &&
      this.createForm.description.trim()
    );
  }

  async createPrayer(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.isCreateFormValid()) {
      this.error = 'All fields are required';
      this.toast.error(this.error);
      return;
    }

    try {
      this.saving = true;
      this.error = null;

      // Combine first and last name
      const fullName = `${this.createForm.firstName.trim()} ${this.createForm.lastName.trim()}`;

      // Generate title from prayer_for field, matching the pattern used in prayer-form
      const generatedTitle = `Prayer for ${this.createForm.prayer_for.trim()}`;

      const { data, error: insertError } = await this.supabaseService.getClient()
        .from('prayers')
        .insert({
          title: generatedTitle,
          description: this.createForm.description.trim(),
          requester: fullName,
          email: this.createForm.email.trim() || null,
          prayer_for: this.createForm.prayer_for.trim(),
          status: this.createForm.status,
          is_anonymous: this.createForm.is_anonymous,
          approval_status: 'approved'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create prayer: ${insertError.message}`);
      }

      this.searchResults = [data, ...this.searchResults];
      this.allPrayers = [data, ...this.allPrayers];
      this.totalItems = this.allPrayers.length;
      this.currentPage = 1;
      this.loadPageData();
      this.cancelCreatePrayer();
      this.toast.success('Prayer created successfully');
      
      // Show dialog asking if they want to send notification
      this.sendDialogPrayerId = data.id;
      this.sendDialogPrayerTitle = data.title;
      this.sendDialogType = 'prayer';
      this.showSendNotificationDialog = true;
      
      // Trigger reload on main site
      await this.prayerService.loadPrayers();
      
      this.saving = false;
      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error('Error creating prayer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create prayer';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.saving = false;
    }
  }

  async savePrayer(prayerId: string): Promise<void> {
    if (!this.editForm.title.trim() || !this.editForm.description.trim() || !this.editForm.requester.trim()) {
      this.error = 'Title, description, and requester are required';
      this.toast.error(this.error);
      return;
    }

    try {
      this.saving = true;
      this.error = null;

      const { error: updateError } = await this.supabaseService.getClient()
        .from('prayers')
        .update({
          title: this.editForm.title.trim(),
          description: this.editForm.description.trim(),
          requester: this.editForm.requester.trim(),
          email: this.editForm.email.trim() || null,
          prayer_for: this.editForm.prayer_for.trim() || null,
          status: this.editForm.status
        })
        .eq('id', prayerId);

      if (updateError) {
        throw new Error(`Failed to update prayer: ${updateError.message}`);
      }

      this.searchResults = this.searchResults.map(p =>
        p.id === prayerId
          ? {
              ...p,
              title: this.editForm.title.trim(),
              description: this.editForm.description.trim(),
              requester: this.editForm.requester.trim(),
              email: this.editForm.email.trim() || null,
              prayer_for: this.editForm.prayer_for.trim() || undefined,
              status: this.editForm.status
            } as Prayer
          : p
      );
      
      this.allPrayers = this.allPrayers.map(p =>
        p.id === prayerId
          ? {
              ...p,
              title: this.editForm.title.trim(),
              description: this.editForm.description.trim(),
              requester: this.editForm.requester.trim(),
              email: this.editForm.email.trim() || null,
              prayer_for: this.editForm.prayer_for.trim() || undefined,
              status: this.editForm.status
            } as Prayer
          : p
      );
      this.loadPageData();

      this.toast.success('Prayer updated successfully');
      this.cancelEdit();
      
      // Show dialog asking if they want to send notification
      this.sendDialogPrayerId = prayerId;
      this.sendDialogPrayerTitle = this.editForm.title;
      this.sendDialogType = 'prayer';
      this.showSendNotificationDialog = true;
      
      // Trigger reload on main site
      await this.prayerService.loadPrayers();
      
      this.saving = false;
      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error('Error updating prayer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update prayer';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.saving = false;
    }
  }

  async deleteSelected(): Promise<void> {
    if (this.selectedPrayers.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${this.selectedPrayers.size} prayer(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      this.deleting = true;
      this.error = null;

      const prayerIds = Array.from(this.selectedPrayers);

      const { error: updatesError } = await this.supabaseService.getClient()
        .from('prayer_updates')
        .delete()
        .in('prayer_id', prayerIds);

      if (updatesError) {
        throw new Error(`Failed to delete prayer updates: ${updatesError.message}`);
      }

      const { error: prayersError } = await this.supabaseService.getClient()
        .from('prayers')
        .delete()
        .in('id', prayerIds);

      if (prayersError) {
        throw new Error(`Failed to delete prayers: ${prayersError.message}`);
      }

      this.searchResults = this.searchResults.filter(p => !this.selectedPrayers.has(p.id));
      this.allPrayers = this.allPrayers.filter(p => !this.selectedPrayers.has(p.id));
      this.totalItems = this.allPrayers.length;
      this.currentPage = 1;
      this.loadPageData();
      this.selectedPrayers = new Set();
      this.cdr.markForCheck();
      this.prayerService.loadPrayers().catch(err => {
        console.debug('[PrayerSearch] Refresh after bulk delete failed:', err);
      });
      this.toast.success(`${prayerIds.length} prayers deleted successfully`);
    } catch (err: unknown) {
      console.error('Error deleting prayers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete selected prayers';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.deleting = false;
      this.cdr.markForCheck();
    }
  }

  async updateSelectedStatus(): Promise<void> {
    if (this.selectedPrayers.size === 0 || !this.bulkStatus) return;

    const statusLabel = this.bulkStatus === 'current' ? 'Current'
      : this.bulkStatus === 'answered' ? 'Answered'
      : 'Archived';

    if (!confirm(`Are you sure you want to change ${this.selectedPrayers.size} prayer(s) to "${statusLabel}" status?`)) {
      return;
    }

    try {
      this.updatingStatus = true;
      this.error = null;

      const prayerIds = Array.from(this.selectedPrayers);

      const { error: updateError } = await this.supabaseService.getClient()
        .from('prayers')
        .update({ status: this.bulkStatus })
        .in('id', prayerIds);

      if (updateError) {
        throw new Error(`Failed to update prayer statuses: ${updateError.message}`);
      }

      this.allPrayers = this.allPrayers.map(p =>
        this.selectedPrayers.has(p.id) ? { ...p, status: this.bulkStatus } : p
      );
      this.searchResults = this.searchResults.map(p =>
        this.selectedPrayers.has(p.id) ? { ...p, status: this.bulkStatus } : p
      );
      this.loadPageData();

      this.selectedPrayers = new Set();
      this.bulkStatus = '';
      this.cdr.markForCheck();
      this.prayerService.loadPrayers().catch(err => {
        console.debug('[PrayerSearch] Refresh after bulk status update failed:', err);
      });
      this.toast.success(`${prayerIds.length} prayers updated to ${statusLabel}`);
    } catch (err: unknown) {
      console.error('Error updating prayer statuses:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update prayer statuses';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.updatingStatus = false;
      this.cdr.markForCheck();
    }
  }

  async saveNewUpdate(prayerId: string): Promise<void> {
    if (!this.isUpdateFormValid()) {
      this.error = 'All fields are required';
      this.toast.error(this.error);
      return;
    }

    try {
      this.savingUpdate = true;
      this.error = null;

      // Combine first and last name
      const fullName = `${this.newUpdate.firstName.trim()} ${this.newUpdate.lastName.trim()}`;

      const { data, error: insertError } = await this.supabaseService.getClient()
        .from('prayer_updates')
        .insert({
          prayer_id: prayerId,
          content: this.newUpdate.content.trim(),
          author: fullName,
          author_email: this.newUpdate.author_email.trim(),
          approval_status: 'approved'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create update: ${insertError.message}`);
      }

      this.allPrayers = this.allPrayers.map(p => {
        if (p.id === prayerId) {
          return {
            ...p,
            prayer_updates: [...(p.prayer_updates || []), data]
          };
        }
        return p;
      });
      this.loadPageData();

      this.newUpdate = { content: '', firstName: '', lastName: '', author_email: '' };
      this.addingUpdate = null;
      this.toast.success('Update added successfully');
      
      // Trigger reload on main site
      this.prayerService.loadPrayers();
    } catch (err: unknown) {
      console.error('Error saving update:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save update';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.savingUpdate = false;
    }
  }

  cancelAddUpdate(): void {
    this.addingUpdate = null;
    this.newUpdate = { content: '', firstName: '', lastName: '', author_email: '' };
  }

  isUpdateFormValid(): boolean {
    return !!(
      this.newUpdate.firstName.trim() &&
      this.newUpdate.lastName.trim() &&
      this.newUpdate.author_email.trim() &&
      this.newUpdate.content.trim()
    );
  }

  async deleteUpdate(prayerId: string, updateId: string, updateContent: string): Promise<void> {
    const preview = updateContent.substring(0, 50) + (updateContent.length > 50 ? '...' : '');
    if (!confirm(`Are you sure you want to delete this update? "${preview}"\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      this.deleting = true;
      this.error = null;

      const { error: deleteError } = await this.supabaseService.getClient()
        .from('prayer_updates')
        .delete()
        .eq('id', updateId);

      if (deleteError) {
        throw new Error(`Failed to delete update: ${deleteError.message}`);
      }

      this.allPrayers = this.allPrayers.map(p => {
        if (p.id === prayerId && p.prayer_updates) {
          return {
            ...p,
            prayer_updates: p.prayer_updates.filter(u => u.id !== updateId)
          };
        }
        return p;
      });
      this.loadPageData();

      this.toast.success('Update deleted successfully');
      
      // Trigger reload on main site
      this.prayerService.loadPrayers().catch(err => {
        console.debug('[PrayerSearch] Refresh after update delete failed:', err);
      });
    } catch (err: unknown) {
      console.error('Error deleting update:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete update';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.deleting = false;
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.allPrayers = [];
    this.displayPrayers = [];
    this.selectedPrayers = new Set();
    this.error = null;
    this.currentPage = 1;
    this.totalItems = 0;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'current':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'answered':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'archived':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  }

  getApprovalStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'denied':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  }

  async onConfirmSendNotification() {
    try {
      if (this.sendDialogType === 'prayer' && this.sendDialogPrayerId) {
        await this.adminDataService.sendBroadcastNotificationForNewPrayer(this.sendDialogPrayerId);
        this.toast.success('Notification emails sent to subscribers');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      this.toast.error('Failed to send notification emails');
    } finally {
      this.onDeclineSendNotification();
    }
  }

  onDeclineSendNotification() {
    this.showSendNotificationDialog = false;
    this.sendDialogPrayerId = undefined;
    this.sendDialogPrayerTitle = undefined;
    this.cdr.markForCheck();
  }
}
