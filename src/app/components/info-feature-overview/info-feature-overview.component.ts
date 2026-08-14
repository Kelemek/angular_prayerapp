import { Component, Input } from "@angular/core";
import { InfoHomeFilterPreviewTabsComponent } from "../info-home-filter-preview-tabs/info-home-filter-preview-tabs.component";
import { InfoHomeFilterPreviewPanelsComponent } from "../info-home-filter-preview-panels/info-home-filter-preview-panels.component";
import { InfoPreviewModalsComponent } from "../info-preview-modals/info-preview-modals.component";
import { InfoMockAppHeaderComponent } from "../info-mock-app-header/info-mock-app-header.component";
import { InfoMockSearchBarComponent } from "../info-mock-search-bar/info-mock-search-bar.component";
import type { InfoPreviewFilter } from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-feature-overview",
  standalone: true,
  imports: [
    InfoHomeFilterPreviewTabsComponent,
    InfoHomeFilterPreviewPanelsComponent,
    InfoPreviewModalsComponent,
    InfoMockAppHeaderComponent,
    InfoMockSearchBarComponent,
  ],
  templateUrl: "./info-feature-overview.component.html",
  styleUrl: "./info-feature-overview.component.css",
})
export class InfoFeatureOverviewComponent {
  @Input() brandingImageUrl = "";
  previewFilter: InfoPreviewFilter = "current";
}
