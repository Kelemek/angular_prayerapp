import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AdminHelpContentService } from '../../services/admin-help-content.service';
import type { AdminHelpSection } from '../../types/admin-help-content';
import { normalizeAdminHelpVideoEmbedUrl } from '../../lib/admin-help-video-url';
import { AdminHelpDriverTourService } from '../../services/admin-help-driver-tour.service';

/** Matches `admin_help_email_subscribers_overview` in AdminHelpContentService defaults. */
const ADMIN_HELP_SECTION_EMAIL_SUBSCRIBERS_OVERVIEW = 'admin_help_email_subscribers_overview';
/** Matches `admin_help_email_subscribers` in AdminHelpContentService defaults. */
const ADMIN_HELP_SECTION_EMAIL_SUBSCRIBERS = 'admin_help_email_subscribers';
/** Matches `admin_help_prayer_editor` in AdminHelpContentService defaults. */
const ADMIN_HELP_SECTION_PRAYER_EDITOR = 'admin_help_prayer_editor';
/** Matches `admin_help_prayer_editor_manage` in AdminHelpContentService defaults. */
const ADMIN_HELP_SECTION_PRAYER_EDITOR_MANAGE = 'admin_help_prayer_editor_manage';
/** Matches `admin_help_prompts_and_types` in AdminHelpContentService defaults. */
const ADMIN_HELP_SECTION_PRAYER_PROMPTS_AND_TYPES = 'admin_help_prompts_and_types';

@Component({
  selector: 'app-admin-help-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 bg-gray-900/50 z-40" (click)="onClose()" aria-hidden="true"></div>

      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-help-modal-title"
      >
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto">
          <div class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6 rounded-t-lg z-10">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 id="admin-help-modal-title" class="text-2xl font-bold not-dark:text-gray-900 dark:text-white">
                  Admin help
                </h2>
                <p class="text-sm text-gray-600 dark:text-gray-200 mt-1">Tutorials for the Admin Portal</p>
              </div>
              <button
                (click)="onClose()"
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 transition-colors cursor-pointer"
                title="Close help"
                aria-label="Close admin help modal"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="relative">
              <svg
                class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
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

          <div class="overflow-y-auto flex-1 p-4 sm:p-6" #contentArea>
            @if (isLoading$ | async) {
              <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            }

            @if (helpSections$ | async; as allHelpSections) {
              @if (!(isLoading$ | async) && allHelpSections.length === 0) {
                <div class="flex flex-col items-center justify-center py-12 text-center px-2">
                  <p class="text-gray-600 dark:text-gray-400">No tutorial topics yet.</p>
                  <p class="text-sm text-gray-500 dark:text-gray-500 mt-2 max-w-sm">
                    Topics and videos will appear here when they are added.
                  </p>
                </div>
              }
              @if (!(isLoading$ | async) && allHelpSections.length > 0) {
                @if ((filteredSections$ | async); as filteredSections) {
                  @if (filteredSections.length > 0) {
                    <div class="space-y-3">
                      @for (section of filteredSections; track section.id) {
                        @if (section.id === helpSectionIdEmailSubscribersOverview) {
                          <div
                            class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                          >
                            <button
                              type="button"
                              (click)="onStartEmailSubscribersOverviewTour($event)"
                              class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-start justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left cursor-pointer"
                              [attr.aria-label]="'Start guided tour: ' + section.title"
                            >
                              <div class="flex items-start gap-3 flex-1 min-w-0">
                                <div
                                  class="text-lg mt-1 flex-shrink-0 w-6 h-6"
                                  [innerHTML]="getSafeIcon(section.icon)"
                                  aria-hidden="true"
                                ></div>
                                <div class="min-w-0">
                                  <h3 class="font-semibold not-dark:text-gray-900 dark:text-white">{{ section.title }}</h3>
                                  <p class="text-sm text-gray-600 dark:text-gray-200">{{ section.description }}</p>
                                </div>
                              </div>
                              <span
                                class="flex-shrink-0 mt-1 inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-600 text-white"
                                aria-hidden="true"
                              >
                                <svg class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                            </button>
                          </div>
                        } @else if (section.id === helpSectionIdEmailSubscribers) {
                          <div
                            class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                          >
                            <button
                              type="button"
                              (click)="onStartEmailSubscribersTour($event)"
                              class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-start justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left cursor-pointer"
                              [attr.aria-label]="'Start guided tour: ' + section.title"
                            >
                              <div class="flex items-start gap-3 flex-1 min-w-0">
                                <div
                                  class="text-lg mt-1 flex-shrink-0 w-6 h-6"
                                  [innerHTML]="getSafeIcon(section.icon)"
                                  aria-hidden="true"
                                ></div>
                                <div class="min-w-0">
                                  <h3 class="font-semibold not-dark:text-gray-900 dark:text-white">{{ section.title }}</h3>
                                  <p class="text-sm text-gray-600 dark:text-gray-200">{{ section.description }}</p>
                                </div>
                              </div>
                              <span
                                class="flex-shrink-0 mt-1 inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-600 text-white"
                                aria-hidden="true"
                              >
                                <svg class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                            </button>
                          </div>
                        } @else if (section.id === helpSectionIdPrayerEditor) {
                          <div
                            class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                          >
                            <button
                              type="button"
                              (click)="onStartPrayerEditorTour($event)"
                              class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-start justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left cursor-pointer"
                              [attr.aria-label]="'Start guided tour: ' + section.title"
                            >
                              <div class="flex items-start gap-3 flex-1 min-w-0">
                                <div
                                  class="text-lg mt-1 flex-shrink-0 w-6 h-6"
                                  [innerHTML]="getSafeIcon(section.icon)"
                                  aria-hidden="true"
                                ></div>
                                <div class="min-w-0">
                                  <h3 class="font-semibold not-dark:text-gray-900 dark:text-white">{{ section.title }}</h3>
                                  <p class="text-sm text-gray-600 dark:text-gray-200">{{ section.description }}</p>
                                </div>
                              </div>
                              <span
                                class="flex-shrink-0 mt-1 inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-600 text-white"
                                aria-hidden="true"
                              >
                                <svg class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                            </button>
                          </div>
                        } @else if (section.id === helpSectionIdPrayerEditorManage) {
                          <div
                            class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                          >
                            <button
                              type="button"
                              (click)="onStartPrayerEditorManageTour($event)"
                              class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-start justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left cursor-pointer"
                              [attr.aria-label]="'Start guided tour: ' + section.title"
                            >
                              <div class="flex items-start gap-3 flex-1 min-w-0">
                                <div
                                  class="text-lg mt-1 flex-shrink-0 w-6 h-6"
                                  [innerHTML]="getSafeIcon(section.icon)"
                                  aria-hidden="true"
                                ></div>
                                <div class="min-w-0">
                                  <h3 class="font-semibold not-dark:text-gray-900 dark:text-white">{{ section.title }}</h3>
                                  <p class="text-sm text-gray-600 dark:text-gray-200">{{ section.description }}</p>
                                </div>
                              </div>
                              <span
                                class="flex-shrink-0 mt-1 inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-600 text-white"
                                aria-hidden="true"
                              >
                                <svg class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                            </button>
                          </div>
                        } @else if (section.id === helpSectionIdPrayerPromptsAndTypes) {
                          <div
                            class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                          >
                            <button
                              type="button"
                              (click)="onStartPrayerPromptsTypesTour($event)"
                              class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-start justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left cursor-pointer"
                              [attr.aria-label]="'Start guided tour: ' + section.title"
                            >
                              <div class="flex items-start gap-3 flex-1 min-w-0">
                                <div
                                  class="text-lg mt-1 flex-shrink-0 w-6 h-6"
                                  [innerHTML]="getSafeIcon(section.icon)"
                                  aria-hidden="true"
                                ></div>
                                <div class="min-w-0">
                                  <h3 class="font-semibold not-dark:text-gray-900 dark:text-white">{{ section.title }}</h3>
                                  <p class="text-sm text-gray-600 dark:text-gray-200">{{ section.description }}</p>
                                </div>
                              </div>
                              <span
                                class="flex-shrink-0 mt-1 inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-600 text-white"
                                aria-hidden="true"
                              >
                                <svg class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                            </button>
                          </div>
                        } @else {
                        <div
                          class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                        >
                          <button
                            type="button"
                            (click)="toggleSection(section.id)"
                            class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-start justify-between focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left cursor-pointer"
                            [attr.aria-expanded]="isSectionExpanded(section.id)"
                            [attr.aria-controls]="'admin-section-content-' + section.id"
                          >
                            <div class="flex items-start gap-3 flex-1">
                              <div
                                class="text-lg mt-1 flex-shrink-0 w-6 h-6"
                                [innerHTML]="getSafeIcon(section.icon)"
                              ></div>
                              <div>
                                <h3 class="font-semibold not-dark:text-gray-900 dark:text-white">{{ section.title }}</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-200">{{ section.description }}</p>
                              </div>
                            </div>
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

                          @if (isSectionExpanded(section.id)) {
                            <div
                              [id]="'admin-section-content-' + section.id"
                              class="px-4 sm:px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
                            >
                              <div class="space-y-4">
                                @for (block of section.content; track $index; let i = $index) {
                                  <div>
                                    <h4 class="font-medium not-dark:text-gray-900 dark:text-white">{{ block.subtitle }}</h4>
                                    <p class="text-sm text-gray-700 dark:text-gray-200 mt-1">{{ block.text }}</p>
                                    @if (block.examples && block.examples.length > 0) {
                                      <div class="mt-2 pl-3 border-l-2 border-blue-400 dark:border-blue-500">
                                        @for (example of block.examples; track $index) {
                                          <p class="text-xs text-gray-600 dark:text-gray-500 italic">{{ example }}</p>
                                        }
                                      </div>
                                    }
                                  </div>
                                }

                                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  @if (getTrustedEmbedUrl(section); as safeEmbed) {
                                    <button
                                      type="button"
                                      (click)="toggleVideo(section.id, $event)"
                                      [attr.aria-expanded]="isVideoOpen(section.id)"
                                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                                    >
                                      {{ isVideoOpen(section.id) ? 'Hide tutorial video' : 'Watch tutorial' }}
                                    </button>
                                    @if (isVideoOpen(section.id)) {
                                      <div class="mt-3 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black aspect-video">
                                        <iframe
                                          [src]="safeEmbed"
                                          class="h-full w-full"
                                          title="{{ section.title }} tutorial"
                                          loading="lazy"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                          allowfullscreen
                                          referrerpolicy="strict-origin-when-cross-origin"
                                        ></iframe>
                                      </div>
                                    }
                                  } @else if (section.videoEmbedUrl && section.videoEmbedUrl.trim()) {
                                    <p class="text-sm text-amber-800 dark:text-amber-200">
                                      This tutorial link could not be loaded. Use a supported YouTube or Vimeo embed URL.
                                    </p>
                                  } @else {
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Video coming soon.</p>
                                  }
                                </div>
                              </div>
                            </div>
                          }
                        </div>
                        }
                      }
                    </div>
                  } @else {
                    <div class="flex items-center justify-center py-12">
                      <div class="text-center">
                        <svg
                          class="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        <p class="text-gray-600 dark:text-gray-400">No help topics match your search.</p>
                        <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">Try searching with different keywords.</p>
                      </div>
                    </div>
                  }
                }
              }
            }
          </div>

          <div class="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 rounded-b-lg">
            <button
              (click)="onClose()"
              class="w-full px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium cursor-pointer"
            >
              Close Help
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminHelpModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() startEmailSubscribersTour = new EventEmitter<void>();
  @Output() startEmailSubscribersOverviewTour = new EventEmitter<void>();
  @Output() startPrayerEditorTour = new EventEmitter<void>();
  @Output() startPrayerEditorManageTour = new EventEmitter<void>();
  @Output() startPrayerPromptsTypesTour = new EventEmitter<void>();
  @ViewChild('contentArea') contentArea!: ElementRef<HTMLElement>;

  readonly helpSectionIdEmailSubscribersOverview = ADMIN_HELP_SECTION_EMAIL_SUBSCRIBERS_OVERVIEW;
  readonly helpSectionIdEmailSubscribers = ADMIN_HELP_SECTION_EMAIL_SUBSCRIBERS;
  readonly helpSectionIdPrayerEditor = ADMIN_HELP_SECTION_PRAYER_EDITOR;
  readonly helpSectionIdPrayerEditorManage = ADMIN_HELP_SECTION_PRAYER_EDITOR_MANAGE;
  readonly helpSectionIdPrayerPromptsAndTypes = ADMIN_HELP_SECTION_PRAYER_PROMPTS_AND_TYPES;

  helpSections$!: Observable<AdminHelpSection[]>;
  filteredSections$!: Observable<AdminHelpSection[]>;
  isLoading$!: Observable<boolean>;

  expandedSection: string | null = null;
  searchQuery = '';
  private searchQuerySubject = new BehaviorSubject<string>('');
  /** Whether the embed panel is visible per section id. */
  private videoOpen: Record<string, boolean> = {};

  constructor(
    private adminHelpContentService: AdminHelpContentService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private adminHelpDriverTour: AdminHelpDriverTourService
  ) {}

  ngOnInit(): void {
    this.helpSections$ = this.adminHelpContentService.getSections();
    this.isLoading$ = this.adminHelpContentService.isLoading$;

    this.filteredSections$ = this.searchQuerySubject.pipe(
      switchMap((query) =>
        this.adminHelpContentService.getSections().pipe(map((sections) => this.filterSections(sections, query)))
      )
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !this.isOpen) {
      this.expandedSection = null;
      this.videoOpen = {};
      this.searchQuery = '';
      this.searchQuerySubject.next('');
      this.cdr.markForCheck();
    }
  }

  onSearchChange(): void {
    this.searchQuerySubject.next(this.searchQuery);
  }

  private filterSections(sections: AdminHelpSection[], query: string): AdminHelpSection[] {
    if (!query.trim()) {
      return sections.filter((s) => s.isActive);
    }
    const lowerQuery = query.toLowerCase();
    return sections.filter((section) => {
      if (!section.isActive) {
        return false;
      }
      if (section.title.toLowerCase().includes(lowerQuery) || section.description.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      return section.content.some(
        (c) =>
          c.subtitle.toLowerCase().includes(lowerQuery) ||
          c.text.toLowerCase().includes(lowerQuery) ||
          (c.examples && c.examples.some((e) => e.toLowerCase().includes(lowerQuery)))
      );
    });
  }

  onClose(): void {
    this.adminHelpDriverTour.destroy();
    this.closeModal.emit();
  }

  onStartEmailSubscribersTour(event: Event): void {
    event.stopPropagation();
    this.startEmailSubscribersTour.emit();
  }

  onStartEmailSubscribersOverviewTour(event: Event): void {
    event.stopPropagation();
    this.startEmailSubscribersOverviewTour.emit();
  }

  onStartPrayerEditorTour(event: Event): void {
    event.stopPropagation();
    this.startPrayerEditorTour.emit();
  }

  onStartPrayerEditorManageTour(event: Event): void {
    event.stopPropagation();
    this.startPrayerEditorManageTour.emit();
  }

  onStartPrayerPromptsTypesTour(event: Event): void {
    event.stopPropagation();
    this.startPrayerPromptsTypesTour.emit();
  }

  getSafeIcon(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  getTrustedEmbedUrl(section: AdminHelpSection): SafeResourceUrl | null {
    const normalized = normalizeAdminHelpVideoEmbedUrl(section.videoEmbedUrl);
    if (!normalized) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(normalized);
  }

  toggleVideo(sectionId: string, event: Event): void {
    event.stopPropagation();
    this.videoOpen[sectionId] = !this.videoOpen[sectionId];
    this.cdr.markForCheck();
  }

  isVideoOpen(sectionId: string): boolean {
    return !!this.videoOpen[sectionId];
  }

  toggleSection(sectionId: string): void {
    this.expandedSection = this.expandedSection === sectionId ? null : sectionId;

    if (this.expandedSection === sectionId) {
      setTimeout(() => {
        const sectionHeader = document.querySelector(
          `[aria-controls="admin-section-content-${sectionId}"]`
        ) as HTMLElement | null;
        if (sectionHeader && this.contentArea) {
          const headerTop = sectionHeader.getBoundingClientRect().top;
          const containerTop = this.contentArea.nativeElement.getBoundingClientRect().top;
          const scrollPosition = headerTop - containerTop + this.contentArea.nativeElement.scrollTop;
          this.contentArea.nativeElement.scrollTop = scrollPosition;
        }
      }, 0);
    }
    this.cdr.markForCheck();
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSection === sectionId;
  }
}
