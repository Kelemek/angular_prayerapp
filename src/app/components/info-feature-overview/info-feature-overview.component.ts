import { Component, EventEmitter, Input, Output } from "@angular/core";
import { InfoHomeFilterPreviewTabsComponent } from "../info-home-filter-preview-tabs/info-home-filter-preview-tabs.component";
import { InfoHomeFilterPreviewPanelsComponent } from "../info-home-filter-preview-panels/info-home-filter-preview-panels.component";
import { InfoMockAppHeaderComponent } from "../info-mock-app-header/info-mock-app-header.component";
import { InfoMockSearchBarComponent } from "../info-mock-search-bar/info-mock-search-bar.component";
import type {
  InfoPreviewFilter,
  InfoPreviewModalState,
  InfoPreviewMockGroupChip,
} from "../../lib/info-home-filter-preview.types";
import { isGroupsAreaPreviewFilter } from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-feature-overview",
  standalone: true,
  imports: [
    InfoHomeFilterPreviewTabsComponent,
    InfoHomeFilterPreviewPanelsComponent,
    InfoMockAppHeaderComponent,
    InfoMockSearchBarComponent,
  ],
  templateUrl: "./info-feature-overview.component.html",
  styleUrl: "./info-feature-overview.component.css",
})
export class InfoFeatureOverviewComponent {
  @Input() brandingImageUrl = "";
  @Output() openPreviewModal = new EventEmitter<InfoPreviewModalState>();

  previewFilter: InfoPreviewFilter = "current";
  showSearchPanel = false;
  selectedGroupChip: InfoPreviewMockGroupChip = "larson";
  private groupsTabOpenedOnce = false;

  onPreviewFilterChange(next: InfoPreviewFilter): void {
    const enteringGroups =
      isGroupsAreaPreviewFilter(next) && !isGroupsAreaPreviewFilter(this.previewFilter);
    this.previewFilter = next;
    if (enteringGroups && !this.groupsTabOpenedOnce) {
      this.groupsTabOpenedOnce = true;
      this.openPreviewModal.emit({ kind: "groups" });
    }
  }
}
