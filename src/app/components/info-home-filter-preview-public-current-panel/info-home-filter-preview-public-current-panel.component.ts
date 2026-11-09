import { Component, EventEmitter, Output } from "@angular/core";
import type { InfoHeaderPreviewAction } from "../../lib/info-home-filter-preview.types";
import type { PrayerUpdateRecord } from "../../lib/prayer-update-header";
import { InfoHomeFilterPreviewPrayerMockComponent } from "../info-home-filter-preview-prayer-mock/info-home-filter-preview-prayer-mock.component";
import { PrayerUpdateRowComponent } from "../prayer-update-row/prayer-update-row.component";

@Component({
  selector: "app-info-home-filter-preview-public-current-panel",
  standalone: true,
  imports: [InfoHomeFilterPreviewPrayerMockComponent, PrayerUpdateRowComponent],
  templateUrl: "./info-home-filter-preview-public-current-panel.component.html",
})
export class InfoHomeFilterPreviewPublicCurrentPanelComponent {
  @Output() openBadges = new EventEmitter<void>();
  @Output() openHeaderPreview = new EventEmitter<InfoHeaderPreviewAction>();

  readonly sampleUpdate: PrayerUpdateRecord = {
    id: "info-mock-update-1",
    content:
      "Prayer updates let you share progress, answered prayers, or new developments with the community. Click Add Update on a request to post one. You can also mark a prayer as answered from an update.",
    author: "Someone",
    created_at: "2025-01-10T14:00:00.000Z",
  };
}
