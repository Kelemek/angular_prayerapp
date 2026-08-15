import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { HelpContentService } from "../../services/help-content.service";
import { HelpDriverTourService } from "../../services/help-driver-tour.service";
import { ToastService } from "../../services/toast.service";
import { HelpSection } from "../../types/help-content";
import { formatHelpContentHtml } from "../../lib/help-content-html";
import {
  Observable,
  BehaviorSubject,
  defaultIfEmpty,
  firstValueFrom,
} from "rxjs";
import { map, switchMap, take } from "rxjs/operators";

/** Stable id for Creating Prayers accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_PRAYERS = "help_prayers";
/** Stable id for Using Prayer Prompts accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_PROMPTS = "help_prompts";
/** Stable id for Prayer Encouragement accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_ENCOURAGEMENT = "help_prayer_encouragement";
/** Stable id for Searching Prayers accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_SEARCH = "help_search";
/** Stable id for Personal Prayers accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_PERSONAL_PRAYERS = "help_personal_prayers";
/** Stable id for Memorize Scripture accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_MEMORIZE = "help_memorize";
/** Stable id for Prayer Presentation Mode accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_PRESENTATION = "help_presentation";
/** Stable id for Printing accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_PRINTING = "help_printing";
/** Stable id for Email Subscription accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_EMAIL_SUBSCRIPTION = "help_email_subscription";
/** Stable id for Prayer reminders accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_PRAYER_REMINDERS = "help_prayer_reminders";
/** Stable id for Feedback accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_FEEDBACK = "help_feedback";
/** Stable id for App Settings accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_APP_SETTINGS = "help_settings";
/** Stable id for Filtering Prayers accordion (must match `HelpContentService`). */
const HELP_SECTION_ID_FILTERING = "help_filtering";

@Component({
  selector: "app-help-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (isOpen) {
    <!-- Modal Backdrop -->
    <div
      class="fixed inset-0 bg-gray-900/50 z-40"
      (click)="onClose()"
      aria-hidden="true"
    ></div>

    <!-- Modal Container -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto"
      >
        <!-- Header (Sticky) -->
        <div
          class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6 rounded-t-lg z-10"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h2
                id="help-modal-title"
                class="text-2xl font-bold not-dark:text-gray-900 dark:text-white"
              >
                Help & Guidance
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-200 mt-1">
                Learn how to use the Prayer App
              </p>
            </div>
            <button
              (click)="onClose()"
              class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 transition-colors cursor-pointer"
              title="Close help"
              aria-label="Close help modal"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          <!-- Search Input -->
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
              class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-inset-surface text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        <!-- Content Area (Scrollable) -->
        <div class="overflow-y-auto flex-1 p-4 sm:p-6" #contentArea>
          @if (helpSections$ | async; as allHelpSections) { @if (!(isLoading$ |
          async) && allHelpSections.length > 0) {
          <div
            class="mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <button
              type="button"
              (click)="onFullGuidedTour($event)"
              class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-inset-surface-interactive flex items-start focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left cursor-pointer"
            >
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div
                  class="text-lg mt-1 flex-shrink-0 w-7 h-7 text-gray-700 dark:text-gray-200 [&_svg]:w-full [&_svg]:h-full"
                  aria-hidden="true"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h3
                    class="font-semibold not-dark:text-gray-900 dark:text-white"
                  >
                    Full guided tour
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-200">
                    Starts with a short welcome, then walks each Help topic on
                    the real app in order (including presentation mode when you
                    reach that step). Ends with a thank-you message. You can
                    close the driver anytime to stop.
                  </p>
                </div>
              </div>
            </button>
          </div>
          } }
          <!-- Loading State -->
          @if (isLoading$ | async) {
          <div class="flex items-center justify-center py-12">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
            ></div>
          </div>
          }

          <!-- Error State -->
          @if (error$ | async; as error) { @if (error && error !== 'Using
          default help content.') {
          <div
            class="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6"
          >
            <p class="text-sm text-yellow-800 dark:text-yellow-200">
              {{ error }}
            </p>
          </div>
          } }

          <!-- Help Sections (Accordion) -->
          @if (helpSections$ | async; as sections) { @if ((filteredSections$ |
          async); as filteredSections) { @if (filteredSections.length > 0) {
          <div class="space-y-3">
            @for (section of filteredSections; track section.id) {
            <div
              class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <!-- Section Header (Clickable) -->
              <button
                (click)="toggleSection(section.id)"
                class="w-full px-4 sm:px-6 py-3 sm:py-4 bg-inset-surface-interactive flex items-start justify-between focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors text-left cursor-pointer"
                [attr.aria-expanded]="isSectionExpanded(section.id)"
                [attr.aria-controls]="'section-content-' + section.id"
              >
                <div class="flex items-start gap-3 flex-1">
                  <div
                    class="text-lg mt-1 flex-shrink-0 w-6 h-6"
                    [innerHTML]="getSafeIcon(section.icon)"
                  ></div>
                  <div>
                    <h3
                      class="font-semibold not-dark:text-gray-900 dark:text-white"
                    >
                      {{ section.title }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-200">
                      {{ section.description }}
                    </p>
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
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  ></path>
                </svg>
              </button>

              <!-- Section Content (Expanded) -->
              @if (isSectionExpanded(section.id)) {
              <div
                [id]="'section-content-' + section.id"
                class="px-4 sm:px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
              >
                <div class="space-y-4">
                  @for (content of section.content; track $index; let i =
                  $index) {
                  <div [id]="'help-block-' + section.id + '-' + i">
                    <h4
                      class="font-medium not-dark:text-gray-900 dark:text-white"
                    >
                      {{ content.subtitle }}
                    </h4>
                    <p
                      class="text-sm text-gray-700 dark:text-gray-200 mt-1"
                      [innerHTML]="getHelpContentHtml(content.text)"
                    ></p>

                    <!-- Examples -->
                    @if (content.examples && content.examples.length > 0) {
                    <div
                      class="mt-2 pl-3 border-l-2 border-blue-400 dark:border-blue-500"
                    >
                      @for (example of content.examples; track $index) {
                      <p
                        class="text-xs text-gray-600 dark:text-gray-500 italic"
                      >
                        {{ example }}
                      </p>
                      }
                    </div>
                    }
                  </div>
                  } @if (section.id === helpSectionIdPrayers) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="
                        onStartCreatingPrayersHelpSectionTour($event, section)
                      "
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdPrompts) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="onStartPromptsSectionTour($event, section)"
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdEncouragement) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="
                        onStartPrayerEncouragementSectionTour($event, section)
                      "
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdSearch) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="onStartSearchPrayersSectionTour($event, section)"
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdPersonalPrayers) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="
                        onStartPersonalPrayersHelpSectionTour($event, section)
                      "
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdMemorize) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="onStartMemorizeHelpSectionTour($event, section)"
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdFiltering) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="onStartFilteringHelpSectionTour($event, section)"
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdPresentation) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="
                        onStartPresentationModeHelpSectionTour($event, section)
                      "
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdPrinting) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="onStartPrintingHelpSectionTour($event, section)"
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdEmailSubscription) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="
                        onStartEmailSubscriptionHelpSectionTour($event, section)
                      "
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdPrayerReminders) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="
                        onStartPrayerRemindersHelpSectionTour($event, section)
                      "
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdFeedback) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="onStartFeedbackHelpSectionTour($event, section)"
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
                  </div>
                  } @if (section.id === helpSectionIdAppSettings) {
                  <div
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      (click)="
                        onStartAppSettingsHelpSectionTour($event, section)
                      "
                      class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
                    >
                      Start guided tour
                    </button>
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
              <svg
                class="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <p class="text-gray-600 dark:text-gray-400">
                No help topics match your search.
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Try searching with different keywords.
              </p>
            </div>
          </div>
          } } }
        </div>
      </div>
    </div>
    }
  `,
})
export class HelpModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  /** One live UI tour for the whole **Creating Prayers** section (`help_prayers`). */
  @Output() startCreatingPrayersHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  /** Live UI tour for **Filtering Prayers** (`help_filtering`) — filter tiles + search. */
  @Output() startFilteringHelpSectionUiTour = new EventEmitter<HelpSection>();
  /** One live UI tour for the whole “Using Prayer Prompts” help section. */
  @Output() startPrayerPromptsUiTour = new EventEmitter<HelpSection>();
  /** One live UI tour for “Prayer Encouragement (Pray For)”. */
  @Output() startPrayerEncouragementUiTour = new EventEmitter<HelpSection>();
  /** One live UI tour for “Searching Prayers”. */
  @Output() startSearchPrayersUiTour = new EventEmitter<HelpSection>();
  /** One live UI tour for the **Personal Prayers** help accordion (`help_personal_prayers`). */
  @Output() startPersonalPrayersHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  /** Live UI tour for **Memorize Scripture** (`help_memorize`). */
  @Output() startMemorizeHelpSectionUiTour = new EventEmitter<HelpSection>();
  /** Live UI tour for **Prayer Presentation Mode** — Home navigates to `/presentation` and starts driver.js there. */
  @Output() startPresentationModeHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  /** Live UI tour for **Printing** — Settings modal print buttons. */
  @Output() startPrintingHelpSectionUiTour = new EventEmitter<HelpSection>();
  /** Live UI tour for **Email Subscription** — Settings email toggle. */
  @Output() startEmailSubscriptionHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  /** Live UI tour for **Prayer reminders** — Settings prayer reminders card. */
  @Output() startPrayerRemindersHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  /** Live UI tour for **Feedback** — Settings Send Feedback card. */
  @Output() startFeedbackHelpSectionUiTour = new EventEmitter<HelpSection>();
  /** Live UI tour for **App Settings** — full Settings panel overview. */
  @Output() startAppSettingsHelpSectionUiTour = new EventEmitter<HelpSection>();
  /** Chained welcome → every active section in `order` → closing (handled on `HomeComponent`). */
  @Output() fullGuidedTourRequested = new EventEmitter<HelpSection[]>();
  @ViewChild("contentArea") contentArea!: ElementRef;

  /** Exposed for template comparison with help_prayers section id. */
  readonly helpSectionIdPrayers = HELP_SECTION_ID_PRAYERS;
  readonly helpSectionIdPrompts = HELP_SECTION_ID_PROMPTS;
  readonly helpSectionIdEncouragement = HELP_SECTION_ID_ENCOURAGEMENT;
  readonly helpSectionIdSearch = HELP_SECTION_ID_SEARCH;
  readonly helpSectionIdPersonalPrayers = HELP_SECTION_ID_PERSONAL_PRAYERS;
  readonly helpSectionIdMemorize = HELP_SECTION_ID_MEMORIZE;
  readonly helpSectionIdFiltering = HELP_SECTION_ID_FILTERING;
  readonly helpSectionIdPresentation = HELP_SECTION_ID_PRESENTATION;
  readonly helpSectionIdPrinting = HELP_SECTION_ID_PRINTING;
  readonly helpSectionIdEmailSubscription = HELP_SECTION_ID_EMAIL_SUBSCRIPTION;
  readonly helpSectionIdPrayerReminders = HELP_SECTION_ID_PRAYER_REMINDERS;
  readonly helpSectionIdFeedback = HELP_SECTION_ID_FEEDBACK;
  readonly helpSectionIdAppSettings = HELP_SECTION_ID_APP_SETTINGS;

  helpSections$!: Observable<HelpSection[]>;
  filteredSections$!: Observable<HelpSection[]>;
  isLoading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  expandedSection: string | null = null;
  searchQuery = "";

  private searchQuerySubject = new BehaviorSubject<string>("");

  constructor(
    private helpContentService: HelpContentService,
    private sanitizer: DomSanitizer,
    private helpDriverTourService: HelpDriverTourService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.helpSections$ = this.helpContentService.getSections();
    this.isLoading$ = this.helpContentService.isLoading$;
    this.error$ = this.helpContentService.error$;

    // Re-filter whenever the search query changes (no long-lived subscribe — async pipe owns the subscription)
    this.filteredSections$ = this.searchQuerySubject.pipe(
      switchMap((query) =>
        this.helpContentService
          .getSections()
          .pipe(map((sections) => this.filterSections(sections, query)))
      )
    );
  }

  onSearchChange(): void {
    this.searchQuerySubject.next(this.searchQuery);
  }

  private filterSections(
    sections: HelpSection[],
    query: string
  ): HelpSection[] {
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
          (content.examples &&
            content.examples.some((example) =>
              example.toLowerCase().includes(lowerQuery)
            ))
      );
    });
  }

  async onFullGuidedTour(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.helpDriverTourService.interruptGuidedTours();
    let sections: HelpSection[];
    try {
      sections = await firstValueFrom(
        this.helpContentService
          .getSections()
          .pipe(take(1), defaultIfEmpty([] as HelpSection[]))
      );
    } catch (err) {
      console.error(
        "[HelpModal] full guided tour: failed to load help sections",
        err
      );
      this.toastService.showToast(
        "Could not start the full tour. Please try again in a moment.",
        "error"
      );
      return;
    }
    const sorted = [...sections]
      .filter((s) => s.isActive)
      .sort((a, b) => a.order - b.order);
    if (sorted.length === 0) {
      return;
    }
    this.fullGuidedTourRequested.emit(sorted);
  }

  onClose(): void {
    this.helpDriverTourService.interruptGuidedTours();
    this.closeModal.emit();
  }

  onStartCreatingPrayersHelpSectionTour(
    event: Event,
    section: HelpSection
  ): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_PRAYERS) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startCreatingPrayersHelpSectionUiTour.emit(section);
  }

  onStartPromptsSectionTour(event: Event, section: HelpSection): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_PROMPTS) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startPrayerPromptsUiTour.emit(section);
  }

  onStartPrayerEncouragementSectionTour(
    event: Event,
    section: HelpSection
  ): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_ENCOURAGEMENT) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startPrayerEncouragementUiTour.emit(section);
  }

  onStartSearchPrayersSectionTour(event: Event, section: HelpSection): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_SEARCH) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startSearchPrayersUiTour.emit(section);
  }

  onStartPersonalPrayersHelpSectionTour(
    event: Event,
    section: HelpSection
  ): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_PERSONAL_PRAYERS) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startPersonalPrayersHelpSectionUiTour.emit(section);
  }

  onStartMemorizeHelpSectionTour(event: Event, section: HelpSection): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_MEMORIZE) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startMemorizeHelpSectionUiTour.emit(section);
  }

  onStartFilteringHelpSectionTour(event: Event, section: HelpSection): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_FILTERING) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startFilteringHelpSectionUiTour.emit(section);
  }

  onStartPresentationModeHelpSectionTour(
    event: Event,
    section: HelpSection
  ): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_PRESENTATION) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startPresentationModeHelpSectionUiTour.emit(section);
  }

  onStartPrintingHelpSectionTour(event: Event, section: HelpSection): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_PRINTING) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startPrintingHelpSectionUiTour.emit(section);
  }

  onStartEmailSubscriptionHelpSectionTour(
    event: Event,
    section: HelpSection
  ): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_EMAIL_SUBSCRIPTION) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startEmailSubscriptionHelpSectionUiTour.emit(section);
  }

  onStartPrayerRemindersHelpSectionTour(
    event: Event,
    section: HelpSection
  ): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_PRAYER_REMINDERS) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startPrayerRemindersHelpSectionUiTour.emit(section);
  }

  onStartFeedbackHelpSectionTour(event: Event, section: HelpSection): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_FEEDBACK) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startFeedbackHelpSectionUiTour.emit(section);
  }

  onStartAppSettingsHelpSectionTour(event: Event, section: HelpSection): void {
    event.stopPropagation();
    if (section.id !== HELP_SECTION_ID_APP_SETTINGS) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    this.startAppSettingsHelpSectionUiTour.emit(section);
  }

  getSafeIcon(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  getHelpContentHtml(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(formatHelpContentHtml(text));
  }

  toggleSection(sectionId: string): void {
    this.expandedSection =
      this.expandedSection === sectionId ? null : sectionId;

    // Scroll the section header to the top of the content container
    if (this.expandedSection === sectionId) {
      setTimeout(() => {
        const sectionHeader = document.querySelector(
          `[aria-controls="section-content-${sectionId}"]`
        ) as HTMLElement;
        if (sectionHeader && this.contentArea) {
          const headerTop = sectionHeader.getBoundingClientRect().top;
          const containerTop =
            this.contentArea.nativeElement.getBoundingClientRect().top;
          const scrollPosition =
            headerTop - containerTop + this.contentArea.nativeElement.scrollTop;
          this.contentArea.nativeElement.scrollTop = scrollPosition;
        }
      }, 0);
    }
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSection === sectionId;
  }
}
