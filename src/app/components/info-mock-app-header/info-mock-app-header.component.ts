import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { InfoHeaderPreviewAction } from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-mock-app-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-mock-app-header.component.html",
})
export class InfoMockAppHeaderComponent {
  @Input() brandingImageUrl = "";
  @Input() showSearchPanel = false;

  @Output() openHeaderPreview = new EventEmitter<InfoHeaderPreviewAction>();
  @Output() toggleSearch = new EventEmitter<void>();
}
