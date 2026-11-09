import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { InfoHomeFilterPreviewPrayerMockComponent } from "../info-home-filter-preview-prayer-mock/info-home-filter-preview-prayer-mock.component";
import type {
  InfoGroupsPreviewStatus,
  InfoPreviewMockGroupChip,
} from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-home-filter-preview-groups-card",
  standalone: true,
  imports: [CommonModule, InfoHomeFilterPreviewPrayerMockComponent],
  templateUrl: "./info-home-filter-preview-groups-card.component.html",
})
export class InfoHomeFilterPreviewGroupsCardComponent {
  @Input() status: InfoGroupsPreviewStatus = "current";
  @Input() selectedGroupChip: InfoPreviewMockGroupChip = "larson";

  groupLabel(): string {
    return this.selectedGroupChip === "larson" ? "Larson Family" : "Care Team";
  }

}
