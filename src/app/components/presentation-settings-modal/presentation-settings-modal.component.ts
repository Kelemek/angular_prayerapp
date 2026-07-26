import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  PresentationTimeFilter,
  SelectablePresentationContentType,
  includesPresentationContentType,
  showsPrayerTimeStatusFilters,
} from "../../types/presentation";

type ThemeOption = "light" | "dark" | "system";

@Component({
  selector: "app-presentation-settings-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible) {
    <div
      class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 safe-area-overlay"
    >
      <div
        id="tour-presentation-settings-modal"
        class="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl max-w-md sm:max-w-lg w-full shadow-xl max-h-[90dvh] sm:max-h-[85dvh] flex flex-col overflow-hidden"
      >
        <div
          class="flex shrink-0 items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <h2
            class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100"
          >
            Presentation Settings
          </h2>
          <button
            (click)="closeModal()"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
          >
            <svg
              class="w-6 h-6 sm:w-7 sm:h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div
          class="presentation-settings-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4"
          (mousedown)="onSettingsBodyPointerDown($event)"
        >
          <!-- Theme -->
          <div
            id="tour-presentation-setting-theme"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4"
          >
            <div class="flex items-start gap-2 sm:gap-3">
              <div class="flex-1">
                <div
                  class="font-medium text-gray-800 dark:text-gray-100 mb-3 text-sm sm:text-base"
                >
                  Theme Preference
                </div>
                <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    (click)="themeChange.emit('light')"
                    class="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20':
                        theme === 'light',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600':
                        theme !== 'light'
                    }"
                  >
                    <svg
                      width="18"
                      height="18"
                      class="text-amber-600 sm:w-5 sm:h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                    <span
                      class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100"
                      >Light</span
                    >
                  </button>
                  <button
                    (click)="themeChange.emit('dark')"
                    class="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20':
                        theme === 'dark',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600':
                        theme !== 'dark'
                    }"
                  >
                    <svg
                      width="18"
                      height="18"
                      class="text-blue-600 dark:text-blue-400 sm:w-5 sm:h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                      ></path>
                    </svg>
                    <span
                      class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100"
                      >Dark</span
                    >
                  </button>
                  <button
                    (click)="themeChange.emit('system')"
                    class="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20':
                        theme === 'system',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600':
                        theme !== 'system'
                    }"
                  >
                    <svg
                      width="18"
                      height="18"
                      class="text-gray-600 dark:text-gray-400 sm:w-5 sm:h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect
                        x="2"
                        y="3"
                        width="20"
                        height="14"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                    </svg>
                    <span
                      class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100"
                      >System</span
                    >
                  </button>
                </div>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Choose your preferred color theme or use your system settings
                </p>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 space-y-4"
          >
            <div>
              <div class="font-medium text-gray-800 dark:text-gray-100 text-sm sm:text-base">
                Filters
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Choose what to show and narrow which items appear in this session
              </p>
            </div>

            <div id="tour-presentation-setting-content-type">
              <label
                class="block text-sm sm:text-base mb-2 text-gray-900 dark:text-gray-100"
                >Content type</label
              >
            <div class="relative">
              <div class="flex">
                <div
                  class="flex-1 flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-l-lg text-base sm:text-lg border border-r-0 border-gray-300 dark:border-gray-600"
                >
                  <span>{{ getContentTypeDisplay() }}</span>
                </div>
                <button
                  type="button"
                  data-settings-dropdown-trigger="content-type"
                  (click)="toggleContentTypeDropdown()"
                  class="flex items-center justify-center px-2.5 sm:px-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-r-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <svg
                    class="w-5 h-5 sm:w-6 sm:h-6 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    [class.rotate-180]="showContentTypeDropdown"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              @if (showContentTypeDropdown) {
              <div
                class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[70]"
                data-settings-dropdown-panel="content-type"
              >
                  @for (option of contentTypeOptions; track option.value) {
                  @if (!option.requiresMappedList || hasMappedList) {
                  <div
                    (mousedown)="
                      togglePendingContentType(option.value);
                      $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{{ option.label }}</span>
                    @if (isPendingContentTypeSelected(option.value)) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
                  }
                  }
                  <div
                    (mousedown)="
                      selectAllPendingContentTypes(); $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer border-t border-gray-200 dark:border-gray-700"
                  >
                    <span>All Content Types</span>
                    @if (isAllPendingContentTypesSelected()) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
              </div>
              }
            </div>
            </div>

            @if (
              includesPresentationContentType(localContentTypes, 'personal') &&
              availableCategories.length > 0
            ) {
            <div id="tour-presentation-setting-categories">
              <label
                class="block text-sm sm:text-base mb-2 text-gray-900 dark:text-gray-100"
                >Personal categories</label
              >
            <div class="relative">
              <div class="flex">
                <div
                  class="flex-1 flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-l-lg text-base sm:text-lg border border-r-0 border-gray-300 dark:border-gray-600"
                >
                  <span>{{ getCategoriesDisplay() }}</span>
                </div>
                <button
                  type="button"
                  data-settings-dropdown-trigger="categories"
                  (click)="toggleCategoriesDropdown()"
                  class="flex items-center justify-center px-2.5 sm:px-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-r-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <svg
                    class="w-5 h-5 sm:w-6 sm:h-6 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    [class.rotate-180]="showCategoriesDropdown"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              @if (showCategoriesDropdown) {
              <div
                class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[70]"
                data-settings-dropdown-panel="categories"
              >
                  @for (category of availableCategories; track category) {
                  <div
                    (mousedown)="
                      togglePendingCategory(category); $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{{ category }}</span>
                    @if (isPendingCategorySelected(category)) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
                  }
                  <div
                    (mousedown)="
                      selectAllPendingCategories(); $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer border-t border-gray-200 dark:border-gray-700"
                  >
                    <span>All Categories</span>
                    @if (isAllPendingCategoriesSelected()) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
              </div>
              }
            </div>
            </div>
            }

            @if (
              includesPresentationContentType(localContentTypes, 'prompts') &&
              availablePromptCategories.length > 0
            ) {
            <div id="tour-presentation-setting-prompt-categories">
              <label
                class="block text-sm sm:text-base mb-2 text-gray-900 dark:text-gray-100"
                >Prompt categories</label
              >
            <div class="relative">
              <div class="flex">
                <div
                  class="flex-1 flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-l-lg text-base sm:text-lg border border-r-0 border-gray-300 dark:border-gray-600"
                >
                  <span>{{ getPromptCategoriesDisplay() }}</span>
                </div>
                <button
                  type="button"
                  data-settings-dropdown-trigger="prompt-categories"
                  (click)="togglePromptCategoriesDropdown()"
                  class="flex items-center justify-center px-2.5 sm:px-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-r-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <svg
                    class="w-5 h-5 sm:w-6 sm:h-6 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    [class.rotate-180]="showPromptCategoriesDropdown"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              @if (showPromptCategoriesDropdown) {
              <div
                class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[70]"
                data-settings-dropdown-panel="prompt-categories"
              >
                  @for (category of availablePromptCategories; track category) {
                  <div
                    (mousedown)="
                      togglePendingPromptCategory(category); $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{{ category }}</span>
                    @if (isPendingPromptCategorySelected(category)) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
                  }
                  <div
                    (mousedown)="
                      selectAllPendingPromptCategories(); $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer border-t border-gray-200 dark:border-gray-700"
                  >
                    <span>All Categories</span>
                    @if (isAllPendingPromptCategoriesSelected()) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
              </div>
              }
            </div>
            </div>
            }

            @if (showsPrayerTimeStatusFilters(localContentTypes)) {
            <div id="tour-presentation-setting-status">
              <label
                class="block text-sm sm:text-base mb-2 text-gray-900 dark:text-gray-100"
                >Prayer status</label
              >
            <div class="relative">
              <div class="flex">
                <div
                  class="flex-1 flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-l-lg text-base sm:text-lg border border-r-0 border-gray-300 dark:border-gray-600"
                >
                  <span>{{ getStatusFilterDisplay() }}</span>
                </div>
                <button
                  type="button"
                  data-settings-dropdown-trigger="status"
                  (click)="toggleStatusDropdown()"
                  class="flex items-center justify-center px-2.5 sm:px-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-r-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <svg
                    class="w-5 h-5 sm:w-6 sm:h-6 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    [class.rotate-180]="showStatusDropdown"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              @if (showStatusDropdown) {
              <div
                class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[70]"
                data-settings-dropdown-panel="status"
              >
                  @for (status of statusFilterOptions; track status) {
                  <div
                    (mousedown)="
                      togglePendingStatus(status); $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between capitalize cursor-pointer"
                  >
                    <span>{{ status }}</span>
                    @if (isPendingStatusSelected(status)) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
                  }
                  <div
                    (mousedown)="
                      selectAllPendingStatus(); $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer border-t border-gray-200 dark:border-gray-700"
                  >
                    <span>All Statuses</span>
                    @if (isAllPendingStatusSelected()) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
              </div>
              }
            </div>
            </div>

            <div id="tour-presentation-setting-time-filter">
              <label
                class="block text-sm sm:text-base mb-2 text-gray-900 dark:text-gray-100"
                >Time period</label
              >
            <div class="relative">
              <div class="flex">
                <div
                  class="flex-1 flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-l-lg text-base sm:text-lg border border-r-0 border-gray-300 dark:border-gray-600"
                >
                  <span>{{ getTimeFilterDisplay() }}</span>
                </div>
                <button
                  type="button"
                  data-settings-dropdown-trigger="time-filter"
                  (click)="toggleTimeFilterDropdown()"
                  class="flex items-center justify-center px-2.5 sm:px-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-r-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <svg
                    class="w-5 h-5 sm:w-6 sm:h-6 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    [class.rotate-180]="showTimeFilterDropdown"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              @if (showTimeFilterDropdown) {
              <div
                class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[70]"
                data-settings-dropdown-panel="time-filter"
              >
                  @for (option of timeFilterOptions; track option.value) {
                  <div
                    (mousedown)="
                      selectTimeFilter(option.value); $event.preventDefault()
                    "
                    class="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{{ option.label }}</span>
                    @if (localTimeFilter === option.value) {
                    <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </div>
                  }
                </div>
              }
            </div>
            </div>
            }

            <div id="tour-presentation-setting-randomize">
              <label class="flex items-center justify-between cursor-pointer">
                <span
                  class="text-sm sm:text-base text-gray-900 dark:text-gray-100"
                  >Randomize order</span
                >
                <div class="relative">
                  <input
                    type="checkbox"
                    [(ngModel)]="localRandomize"
                    (ngModelChange)="randomizeChange.emit($event)"
                    class="sr-only peer"
                  />
                  <div
                    class="w-14 h-8 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </div>
              </label>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                Shuffle the display order randomly
              </p>
            </div>
          </div>

          <!-- Display & Timing -->
          <div
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4"
          >
            <div class="font-medium text-gray-800 dark:text-gray-100 mb-3 text-sm sm:text-base">
              Display &amp; Timing
            </div>

            <div id="tour-presentation-setting-smart">
              <label class="flex items-center justify-between cursor-pointer">
                <span
                  class="text-sm sm:text-base text-gray-900 dark:text-gray-100"
                >
                  Smart mode
                </span>
                <div class="relative">
                  <input
                    type="checkbox"
                    [(ngModel)]="localSmartMode"
                    (ngModelChange)="smartModeChange.emit($event)"
                    class="sr-only peer"
                  />
                  <div
                    class="w-14 h-8 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </div>
              </label>
            </div>

            @if (!localSmartMode) {
            <div id="tour-presentation-setting-duration" class="mt-4">
              <label
                class="block text-sm sm:text-base mb-2 text-gray-900 dark:text-gray-100"
                >Auto-advance interval (seconds)</label
              >
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              [(ngModel)]="localDisplayDuration"
              (ngModelChange)="displayDurationChange.emit($event)"
              [style.--value-percent]="
                ((localDisplayDuration - 5) / 55) * 100 + '%'
              "
              style="--fill-color: #2F5F54"
              class="presentation-range w-full h-2.5 sm:h-3 bg-gray-300 dark:bg-gray-700 rounded-lg cursor-pointer accent-[#2F5F54]"
            />
            <div
              class="text-center text-xl sm:text-2xl mt-2 font-semibold text-gray-900 dark:text-gray-100"
            >
              {{ localDisplayDuration }}s
            </div>

            <!-- Quick Duration Buttons -->
            <div class="flex gap-2 sm:gap-3 mt-3 sm:mt-4">
              <button
                (click)="setDuration(10)"
                class="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-base sm:text-lg transition-colors cursor-pointer"
              >
                10s
              </button>
              <button
                (click)="setDuration(20)"
                class="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-base sm:text-lg transition-colors cursor-pointer"
              >
                20s
              </button>
              <button
                (click)="setDuration(30)"
                class="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-base sm:text-lg transition-colors cursor-pointer"
              >
                30s
              </button>
            </div>
            </div>
            }

            @if (localSmartMode) {
            <div
              id="tour-presentation-setting-smart-info"
              class="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4"
            >
              <p class="text-sm text-gray-800 dark:text-gray-100 mb-2">
                Smart mode automatically adjusts display time based on prayer
                length, giving you more time to read longer prayers and updates.
              </p>
              <button
                (click)="showSmartModeDetails = !showSmartModeDetails"
                class="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center gap-1 cursor-pointer"
              >
                {{ showSmartModeDetails ? "− Hide details" : "+ Show details" }}
              </button>
              @if (showSmartModeDetails) {
              <div
                class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 text-sm text-gray-700 dark:text-gray-300 space-y-2"
              >
                <p><strong>How it works:</strong></p>
                <ul class="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Counts characters in prayer description and up to 3 recent
                    updates
                  </li>
                  <li>Reading pace: ~120 characters per 10 seconds</li>
                  <li>Minimum time: 10 seconds per prayer</li>
                  <li>Maximum time: 120 seconds (2 minutes) per prayer</li>
                </ul>
                <p class="text-xs italic mt-2">
                  Example: A prayer with 240 characters will display for about 20
                  seconds
                </p>
              </div>
              }
            </div>
            }

            <div id="tour-presentation-setting-loop" class="mt-4">
              <label class="flex items-center justify-between cursor-pointer">
                <span
                  class="text-sm sm:text-base text-gray-900 dark:text-gray-100"
                >
                  Loop
                </span>
                <div class="relative">
                  <input
                    type="checkbox"
                    [(ngModel)]="localLoop"
                    (ngModelChange)="loopChange.emit($event)"
                    class="sr-only peer"
                  />
                  <div
                    class="w-14 h-8 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </div>
              </label>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                When off, playback runs through the list once and stops
              </p>
            </div>
          </div>

          <!-- Prayer Timer -->
          <div
            id="tour-presentation-setting-timer"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4"
          >
            <div class="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div class="flex-1">
                <div
                  class="font-medium text-gray-800 dark:text-gray-100 mb-1 sm:mb-2 text-sm sm:text-base"
                >
                  Prayer timer
                </div>
                <p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  Set a dedicated time for focused prayer
                </p>
              </div>
            </div>

            <label
              class="block text-sm sm:text-base mb-2 text-gray-900 dark:text-gray-100"
              >Duration (minutes)</label
            >
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              [(ngModel)]="localPrayerTimerMinutes"
              (ngModelChange)="prayerTimerMinutesChange.emit($event)"
              [style.--value-percent]="
                ((localPrayerTimerMinutes - 1) / 59) * 100 + '%'
              "
              style="--fill-color: #2F5F54"
              class="presentation-range w-full h-2.5 sm:h-3 bg-gray-300 dark:bg-gray-700 rounded-lg cursor-pointer accent-[#2F5F54]"
            />
            <div
              class="text-center text-xl sm:text-2xl mt-2 font-semibold text-gray-900 dark:text-gray-100"
            >
              {{ localPrayerTimerMinutes }} min
            </div>

            <button
              (click)="startPrayerTimer.emit()"
              class="w-full mt-3 sm:mt-4 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#2F5F54] hover:bg-[#1a3a2e] text-white rounded-lg text-base sm:text-lg font-semibold transition-colors cursor-pointer"
            >
              Start Prayer Timer
            </button>
          </div>
        </div>
      </div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: contents;
      }
      :host .presentation-settings-scroll {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        touch-action: pan-y;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      :host .presentation-settings-scroll::-webkit-scrollbar {
        display: none;
      }
      :host .presentation-range {
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
      }
      :host .presentation-range::-webkit-slider-runnable-track {
        width: 100%;
        height: 12px;
        background: linear-gradient(
          to right,
          var(--fill-color, #2f5f54) 0%,
          var(--fill-color, #2f5f54) var(--value-percent, 0%),
          #d1d5db var(--value-percent, 0%),
          #d1d5db 100%
        );
        border-radius: 0.5rem;
      }
      :host .presentation-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 32px !important;
        height: 32px !important;
        min-width: 32px;
        min-height: 32px;
        border-radius: 50%;
        background: #2f5f54;
        cursor: pointer;
        margin-top: -10px;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      :host .presentation-range::-moz-range-track {
        width: 100%;
        height: 12px;
        background: linear-gradient(
          to right,
          var(--fill-color, #2f5f54) 0%,
          var(--fill-color, #2f5f54) var(--value-percent, 0%),
          #d1d5db var(--value-percent, 0%),
          #d1d5db 100%
        );
        border-radius: 0.5rem;
      }
      :host .presentation-range::-moz-range-thumb {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px;
        min-height: 32px;
        border-radius: 50%;
        background: #2f5f54;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
    `,
  ],
})
export class PresentationSettingsModalComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() theme: ThemeOption = "system";
  @Input() smartMode = true;
  @Input() displayDuration = 10;
  @Input() contentTypes: SelectablePresentationContentType[] = ["prayers"];
  @Input() randomize = false;
  @Input() loop = true;
  @Input() timeFilter: PresentationTimeFilter = "all";
  @Input() statusFiltersCurrent = true;
  @Input() statusFiltersAnswered = true;
  @Input() prayerTimerMinutes = 10;
  @Input() availableCategories: string[] = [];
  @Input() selectedCategories: string[] = [];
  @Input() availablePromptCategories: string[] = [];
  @Input() selectedPromptCategories: string[] = [];
  @Input() hasMappedList = false;

  @Output() close = new EventEmitter<void>();
  @Output() themeChange = new EventEmitter<ThemeOption>();
  @Output() smartModeChange = new EventEmitter<boolean>();
  @Output() displayDurationChange = new EventEmitter<number>();
  @Output() contentTypesChange = new EventEmitter<
    SelectablePresentationContentType[]
  >();
  @Output() randomizeChange = new EventEmitter<boolean>();
  @Output() loopChange = new EventEmitter<boolean>();
  @Output() timeFilterChange = new EventEmitter<PresentationTimeFilter>();
  @Output() statusFiltersChange = new EventEmitter<{
    current: boolean;
    answered: boolean;
  }>();
  @Output() prayerTimerMinutesChange = new EventEmitter<number>();
  @Output() startPrayerTimer = new EventEmitter<void>();
  @Output() categoriesChange = new EventEmitter<string[]>();
  @Output() promptCategoriesChange = new EventEmitter<string[]>();

  // Local state for two-way binding
  localSmartMode = true;
  localDisplayDuration = 10;
  localContentTypes: SelectablePresentationContentType[] = ["prayers"];
  localRandomize = false;
  localLoop = true;
  localTimeFilter: PresentationTimeFilter = "all";
  localPrayerTimerMinutes = 10;
  localSelectedCategories: string[] = [];
  localSelectedPromptCategories: string[] = [];

  showSmartModeDetails = false;
  showContentTypeDropdown = false;
  showTimeFilterDropdown = false;
  showStatusDropdown = false;
  showCategoriesDropdown = false;
  showPromptCategoriesDropdown = false;
  pendingContentTypes: SelectablePresentationContentType[] = [];
  pendingStatusFilter: string[] = [];
  pendingCategories: string[] = [];
  pendingPromptCategories: string[] = [];

  readonly contentTypeOptions: {
    value: SelectablePresentationContentType;
    label: string;
    requiresMappedList?: boolean;
  }[] = [
    { value: "prayers", label: "Prayers" },
    { value: "prompts", label: "Prompts" },
    { value: "personal", label: "Personal" },
    { value: "members", label: "Members", requiresMappedList: true },
  ];

  readonly statusFilterOptions = ["current", "answered", "archived"] as const;

  readonly timeFilterOptions: {
    value: PresentationTimeFilter;
    label: string;
  }[] = [
    { value: "week", label: "Last Week" },
    { value: "twoweeks", label: "Last 2 Weeks" },
    { value: "month", label: "Last Month" },
    { value: "year", label: "Last Year" },
    { value: "all", label: "All Time" },
  ];

  ngOnInit() {
    this.syncLocalState();
    this.initPendingStatusFilter();
    this.initPendingContentTypes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["visible"]?.previousValue === true && !this.visible) {
      this.applyOpenDropdowns();
      this.resetDropdownState();
      return;
    }

    if (changes["visible"]?.currentValue === true) {
      this.syncLocalState();
      this.initPendingStatusFilter();
      this.initPendingContentTypes();
      this.resetDropdownState();
    }
  }

  syncLocalState() {
    this.localSmartMode = this.smartMode;
    this.localDisplayDuration = this.displayDuration;
    this.localContentTypes = [...this.contentTypes];
    this.localRandomize = this.randomize;
    this.localLoop = this.loop;
    this.localTimeFilter = this.timeFilter;
    this.localPrayerTimerMinutes = this.prayerTimerMinutes;
    this.localSelectedCategories = [...this.selectedCategories];
    this.localSelectedPromptCategories = [...this.selectedPromptCategories];
  }

  initPendingContentTypes() {
    if (this.localContentTypes.length === 0) {
      this.pendingContentTypes = this.getAvailableContentTypes();
      return;
    }
    this.pendingContentTypes = [...this.localContentTypes];
  }

  initPendingStatusFilter() {
    if (!this.statusFiltersCurrent && !this.statusFiltersAnswered) {
      this.pendingStatusFilter = [...this.getAvailableStatusFilters()];
      return;
    }
    const filters: string[] = [];
    if (this.statusFiltersCurrent) filters.push("current");
    if (this.statusFiltersAnswered) filters.push("answered");
    this.pendingStatusFilter = filters;
  }

  setDuration(seconds: number) {
    this.localDisplayDuration = seconds;
    this.displayDurationChange.emit(seconds);
  }

  toggleContentTypeDropdown() {
    if (this.showContentTypeDropdown) {
      this.applyContentTypeFilter();
    } else {
      this.closeOtherDropdowns("contentType");
      this.initPendingContentTypes();
      this.showContentTypeDropdown = true;
    }
  }

  togglePendingContentType(type: SelectablePresentationContentType) {
    const index = this.pendingContentTypes.indexOf(type);
    if (index > -1) {
      if (this.pendingContentTypes.length === 1) {
        return;
      }
      this.pendingContentTypes = this.pendingContentTypes.filter(
        (value) => value !== type
      );
    } else {
      this.pendingContentTypes = [...this.pendingContentTypes, type];
    }
  }

  selectAllPendingContentTypes() {
    this.pendingContentTypes = this.getAvailableContentTypes();
  }

  isAllPendingContentTypesSelected(): boolean {
    const available = this.getAvailableContentTypes();
    return (
      available.length > 0 &&
      available.every((type) => this.pendingContentTypes.includes(type))
    );
  }

  isPendingContentTypeSelected(
    type: SelectablePresentationContentType
  ): boolean {
    return this.pendingContentTypes.includes(type);
  }

  applyContentTypeFilter() {
    const applied = this.resolveAppliedContentTypes();
    if (applied === null) {
      this.initPendingContentTypes();
      this.showContentTypeDropdown = false;
      return;
    }
    if (this.contentTypesEqual(this.localContentTypes, applied)) {
      this.showContentTypeDropdown = false;
      return;
    }
    this.localContentTypes = [...applied];
    this.contentTypesChange.emit([...this.localContentTypes]);
    this.showContentTypeDropdown = false;
  }

  private getAvailableContentTypes(): SelectablePresentationContentType[] {
    return this.contentTypeOptions
      .filter((option) => !option.requiresMappedList || this.hasMappedList)
      .map((option) => option.value);
  }

  private resolveAppliedContentTypes():
    | SelectablePresentationContentType[]
    | null {
    if (this.pendingContentTypes.length === 0) {
      return null;
    }
    if (this.isAllPendingContentTypesSelected()) {
      return [];
    }
    return [...this.pendingContentTypes];
  }

  private contentTypesEqual(
    current: SelectablePresentationContentType[],
    applied: SelectablePresentationContentType[]
  ): boolean {
    const normalizedCurrent = this.normalizeContentTypesForCompare(current);
    const normalizedApplied = this.normalizeContentTypesForCompare(applied);
    if (normalizedCurrent.length !== normalizedApplied.length) {
      return false;
    }
    return normalizedCurrent.every(
      (value, index) => value === normalizedApplied[index]
    );
  }

  private normalizeContentTypesForCompare(
    types: SelectablePresentationContentType[]
  ): SelectablePresentationContentType[] {
    const available = this.getAvailableContentTypes();
    const effective = types.length === 0 ? available : types;
    return [...effective].sort();
  }

  getContentTypeDisplay(): string {
    if (this.localContentTypes.length === 0) {
      return "All Content Types";
    }

    const labels = this.localContentTypes.map((type) => {
      const option = this.contentTypeOptions.find(
        (entry) => entry.value === type
      );
      return option?.label ?? type;
    });

    return labels.join(", ");
  }

  showsPrayerTimeStatusFilters = showsPrayerTimeStatusFilters;
  includesPresentationContentType = includesPresentationContentType;

  initPendingCategories() {
    if (this.localSelectedCategories.length === 0) {
      this.pendingCategories = [...this.availableCategories];
      return;
    }
    this.pendingCategories = [...this.localSelectedCategories];
  }

  toggleCategoriesDropdown() {
    if (this.showCategoriesDropdown) {
      this.applyCategoryFilter();
    } else {
      this.closeOtherDropdowns("categories");
      this.initPendingCategories();
      this.showCategoriesDropdown = true;
    }
  }

  togglePendingCategory(category: string) {
    const index = this.pendingCategories.indexOf(category);
    if (index > -1) {
      if (this.pendingCategories.length === 1) {
        return;
      }
      this.pendingCategories = this.pendingCategories.filter(
        (value) => value !== category
      );
    } else {
      this.pendingCategories = [...this.pendingCategories, category];
    }
  }

  selectAllPendingCategories() {
    this.pendingCategories = [...this.availableCategories];
  }

  isAllPendingCategoriesSelected(): boolean {
    return (
      this.availableCategories.length > 0 &&
      this.availableCategories.every((category) =>
        this.pendingCategories.includes(category)
      )
    );
  }

  isPendingCategorySelected(category: string): boolean {
    return this.pendingCategories.includes(category);
  }

  applyCategoryFilter() {
    const applied = this.isAllPendingCategoriesSelected()
      ? []
      : [...this.pendingCategories];
    if (applied.length === 0 && !this.isAllPendingCategoriesSelected()) {
      this.initPendingCategories();
      this.showCategoriesDropdown = false;
      return;
    }
    if (this.categoriesEqual(this.localSelectedCategories, applied)) {
      this.showCategoriesDropdown = false;
      return;
    }
    this.localSelectedCategories = [...applied];
    this.categoriesChange.emit([...this.localSelectedCategories]);
    this.showCategoriesDropdown = false;
  }

  getCategoriesDisplay(): string {
    if (this.localSelectedCategories.length === 0) {
      return "All Categories";
    }
    return this.localSelectedCategories.join(", ");
  }

  initPendingPromptCategories() {
    if (this.localSelectedPromptCategories.length === 0) {
      this.pendingPromptCategories = [...this.availablePromptCategories];
      return;
    }
    this.pendingPromptCategories = [...this.localSelectedPromptCategories];
  }

  togglePromptCategoriesDropdown() {
    if (this.showPromptCategoriesDropdown) {
      this.applyPromptCategoryFilter();
    } else {
      this.closeOtherDropdowns("promptCategories");
      this.initPendingPromptCategories();
      this.showPromptCategoriesDropdown = true;
    }
  }

  togglePendingPromptCategory(category: string) {
    const index = this.pendingPromptCategories.indexOf(category);
    if (index > -1) {
      if (this.pendingPromptCategories.length === 1) {
        return;
      }
      this.pendingPromptCategories = this.pendingPromptCategories.filter(
        (value) => value !== category
      );
    } else {
      this.pendingPromptCategories = [...this.pendingPromptCategories, category];
    }
  }

  selectAllPendingPromptCategories() {
    this.pendingPromptCategories = [...this.availablePromptCategories];
  }

  isAllPendingPromptCategoriesSelected(): boolean {
    return (
      this.availablePromptCategories.length > 0 &&
      this.availablePromptCategories.every((category) =>
        this.pendingPromptCategories.includes(category)
      )
    );
  }

  isPendingPromptCategorySelected(category: string): boolean {
    return this.pendingPromptCategories.includes(category);
  }

  applyPromptCategoryFilter() {
    const applied = this.isAllPendingPromptCategoriesSelected()
      ? []
      : [...this.pendingPromptCategories];
    if (applied.length === 0 && !this.isAllPendingPromptCategoriesSelected()) {
      this.initPendingPromptCategories();
      this.showPromptCategoriesDropdown = false;
      return;
    }
    if (this.promptCategoriesEqual(this.localSelectedPromptCategories, applied)) {
      this.showPromptCategoriesDropdown = false;
      return;
    }
    this.localSelectedPromptCategories = [...applied];
    this.promptCategoriesChange.emit([...this.localSelectedPromptCategories]);
    this.showPromptCategoriesDropdown = false;
  }

  getPromptCategoriesDisplay(): string {
    if (this.localSelectedPromptCategories.length === 0) {
      return "All Categories";
    }
    return this.localSelectedPromptCategories.join(", ");
  }

  private promptCategoriesEqual(current: string[], applied: string[]): boolean {
    const normalizedCurrent = this.normalizePromptCategoriesForCompare(current);
    const normalizedApplied = this.normalizePromptCategoriesForCompare(applied);
    if (normalizedCurrent.length !== normalizedApplied.length) {
      return false;
    }
    return normalizedCurrent.every((category, index) => {
      return category === normalizedApplied[index];
    });
  }

  private normalizePromptCategoriesForCompare(categories: string[]): string[] {
    const normalized =
      categories.length === 0
        ? [...this.availablePromptCategories]
        : categories;
    return [...normalized].sort();
  }

  private categoriesEqual(current: string[], applied: string[]): boolean {
    const normalizedCurrent = this.normalizeCategoriesForCompare(current);
    const normalizedApplied = this.normalizeCategoriesForCompare(applied);
    if (normalizedCurrent.length !== normalizedApplied.length) {
      return false;
    }
    return normalizedCurrent.every(
      (value, index) => value === normalizedApplied[index]
    );
  }

  private normalizeCategoriesForCompare(categories: string[]): string[] {
    const effective =
      categories.length === 0 ? [...this.availableCategories] : categories;
    return [...effective].sort();
  }

  toggleTimeFilterDropdown() {
    if (this.showTimeFilterDropdown) {
      this.showTimeFilterDropdown = false;
    } else {
      this.closeOtherDropdowns("timeFilter");
      this.showTimeFilterDropdown = true;
    }
  }

  closeTimeFilterDropdown() {
    this.showTimeFilterDropdown = false;
  }

  selectTimeFilter(value: PresentationTimeFilter) {
    this.localTimeFilter = value;
    this.timeFilterChange.emit(value);
    this.showTimeFilterDropdown = false;
  }

  getTimeFilterDisplay(): string {
    const option = this.timeFilterOptions.find(
      (o) => o.value === this.localTimeFilter
    );
    return option?.label ?? "All Time";
  }

  private closeOtherDropdowns(
    except: "contentType" | "timeFilter" | "status" | "categories" | "promptCategories"
  ) {
    if (except !== "contentType") {
      if (this.showContentTypeDropdown) {
        this.applyContentTypeFilter();
      } else {
        this.showContentTypeDropdown = false;
      }
    }
    if (except !== "categories") {
      if (this.showCategoriesDropdown) {
        this.applyCategoryFilter();
      } else {
        this.showCategoriesDropdown = false;
      }
    }
    if (except !== "promptCategories") {
      if (this.showPromptCategoriesDropdown) {
        this.applyPromptCategoryFilter();
      } else {
        this.showPromptCategoriesDropdown = false;
      }
    }
    if (except !== "timeFilter") {
      this.showTimeFilterDropdown = false;
    }
    if (except !== "status") {
      if (this.showStatusDropdown) {
        this.applyStatusFilter();
      }
      this.showStatusDropdown = false;
    }
  }

  toggleStatusDropdown() {
    if (this.showStatusDropdown) {
      this.applyStatusFilter();
      this.showStatusDropdown = false;
    } else {
      this.closeOtherDropdowns("status");
      this.initPendingStatusFilter();
      this.showStatusDropdown = true;
    }
  }

  togglePendingStatus(status: string) {
    const index = this.pendingStatusFilter.indexOf(status);
    if (index > -1) {
      if (this.pendingStatusFilter.length === 1) {
        return;
      }
      this.pendingStatusFilter = this.pendingStatusFilter.filter(
        (s) => s !== status
      );
    } else {
      this.pendingStatusFilter = [...this.pendingStatusFilter, status];
    }
  }

  selectAllPendingStatus() {
    this.pendingStatusFilter = [...this.getAvailableStatusFilters()];
  }

  isAllPendingStatusSelected(): boolean {
    const available = this.getAvailableStatusFilters();
    return (
      available.length > 0 &&
      available.every((status) => this.pendingStatusFilter.includes(status))
    );
  }

  private getAvailableStatusFilters(): string[] {
    return [...this.statusFilterOptions];
  }

  private resolveAppliedStatusFilters(): {
    current: boolean;
    answered: boolean;
  } {
    if (this.isAllPendingStatusSelected()) {
      return { current: false, answered: false };
    }
    return {
      current: this.pendingStatusFilter.includes("current"),
      answered: this.pendingStatusFilter.includes("answered"),
    };
  }

  isPendingStatusSelected(status: string): boolean {
    return this.pendingStatusFilter.includes(status);
  }

  applyStatusFilter() {
    const { current, answered } = this.resolveAppliedStatusFilters();
    if (
      current === this.statusFiltersCurrent &&
      answered === this.statusFiltersAnswered
    ) {
      this.showStatusDropdown = false;
      return;
    }
    this.statusFiltersChange.emit({ current, answered });
    this.showStatusDropdown = false;
  }

  getStatusFilterDisplay(): string {
    const filters: string[] = [];
    if (this.statusFiltersCurrent) filters.push("Current");
    if (this.statusFiltersAnswered) filters.push("Answered");

    if (filters.length === 0) return "All Statuses";
    return filters.join(", ");
  }

  closeModal(): void {
    this.applyOpenDropdowns();
    this.resetDropdownState();
    this.close.emit();
  }

  onSettingsBodyPointerDown(event: MouseEvent): void {
    if (!this.hasOpenDropdown()) {
      return;
    }
    const target = event.target as Element;
    if (target.closest("[data-settings-dropdown-panel]")) {
      return;
    }
    if (target.closest("[data-settings-dropdown-trigger]")) {
      return;
    }
    this.applyOpenDropdowns();
    this.resetDropdownState();
  }

  private hasOpenDropdown(): boolean {
    return (
      this.showContentTypeDropdown ||
      this.showCategoriesDropdown ||
      this.showPromptCategoriesDropdown ||
      this.showStatusDropdown ||
      this.showTimeFilterDropdown
    );
  }

  private applyOpenDropdowns(): void {
    if (this.showContentTypeDropdown) {
      this.applyContentTypeFilter();
    }
    if (this.showCategoriesDropdown) {
      this.applyCategoryFilter();
    }
    if (this.showPromptCategoriesDropdown) {
      this.applyPromptCategoryFilter();
    }
    if (this.showStatusDropdown) {
      this.applyStatusFilter();
    }
    this.showTimeFilterDropdown = false;
  }

  private resetDropdownState(): void {
    this.showContentTypeDropdown = false;
    this.showCategoriesDropdown = false;
    this.showPromptCategoriesDropdown = false;
    this.showStatusDropdown = false;
    this.showTimeFilterDropdown = false;
  }
}
