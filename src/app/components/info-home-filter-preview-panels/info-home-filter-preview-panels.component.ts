import { Component, EventEmitter, Input, Output } from "@angular/core";
import { InfoHomeFilterPreviewPublicCurrentPanelComponent } from "../info-home-filter-preview-public-current-panel/info-home-filter-preview-public-current-panel.component";
import { InfoHomeFilterPreviewPublicAnsweredPanelComponent } from "../info-home-filter-preview-public-answered-panel/info-home-filter-preview-public-answered-panel.component";
import { InfoHomeFilterPreviewPublicArchivedPanelComponent } from "../info-home-filter-preview-public-archived-panel/info-home-filter-preview-public-archived-panel.component";
import { InfoHomeFilterPreviewPublicTotalPanelComponent } from "../info-home-filter-preview-public-total-panel/info-home-filter-preview-public-total-panel.component";
import { InfoHomeFilterPreviewPromptsCardComponent } from "../info-home-filter-preview-prompts-card/info-home-filter-preview-prompts-card.component";
import { InfoHomeFilterPreviewPersonalCardComponent } from "../info-home-filter-preview-personal-card/info-home-filter-preview-personal-card.component";
import { InfoHomeFilterPreviewMemorizeCardComponent } from "../info-home-filter-preview-memorize-card/info-home-filter-preview-memorize-card.component";
import type {
  InfoHeaderPreviewAction,
  InfoPersonalActionPreview,
  InfoPreviewFilter,
} from "../../lib/info-home-filter-preview.types";

@Component({
  selector: "app-info-home-filter-preview-panels",
  standalone: true,
  imports: [
    InfoHomeFilterPreviewPublicCurrentPanelComponent,
    InfoHomeFilterPreviewPublicAnsweredPanelComponent,
    InfoHomeFilterPreviewPublicArchivedPanelComponent,
    InfoHomeFilterPreviewPublicTotalPanelComponent,
    InfoHomeFilterPreviewPromptsCardComponent,
    InfoHomeFilterPreviewPersonalCardComponent,
    InfoHomeFilterPreviewMemorizeCardComponent,
  ],
  templateUrl: "./info-home-filter-preview-panels.component.html",
})
export class InfoHomeFilterPreviewPanelsComponent {
  @Input() previewFilter: InfoPreviewFilter = "current";

  @Output() openBadges = new EventEmitter<void>();
  @Output() openPersonalAction = new EventEmitter<InfoPersonalActionPreview>();
  @Output() openHeaderPreview = new EventEmitter<InfoHeaderPreviewAction>();
  @Output() openMemorizePractice = new EventEmitter<void>();
}
