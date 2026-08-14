import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { PresentationSettingsMultiSelectFilterRowComponent } from "./presentation-settings-multi-select-filter-row.component";
import type { PresentationSettingsDropdownOption } from "./presentation-settings-multi-select-dropdown.component";
import { PresentationSettingsSingleSelectFilterRowComponent } from "./presentation-settings-single-select-filter-row.component";
import type { PresentationPrayerStatusFilterField } from "../../lib/presentation-settings-prayer-status-filter-field";
import type { PresentationTimeFilter } from "../../types/presentation";

@Component({
  selector: "app-presentation-settings-prayer-status-time-filters",
  standalone: true,
  imports: [
    CommonModule,
    PresentationSettingsMultiSelectFilterRowComponent,
    PresentationSettingsSingleSelectFilterRowComponent,
  ],
  templateUrl: "./presentation-settings-prayer-status-time-filters.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PresentationSettingsPrayerStatusTimeFiltersComponent {
  @Input({ required: true }) statusField!: PresentationPrayerStatusFilterField;
  @Input() statusDropdownOptions: PresentationSettingsDropdownOption<string>[] =
    [];
  @Input() timeFilterDisplay = "";
  @Input() showTimeFilterDropdown = false;
  @Input() localTimeFilter: PresentationTimeFilter = "all";
  @Input() timeFilterOptions: PresentationSettingsDropdownOption<PresentationTimeFilter>[] =
    [];

  @Output() toggleTimeFilter = new EventEmitter<void>();
  @Output() selectTimeFilter = new EventEmitter<PresentationTimeFilter>();
}
