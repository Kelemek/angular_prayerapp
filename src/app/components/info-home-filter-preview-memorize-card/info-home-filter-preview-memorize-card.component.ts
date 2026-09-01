import { Component, EventEmitter, Output } from "@angular/core";

@Component({
  selector: "app-info-home-filter-preview-memorize-card",
  standalone: true,
  templateUrl: "./info-home-filter-preview-memorize-card.component.html",
})
export class InfoHomeFilterPreviewMemorizeCardComponent {
  @Output() openPracticePreview = new EventEmitter<void>();
}
