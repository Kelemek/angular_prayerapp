import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";

@Component({
  selector: "app-info-preview-personal-categories-modal",
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: "./info-preview-personal-categories-modal.component.html",
})
export class InfoPreviewPersonalCategoriesModalComponent {
  @Input() open = false;

  @Output() closeModal = new EventEmitter<void>();
}
