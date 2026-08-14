import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";

@Component({
  selector: "app-info-preview-badges-modal",
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: "./info-preview-badges-modal.component.html",
})
export class InfoPreviewBadgesModalComponent {
  @Input() open = false;

  @Output() closeModal = new EventEmitter<void>();
}
