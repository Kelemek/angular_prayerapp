import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";

@Component({
  selector: "app-info-preview-prompt-categories-modal",
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: "./info-preview-prompt-categories-modal.component.html",
})
export class InfoPreviewPromptCategoriesModalComponent {
  @Input() open = false;

  @Output() closeModal = new EventEmitter<void>();
}
