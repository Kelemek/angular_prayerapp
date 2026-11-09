import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import type {
  InfoGroupsPreviewStatus,
  InfoPreviewMockGroupChip,
} from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-home-filter-preview-groups-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-groups-card.component.html",
})
export class InfoHomeFilterPreviewGroupsCardComponent {
  @Input() status: InfoGroupsPreviewStatus = "current";
  @Input() selectedGroupChip: InfoPreviewMockGroupChip = "larson";

  groupLabel(): string {
    return this.selectedGroupChip === "larson" ? "Larson Family" : "Care Team";
  }

  statusLabel(): string {
    switch (this.status) {
      case "answered":
        return "Answered";
      case "total":
        return "All requests";
      default:
        return "Current";
    }
  }
}
