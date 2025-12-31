import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PrayerFilters {
  searchTerm?: string;
  status?: 'current' | 'answered';
  type?: 'prompt';
}

@Component({
  selector: 'app-prayer-filters',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6 transition-colors">
      <div class="grid grid-cols-1 gap-4">
        <!-- Search -->
        <div>
          <div class="relative">
            <!-- Search Icon -->
            <svg 
              class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search prayers..."
              [(ngModel)]="filters.searchTerm"
              (ngModelChange)="onSearchChange($event)"
              class="pl-10 pr-3 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Clear Filters -->
      @if (filters.searchTerm) {
        <div class="pt-2 pb-2 pl-3 border-t border-gray-200 dark:border-gray-600">
          <button
            (click)="clearFilters()"
            class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Clear search
          </button>
        </div>
      }
    </div>
  `
})
export class PrayerFiltersComponent {
  @Input() filters: PrayerFilters = {};
  @Output() filtersChange = new EventEmitter<PrayerFilters>();

  onSearchChange(searchTerm: string) {
    const newFilters = { 
      ...this.filters, 
      searchTerm: searchTerm || undefined 
    };
    this.filtersChange.emit(newFilters);
  }

  clearFilters() {
    this.filters = {};
    this.filtersChange.emit({});
  }
}
