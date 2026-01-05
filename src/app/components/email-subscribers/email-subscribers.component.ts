import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { lookupPersonByEmail, batchLookupPlanningCenter } from '../../../lib/planning-center';
import { environment } from '../../../environments/environment';

interface EmailSubscriber {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_blocked: boolean;
  is_admin?: boolean;
  created_at: string;
  in_planning_center?: boolean | null;
  planning_center_checked_at?: string | null;
}

interface CSVRow {
  name: string;
  email: string;
  valid: boolean;
  error?: string;
}

@Component({
  selector: 'app-email-subscribers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2">
          <svg class="text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Email Subscribers
          </h3>
        </div>
        <button
          (click)="handleSearch()"
          [disabled]="searching"
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh subscribers"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [class.animate-spin]="searching" class="text-gray-600 dark:text-gray-400">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      <div class="flex gap-2 mb-4 justify-end">
        <button
          (click)="toggleCSVUpload()"
          title="Toggle CSV upload"
          class="inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm"
        >
          @if (!showCSVUpload) {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          }
          @if (showCSVUpload) {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          }
          {{ showCSVUpload ? 'Cancel CSV' : 'Upload CSV' }}
        </button>
        <button
          (click)="toggleAddForm()"
          title="Add new subscriber"
          class="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          @if (!showAddForm) {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          }
          @if (showAddForm) {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          }
          {{ showAddForm ? 'Cancel' : 'Add Subscriber' }}
        </button>
      </div>

      <!-- Error Message -->
      @if (error) {
      <div class="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <svg class="text-red-600 dark:text-red-400 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="text-red-800 dark:text-red-200 text-sm">{{ error }}</span>
      </div>
      }

      <!-- Success Message -->
      @if (csvSuccess) {
      <div class="mb-4 flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <svg class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <div class="flex-1">
          <span class="text-green-800 dark:text-green-200 text-sm">{{ csvSuccess }}</span>
          <!-- Planning Center Check Warnings -->
          @if (csvImportWarnings.length > 0) {
          <div class="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
            <p class="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">⚠️ Planning Center Lookup Issues:</p>
            <ul class="space-y-1">
              @for (warning of csvImportWarnings; track warning) {
              <li class="text-xs text-orange-700 dark:text-orange-300">• {{ warning }}</li>
              }
            </ul>
          </div>
          }
        </div>
      </div>
      }

      <!-- CSV Upload Form -->
      @if (showCSVUpload) {
      <div class="mb-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">Upload CSV File</h4>
        
        <div class="mb-4">
          <div class="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <p class="mb-2"><strong>CSV Format:</strong> Name, Email (one per line)</p>
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Example:</p>
            <p class="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
              John Doe,john@example.com<br />
              Jane Smith,jane@example.com
            </p>
          </div>
        </div>

        <!-- Upload Progress Bar -->
        @if (uploadingCSV && csvImportTotal > 0) {
        <div class="mb-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
              Checking Planning Center: {{ csvImportProgress }}/{{ csvImportTotal }}
            </span>
            <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
              {{ Math.round((csvImportProgress / csvImportTotal) * 100) }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              [style.width.%]="(csvImportProgress / csvImportTotal) * 100"
            ></div>
          </div>
        </div>
        }

        <input
          type="file"
          accept=".csv"
          (change)="handleCSVUpload($event)"
          [disabled]="uploadingCSV"
          class="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        @if (csvData.length > 0) {
        <div class="mb-4">
          <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-4">
            Preview ({{ getValidRowsCount() }} valid, {{ getInvalidRowsCount() }} invalid)
          </h5>
          <div class="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th class="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Name</th>
                  <th class="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Email</th>
                  <th class="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (row of csvData; track row.email) {
                <tr [class.bg-red-50]="!row.valid" [class.dark:bg-red-900/20]="!row.valid">
                  <td class="px-3 py-2 text-gray-900 dark:text-gray-100">{{ row.name }}</td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{{ row.email }}</td>
                  <td class="px-3 py-2">
                    @if (row.valid) {
                    <span class="text-green-600 dark:text-green-400 text-xs">✓ Valid</span>
                    }
                    @if (!row.valid) {
                    <span class="text-red-600 dark:text-red-400 text-xs">✗ {{ row.error }}</span>
                    }
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
          <button
            (click)="uploadCSVData()"
            [disabled]="uploadingCSV || getValidRowsCount() === 0"
            class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
          >
            {{ uploadingCSV ? 'Uploading...' : 'Upload ' + getValidRowsCount() + ' Subscribers' }}
          </button>
        </div>
        }
      </div>
      }

      <!-- Add Subscriber Form -->
      @if (showAddForm) {
      <form (ngSubmit)="handleAddSubscriber()" class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              [(ngModel)]="newName"
              name="newName"
              placeholder="John Doe"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              [(ngModel)]="newEmail"
              name="newEmail"
              placeholder="john@example.com"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        <div class="flex gap-2">
          <button
            type="submit"
            [disabled]="submitting"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
          >
            {{ submitting ? 'Adding...' : 'Add Subscriber' }}
          </button>
          <button
            type="button"
            (click)="toggleAddForm()"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
      }

      <!-- Search Form -->
      <div class="mb-4 max-w-full">
        <label for="search" class="sr-only">Search subscribers</label>
        <div class="flex gap-2">
          <input
            id="search"
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="handleSearch()"
            placeholder="Search by email or name..."
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
          />
          <button
            (click)="handleSearch()"
            [disabled]="searching"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-blue-400 text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>

      <!-- Results -->
      @if (searching) {
      <div class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">Searching...</p>
      </div>
      }

      @if (!searching && !hasSearched) {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="mx-auto mb-2 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <p>Click Search to view subscribers</p>
        <p class="text-sm mt-1">Leave search field empty to see all subscribers</p>
      </div>
      }

      @if (!searching && hasSearched && subscribers.length === 0) {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="mx-auto mb-2 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
        <p>No subscribers found</p>
        <p class="text-sm mt-1">Try a different search term</p>
      </div>
      }

      @if (!searching && hasSearched && subscribers.length > 0) {
      <div>
        <div class="space-y-2">
          @for (subscriber of subscribers; track subscriber.id) {
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-medium text-gray-900 dark:text-gray-100">{{ subscriber.name }}</h4>
                @if (subscriber.is_admin) {
                <span class="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full font-semibold">Admin</span>
                }
                @if (subscriber.is_active) {
                <span class="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">Active</span>
                }
                @if (!subscriber.is_active) {
                <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">Inactive</span>
                }
                @if (subscriber.is_blocked) {
                <span class="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full font-semibold">Blocked</span>
                }
                @if (subscriber.in_planning_center === true) {
                <span class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full" title="Verified in Planning Center on {{ subscriber.planning_center_checked_at | date:'short' }}">Planning Center ✓</span>
              }
              @if (subscriber.in_planning_center === false) {
                <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full" title="Not found in Planning Center (checked {{ subscriber.planning_center_checked_at | date:'short' }})">Not in Planning Center</span>
                }
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 truncate">{{ subscriber.email }}</p>
              @if (subscriber.is_admin && !subscriber.is_active) {
              <p class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Opted out of emails but retains admin portal access
              </p>
              }
              @if (!subscriber.is_admin) {
              <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Added {{ subscriber.created_at | date:'short' }}
              </p>
              }
            </div>
            <div class="flex items-center gap-2 ml-4">
              <button
                (click)="handleToggleActive(subscriber.id, subscriber.is_active)"
                [class]="subscriber.is_active ? 
                  'p-2 rounded-lg transition-colors text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' : 
                  'p-2 rounded-lg transition-colors text-gray-400 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'"
                [title]="subscriber.is_active ? 'Stop sending email notifications to this user' : 'Start sending email notifications to this user'"
              >
                @if (subscriber.is_active) {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                }
                @if (!subscriber.is_active) {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                }
              </button>
              <button
                (click)="handleToggleBlocked(subscriber.id, subscriber.is_blocked)"
                [class]="subscriber.is_blocked ? 
                  'p-2 rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' : 
                  'p-2 rounded-lg transition-colors text-gray-400 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'"
                [title]="subscriber.is_blocked ? 'Allow this user to log in to the site' : 'Prevent this user from logging in to the site'"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
              </button>
              <button
                (click)="handleDelete(subscriber.id, subscriber.email)"
                class="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                [title]="subscriber.is_admin ? 'Remove this admin from email list (they keep their admin login access)' : 'Permanently delete this subscriber from the list'"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          }
        </div>

        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">
              Found: <span class="font-semibold">{{ totalItems }}</span> subscriber(s) | 
              Showing: <span class="font-semibold">{{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalItems) }}</span>
            </span>
            <span class="text-gray-600 dark:text-gray-400">
              Active: <span class="font-semibold text-green-600 dark:text-green-400">
                {{ getActiveCount() }}
              </span>
            </span>
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
                ← Previous
              </button>
              <button
                (click)="nextPage()"
                [disabled]="isLastPage"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Next →
              </button>
            </div>
            
            <div class="flex items-center gap-2">
              <span class="text-gray-600 dark:text-gray-400 text-sm">
                Page <span class="font-semibold">{{ currentPage }}</span> of <span class="font-semibold">{{ totalPages }}</span>
              </span>
              
              <div class="flex gap-1">
                @for (page of getPaginationRange(); track page) {
                <button
                  (click)="goToPage(page)"
                  [class]="page === currentPage ? 
                    'px-3 py-1 bg-blue-600 text-white rounded-lg text-sm' :
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
      </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EmailSubscribersComponent implements OnInit {
  subscribers: EmailSubscriber[] = [];
  searchQuery = '';
  searching = false;
  hasSearched = false;
  showAddForm = false;
  showCSVUpload = false;
  csvData: CSVRow[] = [];
  uploadingCSV = false;
  newName = '';
  newEmail = '';
  submitting = false;
  error: string | null = null;
  csvSuccess: string | null = null;
  
  // CSV import progress tracking
  csvImportProgress = 0;
  csvImportTotal = 0;
  csvImportWarnings: string[] = [];

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  allSubscribers: EmailSubscriber[] = [];

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Auto-load first 10 subscribers on component init
    this.handleSearch();
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.showCSVUpload = false;
    this.error = null;
    this.csvSuccess = null;
    this.newName = '';
    this.newEmail = '';
    this.cdr.markForCheck();
  }

  toggleCSVUpload() {
    this.showCSVUpload = !this.showCSVUpload;
    this.showAddForm = false;
    this.error = null;
    this.csvSuccess = null;
    this.csvData = [];
    this.cdr.markForCheck();
  }

  async handleSearch() {
    try {
      this.searching = true;
      this.error = null;
      this.csvSuccess = null;
      this.currentPage = 1; // Reset to first page on new search
      this.cdr.markForCheck();

      // Build query without caching
      let query = this.supabase.client
        .from('email_subscribers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (this.searchQuery.trim()) {
        query = query.or(`email.ilike.%${this.searchQuery}%,name.ilike.%${this.searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching subscribers:', error);
        throw error;
      }

      this.allSubscribers = data || [];
      this.totalItems = count || 0;
      this.hasSearched = true;
      this.loadPageData();
      console.log('Loaded subscribers:', this.allSubscribers.length);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to fetch subscribers';
      this.subscribers = [];
      this.totalItems = 0;
      this.cdr.markForCheck();
    } finally {
      this.searching = false;
    }
  }

  loadPageData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.subscribers = this.allSubscribers.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  goToPage(page: number) {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.loadPageData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  changePageSize() {
    this.currentPage = 1;
    this.loadPageData();
    this.cdr.markForCheck();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage < totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  get isLastPage(): boolean {
    return this.currentPage === this.totalPages;
  }

  getPaginationRange(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const totalPages = this.totalPages;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than or equal to max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages with ellipsis
      const half = Math.floor(maxPagesToShow / 2);
      let start = Math.max(1, this.currentPage - half);
      let end = Math.min(totalPages, start + maxPagesToShow - 1);
      
      if (end - start + 1 < maxPagesToShow) {
        start = Math.max(1, end - maxPagesToShow + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  readonly Math = Math;

  async handleAddSubscriber() {
    if (!this.newName.trim() || !this.newEmail.trim()) {
      this.error = 'Name and email are required';
      this.cdr.markForCheck();
      return;
    }

    try {
      this.submitting = true;
      this.error = null;
      this.csvSuccess = null;
      this.cdr.markForCheck();

      const { data: existing } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('email', this.newEmail.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        this.error = 'This email address is already subscribed';
        this.submitting = false;
        this.cdr.markForCheck();
        return;
      }

      // Check Planning Center status
      let inPlanningCenter: boolean | null = null;
      let planningCenterCheckedAt: string | null = null;
      
      try {
        const pcResult = await lookupPersonByEmail(
          this.newEmail.toLowerCase().trim(),
          environment.supabaseUrl,
          environment.supabaseAnonKey
        );
        inPlanningCenter = pcResult.count > 0;
        planningCenterCheckedAt = new Date().toISOString();
        console.log(`[Email Subscribers] Planning Center check for ${this.newEmail}: ${inPlanningCenter}`);
      } catch (pcError) {
        console.error('[Email Subscribers] Planning Center check failed:', pcError);
        // Continue with null values if check fails
      }

      const { error } = await this.supabase.client
        .from('email_subscribers')
        .insert({
          name: this.newName.trim(),
          email: this.newEmail.toLowerCase().trim(),
          is_active: true,
          is_admin: false,
          receive_admin_emails: false,
          in_planning_center: inPlanningCenter,
          planning_center_checked_at: planningCenterCheckedAt
        });

      if (error) throw error;

      this.csvSuccess = 'Subscriber added successfully!';
      this.newName = '';
      this.newEmail = '';
      this.showAddForm = false;
      await this.handleSearch();
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error adding subscriber:', err);
      this.error = err.message || 'Failed to add subscriber';
      this.cdr.markForCheck();
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  async handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const { error } = await this.supabase.client
        .from('email_subscribers')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      this.toast.success(currentStatus ? 'Subscriber deactivated' : 'Subscriber activated');
      await this.handleSearch();
    } catch (err: any) {
      console.error('Error toggling subscriber status:', err);
      this.toast.error('Failed to update subscriber status');
    }
  }

  async handleToggleBlocked(id: string, currentStatus: boolean) {
    try {
      const { error } = await this.supabase.client
        .from('email_subscribers')
        .update({ is_blocked: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      this.toast.success(currentStatus ? 'User unblocked - login enabled' : 'User blocked - login disabled');
      await this.handleSearch();
    } catch (err: any) {
      console.error('Error toggling user blocked status:', err);
      this.toast.error('Failed to update user blocked status');
    }
  }

  async handleDelete(id: string, email: string) {
    if (!confirm(`Are you sure you want to remove ${email} from the subscriber list?`)) {
      return;
    }

    try {
      // Check if this subscriber is an admin
      const { data: subscriber, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('is_admin')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If the subscriber is an admin, deactivate instead of deleting
      if (subscriber?.is_admin) {
        const { error: updateError } = await this.supabase.client
          .from('email_subscribers')
          .update({ is_active: false })
          .eq('id', id);

        if (updateError) throw updateError;

        this.csvSuccess = `Admin ${email} has been unsubscribed from emails but retains admin access to the portal.`;
      } else {
        // For non-admin subscribers, we can safely delete the record
        const { error } = await this.supabase.client
          .from('email_subscribers')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        this.toast.success('Subscriber removed');
      }

      await this.handleSearch();
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error removing subscriber:', err);
      this.error = err.message || 'Failed to remove subscriber';
      this.cdr.markForCheck();
    }
  }

  handleCSVUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(line => line.trim()).filter(line => line);
        
        const parsed: CSVRow[] = rows.map(row => {
          const [name, email] = row.split(',').map(s => s.trim());
          
          if (!name || !email) {
            return { name: name || '', email: email || '', valid: false, error: 'Missing name or email' };
          }
          
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return { name, email, valid: false, error: 'Invalid email format' };
          }
          
          return { name, email, valid: true };
        });
        
        this.csvData = parsed;
        this.error = null;
        this.cdr.markForCheck();
      } catch (err: any) {
        console.error('Error parsing CSV:', err);
        this.error = 'Failed to parse CSV file';
        this.cdr.markForCheck();
      }
    };
    
    reader.readAsText(file);
  }

  getValidRowsCount(): number {
    return this.csvData.filter(r => r.valid).length;
  }

  getInvalidRowsCount(): number {
    return this.csvData.filter(r => !r.valid).length;
  }

  getActiveCount(): number {
    return this.subscribers.filter(s => s.is_active).length;
  }

  async uploadCSVData() {
    const validRows = this.csvData.filter(r => r.valid);
    
    if (validRows.length === 0) {
      this.error = 'No valid rows to upload';
      this.cdr.markForCheck();
      return;
    }

    try {
      this.uploadingCSV = true;
      this.error = null;
      this.csvSuccess = null;
      this.csvImportWarnings = [];
      this.csvImportProgress = 0;
      this.csvImportTotal = validRows.length;
      this.cdr.markForCheck();

      // Check for existing emails
      const emails = validRows.map(r => r.email.toLowerCase());
      const { data: existing } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .in('email', emails);

      const existingEmails = new Set((existing || []).map((e: any) => e.email));
      const newRows = validRows.filter(r => !existingEmails.has(r.email.toLowerCase()));

      if (newRows.length === 0) {
        this.error = 'All email addresses are already subscribed';
        this.uploadingCSV = false;
        this.cdr.markForCheck();
        return;
      }

      // Batch Planning Center lookups with progress tracking
      console.log(`[CSV Import] Starting batched Planning Center lookups for ${newRows.length} new subscribers...`);
      const newEmails = newRows.map(r => r.email.toLowerCase());
      
      const batchResults = await batchLookupPlanningCenter(
        newEmails,
        environment.supabaseUrl,
        environment.supabaseAnonKey,
        {
          concurrency: 5, // Max 5 concurrent requests at a time
          maxRetries: 3,
          retryDelayMs: 500,
          onProgress: (completed, total) => {
            this.csvImportProgress = completed;
            this.csvImportTotal = total;
            this.cdr.markForCheck();
          }
        }
      );

      // Create lookup map for easy access
      const resultMap = new Map(batchResults.map(r => [r.email, r]));

      // Track failures and warnings
      let failedLookups = 0;
      const subscribersToInsert = newRows.map((r) => {
        const result = resultMap.get(r.email.toLowerCase());
        let inPlanningCenter: boolean | null = null;
        let planningCenterCheckedAt: string | null = null;

        if (result) {
          if (result.failed) {
            failedLookups++;
            const warning = `Planning Center check failed for ${r.email} (retried ${result.retries} times)`;
            this.csvImportWarnings.push(warning);
            console.warn(`[CSV Import] ${warning}`);
          } else {
            inPlanningCenter = result.result.count > 0;
            planningCenterCheckedAt = new Date().toISOString();
            console.log(`[CSV Import] Planning Center check for ${r.email}: ${inPlanningCenter}`);
          }
        }

        return {
          name: r.name,
          email: r.email.toLowerCase(),
          is_active: true,
          is_admin: false,
          receive_admin_emails: false,
          in_planning_center: inPlanningCenter,
          planning_center_checked_at: planningCenterCheckedAt
        };
      });

      // Insert all subscribers
      const { error } = await this.supabase.client
        .from('email_subscribers')
        .insert(subscribersToInsert);

      if (error) throw error;

      const skipped = validRows.length - newRows.length;
      let successMessage = `Successfully added ${newRows.length} subscriber(s)`;
      
      if (skipped > 0) {
        successMessage += `. Skipped ${skipped} duplicate(s)`;
      }
      
      if (failedLookups > 0) {
        successMessage += `. ⚠️ Planning Center checks failed for ${failedLookups} email(s) (see details below)`;
      } else {
        successMessage += '!';
      }

      this.csvSuccess = successMessage;
      this.csvData = [];
      this.showCSVUpload = false;

      await this.handleSearch();
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error uploading CSV:', err);
      this.error = err.message || 'An error occurred';
      this.cdr.markForCheck();
    } finally {
      this.uploadingCSV = false;
      this.csvImportProgress = 0;
      this.csvImportTotal = 0;
      this.cdr.markForCheck();
    }
  }
}
