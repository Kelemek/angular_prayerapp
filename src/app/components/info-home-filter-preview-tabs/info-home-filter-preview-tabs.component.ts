import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  HOME_MEMORIZE_PANEL_CHIP_THEMES,
  HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS,
  HOME_PUBLIC_STATUS_CHIP_THEMES,
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
  homeFilterTabClass,
} from "../../lib/home-sub-filter-chip-classes";
import { buildHomeSubFilterChipButtonClass } from "../../lib/home-sub-filter-chip-button-class";
import {
  groupsPreviewStatusFromFilter,
  isGroupsAreaPreviewFilter,
  isMemorizePreviewFilter,
  isPublicAreaPreviewFilter,
  isPublicPreviewFilter,
  type InfoGroupsPreviewStatus,
  type InfoMemorizeActionPreview,
  type InfoPreviewFilter,
  type InfoPreviewMockGroupChip,
} from "../../lib/info-home-filter-preview.types";
import { InfoHomeFilterPreviewPersonalFiltersComponent } from "../info-home-filter-preview-personal-filters/info-home-filter-preview-personal-filters.component";
import { InfoHomeFilterPreviewPromptsFiltersComponent } from "../info-home-filter-preview-prompts-filters/info-home-filter-preview-prompts-filters.component";
import { InfoHomeFilterPreviewGroupsFiltersComponent } from "../info-home-filter-preview-groups-filters/info-home-filter-preview-groups-filters.component";

@Component({
  selector: "app-info-home-filter-preview-tabs",
  standalone: true,
  imports: [
    CommonModule,
    InfoHomeFilterPreviewPersonalFiltersComponent,
    InfoHomeFilterPreviewPromptsFiltersComponent,
    InfoHomeFilterPreviewGroupsFiltersComponent,
  ],
  templateUrl: "./info-home-filter-preview-tabs.component.html",
  host: { class: "block" },
})
export class InfoHomeFilterPreviewTabsComponent {
  @Input() previewFilter: InfoPreviewFilter = "current";
  @Output() previewFilterChange = new EventEmitter<InfoPreviewFilter>();
  @Output() openBadges = new EventEmitter<void>();
  @Output() openPromptCategories = new EventEmitter<void>();
  @Output() openPersonalCategories = new EventEmitter<void>();
  @Output() openGroupsExplainer = new EventEmitter<void>();
  @Output() openMemorizeAction = new EventEmitter<InfoMemorizeActionPreview>();
  @Input() selectedGroupChip: InfoPreviewMockGroupChip = "larson";
  @Output() selectedGroupChipChange =
    new EventEmitter<InfoPreviewMockGroupChip>();

  readonly chipHostClass = HOME_WRAP_FILTER_CHIP_FLEX_CLASS;
  readonly chipButtonClass = HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly chipThemes = HOME_PUBLIC_STATUS_CHIP_THEMES;
  readonly publicSubFilterGroupClass = HOME_PUBLIC_SUB_FILTER_GROUP_CLASS;

  isPublicTabActive(): boolean {
    return isPublicAreaPreviewFilter(this.previewFilter);
  }

  get publicPanelGroupClass(): string {
    const base = this.publicSubFilterGroupClass.replace("rounded-b-lg", "").trim();
    const shape =
      this.previewFilter === "prompts" ? "rounded-b-none" : "rounded-b-lg";
    return `${base} ${shape}`;
  }

  publicTabClass(): string {
    return homeFilterTabClass({
      accent: "public",
      active: this.isPublicTabActive(),
      hasSubRow: true,
    });
  }

  isGroupsTabActive(): boolean {
    return isGroupsAreaPreviewFilter(this.previewFilter);
  }

  groupsTabClass(): string {
    return homeFilterTabClass({
      accent: "groups",
      active: this.isGroupsTabActive(),
      hasSubRow: true,
    });
  }

  groupsPreviewStatus(): InfoGroupsPreviewStatus {
    return groupsPreviewStatusFromFilter(this.previewFilter);
  }

  personalTabClass(): string {
    return homeFilterTabClass({
      accent: "personal",
      active: this.previewFilter === "personal",
      hasSubRow: true,
    });
  }

  memorizeTabClass(): string {
    return homeFilterTabClass({
      accent: "memorize",
      active: isMemorizePreviewFilter(this.previewFilter),
      hasSubRow: true,
    });
  }

  memorizePanelGroupClass(): string {
    return HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS;
  }

  memorizeChipClass(active: boolean): string {
    const theme = HOME_MEMORIZE_PANEL_CHIP_THEMES;
    return buildHomeSubFilterChipButtonClass({
      base: this.chipButtonClass,
      active,
      activeClass: theme.active,
      inactiveClass: theme.inactive,
    });
  }

  subFilterChipClass(
    filter: "current" | "answered" | "archived" | "total" | "prompts"
  ): string {
    const theme = this.chipThemes[filter];
    const active = this.previewFilter === filter;
    return buildHomeSubFilterChipButtonClass({
      base: this.chipButtonClass,
      active,
      activeClass: theme.active,
      inactiveClass: theme.inactive,
    });
  }

  selectPublicPreviewTab(): void {
    if (!isPublicPreviewFilter(this.previewFilter)) {
      this.previewFilterChange.emit("current");
    }
  }

  setPreviewFilter(filter: InfoPreviewFilter): void {
    this.previewFilterChange.emit(filter);
  }

  selectGroupsPreviewTab(): void {
    if (!isGroupsAreaPreviewFilter(this.previewFilter)) {
      this.previewFilterChange.emit("groups-current");
    }
  }

  setGroupsStatus(status: InfoGroupsPreviewStatus): void {
    const filter: InfoPreviewFilter =
      status === "answered"
        ? "groups-answered"
        : status === "total"
          ? "groups-total"
          : "groups-current";
    this.previewFilterChange.emit(filter);
  }

  setSelectedGroupChip(chip: InfoPreviewMockGroupChip): void {
    this.selectedGroupChipChange.emit(chip);
  }
}
