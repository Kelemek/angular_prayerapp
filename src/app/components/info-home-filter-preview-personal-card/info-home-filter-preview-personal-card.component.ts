import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { InfoPersonalActionPreview } from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-home-filter-preview-personal-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-personal-card.component.html",
})
export class InfoHomeFilterPreviewPersonalCardComponent {
  @Output() openPersonalAction = new EventEmitter<InfoPersonalActionPreview>();
}
