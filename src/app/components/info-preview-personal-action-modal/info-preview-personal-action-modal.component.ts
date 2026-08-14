import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";
import type { InfoPersonalActionPreview } from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-preview-personal-action-modal",
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: "./info-preview-personal-action-modal.component.html",
})
export class InfoPreviewPersonalActionModalComponent {
  @Input() previewAction: InfoPersonalActionPreview | null = null;

  @Output() closeModal = new EventEmitter<void>();

  previewAriaLabel(): string {
    if (this.previewAction === "answered") return "Mark personal prayer answered";
    if (this.previewAction === "edit") return "Edit personal prayer";
    return "Delete personal prayer";
  }
}
