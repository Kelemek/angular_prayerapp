import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  PresentationTimeFilter,
  SelectablePresentationContentType,
} from "../../types/presentation";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";
import { PresentationSettingsThemeSectionComponent } from "./presentation-settings-theme-section.component";
import { PresentationSettingsFiltersPanelComponent } from "./presentation-settings-filters-panel.component";
import { PresentationSettingsDisplaySectionComponent } from "./presentation-settings-display-section.component";
import { PresentationSettingsTimerSectionComponent } from "./presentation-settings-timer-section.component";
import type { PresentationSettingsThemeOption } from "./presentation-settings-theme-section.component";

@Component({
  selector: "app-presentation-settings-modal",
  standalone: true,
  imports: [
    CommonModule,
    ModalShellComponent,
    PresentationSettingsThemeSectionComponent,
    PresentationSettingsFiltersPanelComponent,
    PresentationSettingsDisplaySectionComponent,
    PresentationSettingsTimerSectionComponent,
  ],
  templateUrl: "./presentation-settings-modal.component.html",
  styleUrl: "./presentation-settings-modal.component.css",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PresentationSettingsModalComponent implements OnChanges {
  @ViewChild(PresentationSettingsFiltersPanelComponent)
  filtersPanel?: PresentationSettingsFiltersPanelComponent;

  @Input() visible = false;
  @Input() theme: PresentationSettingsThemeOption = "system";
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
  @Output() themeChange = new EventEmitter<PresentationSettingsThemeOption>();
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

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes["visible"]?.previousValue === true &&
      changes["visible"].currentValue === false
    ) {
      this.flushOpenFilterDropdowns();
    }
  }

  closeModal(): void {
    this.flushOpenFilterDropdowns();
    this.close.emit();
  }

  private flushOpenFilterDropdowns(): void {
    this.filtersPanel?.applyOpenDropdowns();
    this.filtersPanel?.resetDropdownState();
  }

  onSettingsBodyPointerDown(event: MouseEvent): void {
    this.filtersPanel?.onBodyPointerDown(event);
  }
}
