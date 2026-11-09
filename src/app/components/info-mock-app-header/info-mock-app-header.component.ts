import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { InfoHeaderPreviewAction } from "../../lib/info-home-filter-preview.types";
import {
  HOME_HEADER_CHIP_SIZE_LOCK_CLASS,
  HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS,
} from "../../lib/home-sub-filter-chip-classes";

@Component({
  selector: "app-info-mock-app-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-mock-app-header.component.html",
})
export class InfoMockAppHeaderComponent {
  readonly logoToolbarSlotClass = HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS;
  readonly headerChipClass =
    `flex items-center gap-1 px-2 py-2 sm:justify-center sm:h-12 sm:px-3 text-sm font-medium ${HOME_HEADER_CHIP_SIZE_LOCK_CLASS}`;
  readonly headerIconClass = "w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0";

  @Input() brandingImageUrl = "";
  @Input() showSearchPanel = false;

  @Output() openHeaderPreview = new EventEmitter<InfoHeaderPreviewAction>();
  @Output() toggleSearch = new EventEmitter<void>();
}
