import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { isCommunityPrayerFilter } from "../../lib/home-community-filter";
import {
  HOME_SUB_FILTER_CHIP_BASE_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";

export type InfoHeaderPreviewAction =
  | "help"
  | "settings"
  | "pray"
  | "request"
  | "search"
  | "card-update"
  | "card-pray-for";

export type InfoPersonalActionPreview = "answered" | "edit" | "delete";

@Component({
  selector: "app-info-home-filter-preview",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview.component.html",
})
export class InfoHomeFilterPreviewComponent {
  previewFilter: "current" | "answered" | "total" | "prompts" | "personal" =
    "current";

  readonly subFilterChipBaseClass = HOME_SUB_FILTER_CHIP_BASE_CLASS;
  readonly subFilterChipWrapClass = HOME_SUB_FILTER_CHIP_WRAP_CLASS;

  @Output() openBadges = new EventEmitter<void>();
  @Output() openPromptCategories = new EventEmitter<void>();
  @Output() openPersonalCategories = new EventEmitter<void>();
  @Output() openPersonalAction = new EventEmitter<InfoPersonalActionPreview>();
  @Output() openHeaderPreview = new EventEmitter<InfoHeaderPreviewAction>();

  isCommunityPreviewFilter(): boolean {
    return isCommunityPrayerFilter(this.previewFilter as HomeActiveFilter);
  }

  selectPublicPreviewTab(): void {
    if (!this.isCommunityPreviewFilter()) {
      this.previewFilter = "current";
    }
  }
}
