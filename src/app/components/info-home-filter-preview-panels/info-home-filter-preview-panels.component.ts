import { Component, EventEmitter, Input, Output } from "@angular/core";
import { InfoHomeFilterPreviewPublicCurrentPanelComponent } from "../info-home-filter-preview-public-current-panel/info-home-filter-preview-public-current-panel.component";
import { InfoHomeFilterPreviewPublicAnsweredPanelComponent } from "../info-home-filter-preview-public-answered-panel/info-home-filter-preview-public-answered-panel.component";
import { InfoHomeFilterPreviewPublicTotalPanelComponent } from "../info-home-filter-preview-public-total-panel/info-home-filter-preview-public-total-panel.component";
import { InfoHomeFilterPreviewPromptsFiltersComponent } from "../info-home-filter-preview-prompts-filters/info-home-filter-preview-prompts-filters.component";
import { InfoHomeFilterPreviewPromptsCardComponent } from "../info-home-filter-preview-prompts-card/info-home-filter-preview-prompts-card.component";
import { InfoHomeFilterPreviewPersonalFiltersComponent } from "../info-home-filter-preview-personal-filters/info-home-filter-preview-personal-filters.component";
import { InfoHomeFilterPreviewPersonalCardComponent } from "../info-home-filter-preview-personal-card/info-home-filter-preview-personal-card.component";
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
    InfoHomeFilterPreviewPublicTotalPanelComponent,
    InfoHomeFilterPreviewPromptsFiltersComponent,
    InfoHomeFilterPreviewPromptsCardComponent,
    InfoHomeFilterPreviewPersonalFiltersComponent,
    InfoHomeFilterPreviewPersonalCardComponent,
  ],
  templateUrl: "./info-home-filter-preview-panels.component.html",
})
export class InfoHomeFilterPreviewPanelsComponent {
  @Input() previewFilter: InfoPreviewFilter = "current";

  @Output() openBadges = new EventEmitter<void>();
  @Output() openPromptCategories = new EventEmitter<void>();
  @Output() openPersonalCategories = new EventEmitter<void>();
  @Output() openPersonalAction = new EventEmitter<InfoPersonalActionPreview>();
  @Output() openHeaderPreview = new EventEmitter<InfoHeaderPreviewAction>();
}
