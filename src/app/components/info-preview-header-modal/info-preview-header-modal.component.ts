import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";
import type { InfoHeaderPreviewAction } from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-preview-header-modal",
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: "./info-preview-header-modal.component.html",
})
export class InfoPreviewHeaderModalComponent {
  @Input() headerAction: InfoHeaderPreviewAction | null = null;

  @Output() closeModal = new EventEmitter<void>();
}
