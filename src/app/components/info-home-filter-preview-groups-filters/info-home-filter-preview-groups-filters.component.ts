import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  HOME_GROUPS_PANEL_CHIP_THEMES,
  HOME_GROUPS_STATUS_CHIP_THEMES,
  HOME_GROUPS_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { buildHomeSubFilterChipButtonClass } from "../../lib/home-sub-filter-chip-button-class";
import type {
  InfoGroupsPreviewStatus,
  InfoPreviewMockGroupChip,
} from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-home-filter-preview-groups-filters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-groups-filters.component.html",
  host: { class: "block" },
})
export class InfoHomeFilterPreviewGroupsFiltersComponent {
  readonly groupsPanelClass = HOME_GROUPS_SUB_FILTER_GROUP_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly chipHostClass = HOME_WRAP_FILTER_CHIP_FLEX_CLASS;
  readonly chipButtonClass = HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS;
  readonly statusThemes = HOME_GROUPS_STATUS_CHIP_THEMES;
  readonly groupChipActive = HOME_GROUPS_PANEL_CHIP_THEMES.active;
  readonly groupChipInactive = HOME_GROUPS_PANEL_CHIP_THEMES.inactive;
  readonly addGroupChipLayoutClass =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg p-0 text-xs font-medium transition-all";

  @Input() status: InfoGroupsPreviewStatus = "current";
  @Input() selectedGroupChip: InfoPreviewMockGroupChip = "larson";

  @Output() statusChange = new EventEmitter<InfoGroupsPreviewStatus>();
  @Output() selectedGroupChipChange =
    new EventEmitter<InfoPreviewMockGroupChip>();
  @Output() openGroupsExplainer = new EventEmitter<void>();

  statusChipClass(active: boolean, key: keyof typeof HOME_GROUPS_STATUS_CHIP_THEMES): string {
    const theme = this.statusThemes[key];
    return buildHomeSubFilterChipButtonClass({
      base: this.chipButtonClass,
      active,
      activeClass: theme.active,
      inactiveClass: theme.inactive,
    });
  }

  groupChipClass(active: boolean): string {
    return buildHomeSubFilterChipButtonClass({
      base: this.chipButtonClass,
      active,
      inactiveClass: this.groupChipInactive,
      activeClass: this.groupChipActive,
    });
  }

  selectStatus(next: InfoGroupsPreviewStatus): void {
    this.statusChange.emit(next);
  }

  selectGroupChip(chip: InfoPreviewMockGroupChip): void {
    this.selectedGroupChipChange.emit(chip);
  }
}
