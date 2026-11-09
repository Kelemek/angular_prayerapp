import { Component, EventEmitter, Output } from "@angular/core";
import type { InfoPersonalActionPreview } from "../../lib/info-home-filter-preview.types";
import { InfoHomeFilterPreviewPrayerMockComponent } from "../info-home-filter-preview-prayer-mock/info-home-filter-preview-prayer-mock.component";

@Component({
  selector: "app-info-home-filter-preview-personal-card",
  standalone: true,
  imports: [InfoHomeFilterPreviewPrayerMockComponent],
  templateUrl: "./info-home-filter-preview-personal-card.component.html",
})
export class InfoHomeFilterPreviewPersonalCardComponent {
  @Output() openPersonalAction = new EventEmitter<InfoPersonalActionPreview>();
}
