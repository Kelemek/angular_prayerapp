import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface PrayerFilters {
  searchTerm?: string;
  status?: 'current' | 'answered';
  type?: 'prompt';
}

@Component({
  selector: 'app-prayer-filters',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6 transition-colors">
      <div class="grid grid-cols-1 gap-4">
        <!-- Search -->
        <div>
          <div class="relative">
            <!-- Search Icon -->
            <svg 
              class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 w-4 h-4 pointer-events-none" 
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
              class="pl-10 pr-24 py-2 sm:py-3 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <!-- Clear Search Button (inside input) -->
            @if (filters.searchTerm) {
              <button
                type="button"
                (click)="clearFilters()"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs sm:text-sm whitespace-nowrap"
              >
                <span class="hidden sm:inline">Clear Search</span>
                <span class="sm:hidden">Clear</span>
              </button>
            }
          </div>
        </div>
      </div>
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
