import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HelpContentService } from '../../services/help-content.service';
import { HelpSection } from '../../types/help-content';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <!-- Modal Backdrop -->
      <div class="fixed inset-0 bg-gray-900/50 z-40" (click)="onClose()" aria-hidden="true"></div>

      <!-- Modal Container -->
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto">
          <!-- Header (Sticky) -->
          <div class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6 rounded-t-lg z-10">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 id="help-modal-title" class="text-2xl font-bold not-dark:text-gray-900 dark:text-white">Help & Guidance</h2>
                <p class="text-sm text-gray-600 dark:text-gray-200 mt-1">Learn how to use the Prayer App</p>
              </div>
              <button
                (click)="onClose()"
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 transition-colors"
                title="Close help"
                aria-label="Close help modal"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Search Input -->
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (input)="onSearchChange()"
                placeholder="Search help topics..."
                class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <!-- Content Area (Scrollable) -->
          <div class="overflow-y-auto flex-1 p-4 sm:p-6" #contentArea>
            <!-- Loading State -->
            @if (isLoading$ | async) {
              <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            }

            <!-- Error State -->
            @if (error$ | async; as error) {
              @if (error && error !== 'Using default help content.') {
                <div class="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
                  <p class="text-sm text-yellow-800 dark:text-yellow-200">{{ error }}</p>
                </div>
              }
            }

            <!-- Help Sections (Accordion) -->
            @if (helpSections$ | async; as sections) {
              @if ((filteredSections$ | async); as filteredSections) {
                @if (filteredSections.length > 0) {
                  <div class="space-y-3">
                    @for (section of filteredSections; track section.id) {
                      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                        <!-- Section Header (Clickable) -->
                        <button
                          (click)="toggleSection(section.id)"
                          class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-start justify-between focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left"
                          [attr.aria-expanded]="isSectionExpanded(section.id)"
                          [attr.aria-controls]="'section-content-' + section.id"
                        >
                          <div class="flex items-start gap-3 flex-1">
                            <div class="text-lg mt-1 flex-shrink-0 w-6 h-6" [innerHTML]="getSafeIcon(section.icon)"></div>
                            <div>
                              <h3 class="font-semibold not-dark:text-gray-900 dark:text-white">{{ section.title }}</h3>
                              <p class="text-sm text-gray-600 dark:text-gray-200">{{ section.description }}</p>
                            </div>
                          </div>
                          <!-- Chevron Icon -->
                          <svg
                            class="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 ml-2 mt-1 transition-transform duration-200"
                            [class.rotate-180]="isSectionExpanded(section.id)"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                          </svg>
                        </button>

                        <!-- Section Content (Expanded) -->
                        @if (isSectionExpanded(section.id)) {
                          <div [id]="'section-content-' + section.id" class="px-4 sm:px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                            <div class="space-y-4">
                              @for (content of section.content; track $index) {
                                <div>
                                  <h4 class="font-medium not-dark:text-gray-900 dark:text-white">{{ content.subtitle }}</h4>
                                  <p class="text-sm text-gray-700 dark:text-gray-200 mt-1">{{ content.text }}</p>

                                  <!-- Examples -->
                                  @if (content.examples && content.examples.length > 0) {
                                    <div class="mt-2 pl-3 border-l-2 border-blue-400 dark:border-blue-500">
                                      @for (example of content.examples; track $index) {
                                        <p class="text-xs text-gray-600 dark:text-gray-500 italic">{{ example }}</p>
                                      }
                                    </div>
                                  }
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                      <svg class="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                      <p class="text-gray-600 dark:text-gray-400">No help topics match your search.</p>
                      <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">Try searching with different keywords.</p>
                    </div>
                  </div>
                }
              }
            }
          </div>

          <!-- Footer (Sticky) -->
          <div class="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 rounded-b-lg">
            <button
              (click)="onClose()"
              class="w-full px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
            >
              Close Help
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class HelpModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @ViewChild('contentArea') contentArea!: ElementRef;

  helpSections$!: Observable<HelpSection[]>;
  filteredSections$!: Observable<HelpSection[]>;
  isLoading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  expandedSection: string | null = null;
  searchQuery = '';

  private searchQuerySubject = new BehaviorSubject<string>('');

  constructor(private helpContentService: HelpContentService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.helpSections$ = this.helpContentService.getSections();
    this.isLoading$ = this.helpContentService.isLoading$;
    this.error$ = this.helpContentService.error$;

    // Initialize filtered sections with search query
    this.filteredSections$ = this.searchQuerySubject.asObservable().pipe(
      map((query) => {
        // This will be updated when helpSections$ is combined
        return [];
      })
    );

    // Combine helpSections$ and search query for filtering
    this.filteredSections$ = this.helpContentService.getSections().pipe(
      map((sections) => this.filterSections(sections, this.searchQuery))
    );

    // Update filtered sections when search query changes
    this.searchQuerySubject.subscribe((query) => {
      this.filteredSections$ = this.helpContentService.getSections().pipe(
        map((sections) => this.filterSections(sections, query))
      );
    });
  }

  onSearchChange(): void {
    this.searchQuerySubject.next(this.searchQuery);
  }

  private filterSections(sections: HelpSection[], query: string): HelpSection[] {
    if (!query.trim()) {
      return sections;
    }

    const lowerQuery = query.toLowerCase();

    return sections.filter((section) => {
      // Search in section title and description
      if (
        section.title.toLowerCase().includes(lowerQuery) ||
        section.description.toLowerCase().includes(lowerQuery)
      ) {
        return true;
      }

      // Search in section content (subtitles and text)
      return section.content.some(
        (content) =>
          content.subtitle.toLowerCase().includes(lowerQuery) ||
          content.text.toLowerCase().includes(lowerQuery) ||
          (content.examples && content.examples.some((example) => example.toLowerCase().includes(lowerQuery)))
      );
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  getSafeIcon(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  toggleSection(sectionId: string): void {
    this.expandedSection = this.expandedSection === sectionId ? null : sectionId;

    // Scroll the section header to the top of the content container
    if (this.expandedSection === sectionId) {
      setTimeout(() => {
        const sectionHeader = document.querySelector(`[aria-controls="section-content-${sectionId}"]`) as HTMLElement;
        if (sectionHeader && this.contentArea) {
          const headerTop = sectionHeader.getBoundingClientRect().top;
          const containerTop = this.contentArea.nativeElement.getBoundingClientRect().top;
          const scrollPosition = headerTop - containerTop + this.contentArea.nativeElement.scrollTop;
          this.contentArea.nativeElement.scrollTop = scrollPosition;
        }
      }, 0);
    }
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSection === sectionId;
  }
}
