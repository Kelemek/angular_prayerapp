import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HelpContentService } from '../../services/help-content.service';
import { HelpDriverTourService } from '../../services/help-driver-tour.service';
import { ToastService } from '../../services/toast.service';
import { HelpSection } from '../../types/help-content';
import { formatHelpContentHtml } from '../../lib/help-content-html';
import { CHURCH_GREEN_SHELL_BORDER_CLASS } from '../../lib/home-sub-filter-chip-classes';
import {
  filterHelpModalSections,
  sortActiveHelpSectionsForFullTour,
} from '../../lib/help-modal-filter';
import {
  HELP_SECTION_ID_APP_SETTINGS,
  HELP_SECTION_ID_ENCOURAGEMENT,
  HELP_SECTION_ID_EMAIL_SUBSCRIPTION,
  HELP_SECTION_ID_FEEDBACK,
  HELP_SECTION_ID_FILTERING,
  HELP_SECTION_ID_MEMORIZE,
  HELP_SECTION_ID_PERSONAL_PRAYERS,
  HELP_SECTION_ID_PRAYERS,
  HELP_SECTION_ID_PRESENTATION,
  HELP_SECTION_ID_PRINTING,
  HELP_SECTION_ID_PROMPTS,
  HELP_SECTION_ID_PRAYER_REMINDERS,
  HELP_SECTION_ID_SEARCH,
  helpSectionHasUiTour,
} from '../../lib/help-section-ids';
import {
  Observable,
  BehaviorSubject,
  defaultIfEmpty,
  firstValueFrom,
} from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './help-modal.component.html',
})
export class HelpModalComponent implements OnInit {
  @Input() isOpen = false;
  readonly shellBorderClass = CHURCH_GREEN_SHELL_BORDER_CLASS;
  @Output() closeModal = new EventEmitter<void>();
  @Output() startCreatingPrayersHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  @Output() startFilteringHelpSectionUiTour = new EventEmitter<HelpSection>();
  @Output() startPrayerPromptsUiTour = new EventEmitter<HelpSection>();
  @Output() startPrayerEncouragementUiTour = new EventEmitter<HelpSection>();
  @Output() startSearchPrayersUiTour = new EventEmitter<HelpSection>();
  @Output() startPersonalPrayersHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  @Output() startMemorizeHelpSectionUiTour = new EventEmitter<HelpSection>();
  @Output() startPresentationModeHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  @Output() startPrintingHelpSectionUiTour = new EventEmitter<HelpSection>();
  @Output() startEmailSubscriptionHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  @Output() startPrayerRemindersHelpSectionUiTour =
    new EventEmitter<HelpSection>();
  @Output() startFeedbackHelpSectionUiTour = new EventEmitter<HelpSection>();
  @Output() startAppSettingsHelpSectionUiTour = new EventEmitter<HelpSection>();
  @Output() fullGuidedTourRequested = new EventEmitter<HelpSection[]>();
  @ViewChild('contentArea') contentArea!: ElementRef;

  readonly helpSectionHasUiTour = helpSectionHasUiTour;

  helpSections$!: Observable<HelpSection[]>;
  filteredSections$!: Observable<HelpSection[]>;
  isLoading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  expandedSection: string | null = null;
  searchQuery = '';

  private searchQuerySubject = new BehaviorSubject<string>('');
  private readonly sectionTourEmitters: Record<
    string,
    EventEmitter<HelpSection>
  >;

  constructor(
    private helpContentService: HelpContentService,
    private sanitizer: DomSanitizer,
    private helpDriverTourService: HelpDriverTourService,
    private toastService: ToastService
  ) {
    this.sectionTourEmitters = {
      [HELP_SECTION_ID_PRAYERS]: this.startCreatingPrayersHelpSectionUiTour,
      [HELP_SECTION_ID_FILTERING]: this.startFilteringHelpSectionUiTour,
      [HELP_SECTION_ID_PROMPTS]: this.startPrayerPromptsUiTour,
      [HELP_SECTION_ID_ENCOURAGEMENT]: this.startPrayerEncouragementUiTour,
      [HELP_SECTION_ID_SEARCH]: this.startSearchPrayersUiTour,
      [HELP_SECTION_ID_PERSONAL_PRAYERS]:
        this.startPersonalPrayersHelpSectionUiTour,
      [HELP_SECTION_ID_MEMORIZE]: this.startMemorizeHelpSectionUiTour,
      [HELP_SECTION_ID_PRESENTATION]:
        this.startPresentationModeHelpSectionUiTour,
      [HELP_SECTION_ID_PRINTING]: this.startPrintingHelpSectionUiTour,
      [HELP_SECTION_ID_EMAIL_SUBSCRIPTION]:
        this.startEmailSubscriptionHelpSectionUiTour,
      [HELP_SECTION_ID_PRAYER_REMINDERS]:
        this.startPrayerRemindersHelpSectionUiTour,
      [HELP_SECTION_ID_FEEDBACK]: this.startFeedbackHelpSectionUiTour,
      [HELP_SECTION_ID_APP_SETTINGS]: this.startAppSettingsHelpSectionUiTour,
    };
  }

  ngOnInit(): void {
    this.helpSections$ = this.helpContentService.getSections();
    this.isLoading$ = this.helpContentService.isLoading$;
    this.error$ = this.helpContentService.error$;

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

  filterSections(sections: HelpSection[], query: string): HelpSection[] {
    return filterHelpModalSections(sections, query);
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
        '[HelpModal] full guided tour: failed to load help sections',
        err
      );
      this.toastService.showToast(
        'Could not start the full tour. Please try again in a moment.',
        'error'
      );
      return;
    }
    const sorted = sortActiveHelpSectionsForFullTour(sections);
    if (sorted.length === 0) {
      return;
    }
    this.fullGuidedTourRequested.emit(sorted);
  }

  onClose(): void {
    this.helpDriverTourService.interruptGuidedTours();
    this.closeModal.emit();
  }

  onStartSectionTour(event: Event, section: HelpSection): void {
    event.stopPropagation();
    const emitter = this.sectionTourEmitters[section.id];
    if (!emitter) {
      return;
    }
    this.helpDriverTourService.interruptGuidedTours();
    emitter.emit(section);
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
