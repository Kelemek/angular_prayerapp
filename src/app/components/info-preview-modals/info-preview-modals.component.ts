import { ChangeDetectorRef, Component, inject } from "@angular/core";
import type {
  InfoHeaderPreviewAction,
  InfoMemorizeActionPreview,
  InfoPersonalActionPreview,
  InfoPreviewModalState,
} from "../../lib/info-home-filter-preview.types";
import { InfoPreviewHeaderModalComponent } from "../info-preview-header-modal/info-preview-header-modal.component";
import { InfoPreviewPromptCategoriesModalComponent } from "../info-preview-prompt-categories-modal/info-preview-prompt-categories-modal.component";
import { InfoPreviewBadgesModalComponent } from "../info-preview-badges-modal/info-preview-badges-modal.component";
import { InfoPreviewPersonalActionModalComponent } from "../info-preview-personal-action-modal/info-preview-personal-action-modal.component";
import { InfoPreviewPersonalCategoriesModalComponent } from "../info-preview-personal-categories-modal/info-preview-personal-categories-modal.component";
import { InfoPreviewMemorizeActionModalComponent } from "../info-preview-memorize-action-modal/info-preview-memorize-action-modal.component";
import { InfoPreviewMemorizePracticeModalComponent } from "../info-preview-memorize-practice-modal/info-preview-memorize-practice-modal.component";

@Component({
  selector: "app-info-preview-modals",
  standalone: true,
  imports: [
    InfoPreviewHeaderModalComponent,
    InfoPreviewPromptCategoriesModalComponent,
    InfoPreviewBadgesModalComponent,
    InfoPreviewPersonalActionModalComponent,
    InfoPreviewPersonalCategoriesModalComponent,
    InfoPreviewMemorizeActionModalComponent,
    InfoPreviewMemorizePracticeModalComponent,
  ],
  templateUrl: "./info-preview-modals.component.html",
})
export class InfoPreviewModalsComponent {
  activeModal: InfoPreviewModalState | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  openModal(state: InfoPreviewModalState): void {
    this.activeModal = state;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.activeModal = null;
    this.cdr.detectChanges();
  }

  headerAction(): InfoHeaderPreviewAction | null {
    const modal = this.activeModal;
    return modal?.kind === "header" ? modal.action : null;
  }

  personalPreviewAction(): InfoPersonalActionPreview | null {
    const modal = this.activeModal;
    return modal?.kind === "personalAction" ? modal.action : null;
  }

  memorizePreviewAction(): InfoMemorizeActionPreview | null {
    const modal = this.activeModal;
    return modal?.kind === "memorizeAction" ? modal.action : null;
  }

  isModalOpen(kind: InfoPreviewModalState["kind"]): boolean {
    return this.activeModal?.kind === kind;
  }
}
