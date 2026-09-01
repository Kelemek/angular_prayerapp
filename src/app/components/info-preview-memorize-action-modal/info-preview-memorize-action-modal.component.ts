import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";
import type { InfoMemorizeActionPreview } from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-preview-memorize-action-modal",
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: "./info-preview-memorize-action-modal.component.html",
})
export class InfoPreviewMemorizeActionModalComponent {
  @Input() previewAction: InfoMemorizeActionPreview | null = null;

  @Output() closeModal = new EventEmitter<void>();

  previewAriaLabel(): string {
    switch (this.previewAction) {
      case "add-verses":
        return "Explanation: Add Verses";
      case "bible-books":
        return "Explanation: Bible Books";
      case "recommended":
        return "Explanation: Recommended";
      case null:
        return "Explanation: Memorize";
      default: {
        const _exhaustive: never = this.previewAction;
        return _exhaustive;
      }
    }
  }
}
