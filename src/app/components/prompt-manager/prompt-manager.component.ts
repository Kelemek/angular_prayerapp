import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import type { PrayerPrompt, PrayerTypeRecord } from '../../types/prayer';

interface CSVRow {
  title: string;
  type: string;
  description: string;
  valid: boolean;
  error?: string;
}

@Component({
  selector: 'app-prompt-manager',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <!-- Header -->
      <div class="flex flex-col gap-3 mb-4">
        <div class="flex items-center gap-2">
          <svg class="text-yellow-600 dark:text-yellow-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
            <path d="M9 18h6"></path>
            <path d="M10 22h4"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Prayer Prompts
          </h3>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            (click)="toggleCSVUpload()"
            title="Upload prompts from CSV"
            class="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload CSV
          </button>
          <button
            (click)="toggleAddForm()"
            title="Add new prayer prompt"
            class="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Prompt
          </button>
        </div>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Search for prayer prompts by title, type, or description, or upload a CSV file to add multiple prompts.
      </p>

      <!-- Error Message -->
      @if (error) {
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
        <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
      </div>
      }

      <!-- Success Message -->
      @if (success) {
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
        <p class="text-sm text-green-800 dark:text-green-200">{{ success }}</p>
      </div>
      }

      <!-- Search Bar -->
      <form (submit)="handleSearch($event)" class="mb-4">
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="searchQuery"
              placeholder="Search prompts by title, type, or description..."
              class="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            [disabled]="searching"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </form>

      <!-- CSV Upload Section -->
      @if (showCSVUpload) {
      <div class="mb-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100">Bulk Upload via CSV</h4>
          <button
            (click)="toggleCSVUpload()"
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="mb-3">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
            <div class="flex items-start gap-2">
              <svg class="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div class="text-sm text-blue-800 dark:text-blue-200">
                <p class="font-semibold mb-1">CSV Format Requirements:</p>
                <p class="mb-2">Your CSV file must have these columns: <strong>title</strong>, <strong>type</strong>, <strong>description</strong></p>
                <p><strong>Valid Types:</strong> {{ getValidTypeNames() }}</p>
              </div>
            </div>
          </div>
        </div>

        <input
          type="file"
          accept=".csv"
          (change)="handleCSVUpload($event)"
          class="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
        />

        <!-- CSV Preview -->
        @if (csvData.length > 0) {
        <div class="mb-4 mt-4">
          <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preview - {{ getValidRowCount() }} valid, {{ getInvalidRowCount() }} invalid
          </h5>
          <div class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-auto max-h-64">
            <table class="w-full text-sm">
              <thead class="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th class="p-2 text-left text-gray-700 dark:text-gray-300">Title</th>
                  <th class="p-2 text-left text-gray-700 dark:text-gray-300">Type</th>
                  <th class="p-2 text-left text-gray-700 dark:text-gray-300">Description</th>
                  <th class="p-2 text-left text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (row of csvData; track $index) {
                <tr [class]="'border-t border-gray-200 dark:border-gray-700 ' + (!row.valid ? 'bg-red-50 dark:bg-red-900/10' : '')">
                  <td class="p-2 text-gray-900 dark:text-gray-100">{{ row.title }}</td>
                  <td class="p-2 text-gray-900 dark:text-gray-100">{{ row.type }}</td>
                  <td class="p-2 text-gray-900 dark:text-gray-100 truncate max-w-xs">{{ row.description }}</td>
                  <td class="p-2">
                    @if (row.valid) {
                    <span class="text-green-600 dark:text-green-400 text-xs">✓ Valid</span>
                    }
                    @if (!row.valid) {
                    <span class="text-red-600 dark:text-red-400 text-xs">{{ row.error }}</span>
                    }
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="mt-3 flex gap-2">
            <button
              (click)="uploadCSVData()"
              [disabled]="uploadingCSV || getValidRowCount() === 0"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors text-sm"
            >
              {{ uploadingCSV ? 'Uploading...' : 'Upload ' + getValidRowCount() + ' Prompt(s)' }}
            </button>
            <button
              (click)="csvData = []"
              class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Clear
            </button>
          </div>
        </div>
        }
      </div>
      }

      <!-- Add/Edit Form -->
      @if (showAddForm) {
      <form (submit)="handleSubmit($event)" class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100">
            {{ editingId ? 'Edit Prayer Prompt' : 'Add New Prayer Prompt' }}
          </h4>
          <button
            type="button"
            (click)="cancelEdit()"
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="grid gap-3">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              [(ngModel)]="title"
              name="title"
              placeholder="e.g., Pray for those in need"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label for="type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <div class="relative">
              <select
                id="type"
                [(ngModel)]="type"
                name="type"
                class="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
              >
                @if (prayerTypes.length === 0) {
                <option value="">Loading types...</option>
                }
                @for (t of prayerTypes; track t.id) {
                <option [value]="t.name">{{ t.name }}</option>
                }
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              [(ngModel)]="description"
              name="description"
              placeholder="Write a prayer or meditation prompt..."
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            ></textarea>
          </div>
        </div>
        <div class="flex gap-2 mt-3">
          <button
            type="submit"
            [disabled]="submitting"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
          >
            {{ submitting ? 'Saving...' : (editingId ? 'Update Prompt' : 'Add Prompt') }}
          </button>
          <button
            type="button"
            (click)="cancelEdit()"
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
      }

      <!-- Search Results -->
      @if (searching) {
      <div class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-600 dark:text-gray-400 mt-2">Searching...</p>
      </div>
      }

      @if (!searching && !hasSearched) {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="mx-auto mb-2 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <p>Enter a search term to find prompts</p>
        <p class="text-sm mt-1">Search results will appear here</p>
      </div>
      }

      @if (!searching && hasSearched && prompts.length === 0) {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">>
        <svg class="mx-auto mb-2 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
          <path d="M9 18h6"></path>
          <path d="M10 22h4"></path>
        </svg>
        <p>No prayer prompts found</p>
        <p class="text-sm mt-1">Try a different search term</p>
      </div>
      }

      @if (!searching && hasSearched && prompts.length > 0) {
      <div>
        <div class="space-y-3">
          @for (prompt of prompts; track prompt.id) {
          <div class="block">
            <!-- Edit Form (inline) -->
            @if (editingId === prompt.id) {
            <form (submit)="handleSubmit($event)" class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-blue-300 dark:border-blue-600">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100">
                  Edit Prayer Prompt
                </h4>
                <button
                  type="button"
                  (click)="cancelEdit()"
                  class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div class="grid gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="title"
                    name="editTitle"
                    placeholder="e.g., Pray for those in need"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type *
                  </label>
                  <div class="relative">
                    <select
                      [(ngModel)]="type"
                      name="editType"
                      class="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                    >
                      @for (t of prayerTypes; track t.id) {
                      <option [value]="t.name">{{ t.name }}</option>
                      }
                    </select>
                    <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    [(ngModel)]="description"
                    name="editDescription"
                    placeholder="Write a prayer or meditation prompt..."
                    rows="4"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  ></textarea>
                </div>
              </div>
              <div class="flex gap-2 mt-3">
                <button
                  type="submit"
                  [disabled]="submitting"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
                >
                  {{ submitting ? 'Saving...' : 'Update Prompt' }}
                </button>
                <button
                  type="button"
                  (click)="cancelEdit()"
                  class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
            }

            <!-- Regular Prompt Card -->
            @if (editingId !== prompt.id) {
            <div class="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-medium text-gray-900 dark:text-gray-100">
                    {{ prompt.title }}
                  </h4>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                    {{ prompt.type }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {{ prompt.description }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Added {{ formatDate(prompt.created_at) }}
                </p>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <button
                  (click)="handleEdit(prompt)"
                  class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Edit"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  (click)="handleDelete(prompt.id, prompt.title)"
                  class="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            }
          </div>
          }
        </div>

        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">
              Found: <span class="font-semibold">{{ prompts.length }}</span> prompt(s)
            </span>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: []
})
export class PromptManagerComponent implements OnInit {
  @Output() onSave = new EventEmitter<void>();

  prompts: PrayerPrompt[] = [];
  prayerTypes: PrayerTypeRecord[] = [];
  searchQuery = '';
  searching = false;
  hasSearched = false;
  showAddForm = false;
  showCSVUpload = false;
  error: string | null = null;
  success: string | null = null;
  csvData: CSVRow[] = [];
  uploadingCSV = false;

  // Form state
  editingId: string | null = null;
  title = '';
  type = '';
  description = '';
  submitting = false;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchPrayerTypes();
  }

  async fetchPrayerTypes() {
    try {
      const { data, error } = await this.supabase.directQuery<PrayerTypeRecord>(
        'prayer_types',
        {
          select: '*',
          eq: { is_active: true },
          order: { column: 'display_order', ascending: true },
          timeout: 15000
        }
      );

      if (error) throw error;
      this.prayerTypes = Array.isArray(data) ? data : (data ? [data] : []);
      // Set default type to first active type
      if (this.prayerTypes.length > 0 && !this.type) {
        this.type = this.prayerTypes[0].name;
      }
    } catch (err: unknown) {
      console.error('Error fetching prayer types:', err);
    }
  }

  async handleSearch(event: Event) {
    event.preventDefault();

    try {
      this.searching = true;
      this.cdr.markForCheck();
      this.error = null;
      this.success = null;
      this.hasSearched = true;

      const query = this.searchQuery.trim().toLowerCase();

      // Get all prompts and filter client-side since directQuery doesn't support ilike
      const { data, error } = await this.supabase.directQuery<PrayerPrompt>(
        'prayer_prompts',
        {
          select: '*',
          order: { column: 'type', ascending: true },
          limit: 500,
          timeout: 15000
        }
      );

      if (error) throw error;
      
      let prompts = Array.isArray(data) ? data : (data ? [data] : []);
      
      // Client-side filtering if query provided
      if (query) {
        prompts = prompts.filter(p => 
          p.title.toLowerCase().includes(query) ||
          p.type.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        );
      }
      
      this.prompts = prompts;
    } catch (err: unknown) {
      console.error('Error searching prompts:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = `Failed to search prompts: ${message}`;
    } finally {
      this.searching = false;
      this.cdr.markForCheck();
    }
  }

  toggleCSVUpload() {
    this.showCSVUpload = !this.showCSVUpload;
    this.showAddForm = false;
    this.error = null;
    this.success = null;
    this.csvData = [];
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.showCSVUpload = false;
    this.editingId = null;
    this.title = '';
    this.description = '';
    this.type = this.prayerTypes.length > 0 ? this.prayerTypes[0].name : '';
    this.error = null;
    this.success = null;
  }

  handleCSVUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          this.error = 'CSV file must have at least a header row and one data row';
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const titleIdx = headers.indexOf('title');
        const typeIdx = headers.indexOf('type');
        const descIdx = headers.indexOf('description');

        if (titleIdx === -1 || typeIdx === -1 || descIdx === -1) {
          this.error = 'CSV must have columns: title, type, description';
          return;
        }

        const validTypes = this.prayerTypes.map(t => t.name);
        const rows: CSVRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const title = values[titleIdx] || '';
          const type = values[typeIdx] || '';
          const description = values[descIdx] || '';

          let valid = true;
          let error = '';

          if (!title) {
            valid = false;
            error = 'Missing title';
          } else if (!type) {
            valid = false;
            error = 'Missing type';
          } else if (!validTypes.includes(type)) {
            valid = false;
            error = `Invalid type: ${type}`;
          } else if (!description) {
            valid = false;
            error = 'Missing description';
          }

          rows.push({ title, type, description, valid, error });
        }

        this.csvData = rows;
        this.error = null;
      } catch (err) {
        console.error('Error parsing CSV:', err);
        this.error = 'Failed to parse CSV file';
      }
    };

    reader.readAsText(file);
  }

  async uploadCSVData() {
    const validRows = this.csvData.filter(r => r.valid);
    if (validRows.length === 0) return;

    try {
      this.uploadingCSV = true;
      this.error = null;

      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .insert(validRows.map(r => ({
          title: r.title.trim(),
          type: r.type,
          description: r.description.trim()
        })));

      if (error) throw error;

      this.success = `Successfully uploaded ${validRows.length} prompt(s)!`;
      this.csvData = [];
      this.showCSVUpload = false;

      // Refresh search results if user has already searched
      if (this.hasSearched) {
        await this.handleSearch(new Event('submit'));
      }

      this.onSave.emit();
    } catch (err: unknown) {
      console.error('Error uploading CSV:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = `Failed to upload CSV: ${message}`;
    } finally {
      this.uploadingCSV = false;
    }
  }

  async handleSubmit(event: Event) {
    event.preventDefault();

    if (!this.title.trim() || !this.type || !this.description.trim()) {
      this.error = 'All fields are required';
      return;
    }

    try {
      this.submitting = true;
      this.error = null;
      this.success = null;

      if (this.editingId) {
        // Update existing prompt
        const { error } = await this.supabase.client
          .from('prayer_prompts')
          .update({
            title: this.title.trim(),
            type: this.type,
            description: this.description.trim()
          })
          .eq('id', this.editingId);

        if (error) throw error;
        this.success = 'Prayer prompt updated successfully!';
      } else {
        // Add new prompt
        const { error } = await this.supabase.client
          .from('prayer_prompts')
          .insert({
            title: this.title.trim(),
            type: this.type,
            description: this.description.trim()
          });

        if (error) throw error;
        this.success = 'Prayer prompt added successfully!';
      }

      // Reset form
      this.title = '';
      this.description = '';
      this.type = this.prayerTypes.length > 0 ? this.prayerTypes[0].name : '';
      this.editingId = null;
      this.showAddForm = false;

      // Refresh search results if user has already searched
      if (this.hasSearched) {
        await this.handleSearch(new Event('submit'));
      }

      this.onSave.emit();
    } catch (err: unknown) {
      console.error('Error saving prompt:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = `Failed to save prayer prompt: ${message}`;
    } finally {
      this.submitting = false;
    }
  }

  handleEdit(prompt: PrayerPrompt) {
    this.title = prompt.title;
    this.type = prompt.type;
    this.description = prompt.description;
    this.editingId = prompt.id;
    this.showAddForm = false;
    this.showCSVUpload = false;
    this.error = null;
    this.success = null;
  }

  async handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      this.error = null;
      this.success = null;

      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.success = 'Prayer prompt deleted successfully!';

      // Refresh search results if user has already searched
      if (this.hasSearched) {
        await this.handleSearch(new Event('submit'));
      }

      this.onSave.emit();
    } catch (err: unknown) {
      console.error('Error deleting prompt:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = `Failed to delete prompt: ${message}`;
    }
  }

  cancelEdit() {
    this.showAddForm = false;
    this.editingId = null;
    this.title = '';
    this.description = '';
    this.type = this.prayerTypes.length > 0 ? this.prayerTypes[0].name : '';
    this.error = null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getValidTypeNames(): string {
    return this.prayerTypes.map(t => t.name).join(', ') || 'Loading...';
  }

  getValidRowCount(): number {
    return this.csvData.filter(r => r.valid).length;
  }

  getInvalidRowCount(): number {
    return this.csvData.filter(r => !r.valid).length;
  }
}
