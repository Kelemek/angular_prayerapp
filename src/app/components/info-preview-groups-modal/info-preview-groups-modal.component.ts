import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";

@Component({
  selector: "app-info-preview-groups-modal",
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: "./info-preview-groups-modal.component.html",
})
export class InfoPreviewGroupsModalComponent {
  @Input() open = false;

  @Output() closeModal = new EventEmitter<void>();
}
