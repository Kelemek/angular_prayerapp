import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { InfoHeaderPreviewAction } from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-home-filter-preview-public-current-panel",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-public-current-panel.component.html",
})
export class InfoHomeFilterPreviewPublicCurrentPanelComponent {
  @Output() openBadges = new EventEmitter<void>();
  @Output() openHeaderPreview = new EventEmitter<InfoHeaderPreviewAction>();
}
