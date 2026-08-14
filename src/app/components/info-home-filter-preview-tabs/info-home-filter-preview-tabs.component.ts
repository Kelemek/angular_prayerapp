import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  HOME_SUB_FILTER_CHIP_BASE_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import {
  isPublicPreviewFilter,
  type InfoPreviewFilter,
} from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-home-filter-preview-tabs",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-tabs.component.html",
})
export class InfoHomeFilterPreviewTabsComponent {
  @Input() previewFilter: InfoPreviewFilter = "current";
  @Output() previewFilterChange = new EventEmitter<InfoPreviewFilter>();
  @Output() openBadges = new EventEmitter<void>();

  readonly subFilterChipBaseClass = HOME_SUB_FILTER_CHIP_BASE_CLASS;
  readonly subFilterChipWrapClass = HOME_SUB_FILTER_CHIP_WRAP_CLASS;

  isPublicTabActive(): boolean {
    return isPublicPreviewFilter(this.previewFilter);
  }

  selectPublicPreviewTab(): void {
    if (!this.isPublicTabActive()) {
      this.previewFilterChange.emit("current");
    }
  }

  setPreviewFilter(filter: InfoPreviewFilter): void {
    this.previewFilterChange.emit(filter);
  }
}
