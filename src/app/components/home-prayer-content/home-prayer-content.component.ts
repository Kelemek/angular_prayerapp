import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { Observable } from "rxjs";
import { PrayerCardComponent } from "../prayer-card/prayer-card.component";
import { PromptCardComponent } from "../prompt-card/prompt-card.component";
import { MemorizePassagesPanelComponent } from "../memorize-passages-panel/memorize-passages-panel.component";
import type { PrayerFilters } from "../prayer-filters/prayer-filters.component";
import type { PrayerPrompt } from "../prompt-card/prompt-card.component";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import type { AllowanceLevel } from "../../types/prayer";
import { PrayerService, PrayerRequest } from "../../services/prayer.service";
import { MemorizationService } from "../../services/memorization.service";
import { PrayerCardActionsFacade } from "../../services/prayer-card-actions.facade";
import { HomeCatalogStore } from "../../services/home-catalog.store";
import { HomeFilterCoordinator } from "../../services/home-filter.coordinator";
import { HomePersonalCategoryController } from "../../services/home-personal-category.controller";
import { HomeMemorizationPanelController } from "../../services/home-memorization-panel.controller";
import { HomeModalController } from "../../services/home-modal.controller";
import { HomePrayerCardActionsController } from "../../services/home-prayer-card-actions.controller";

export type HomePersonalCategoryPickerOpenChange = {
  prayerId: string;
  open: boolean;
};

@Component({
  selector: "app-home-prayer-content",
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    PrayerCardComponent,
    PromptCardComponent,
    MemorizePassagesPanelComponent,
  ],
  templateUrl: "./home-prayer-content.component.html",
})
export class HomePrayerContentComponent {
  @Input({ required: true }) viewReady!: boolean;
  @Input({ required: true }) activeFilter!: HomeActiveFilter;
  @Input({ required: true }) filters!: PrayerFilters;
  @Input({ required: true }) prayers$!: Observable<PrayerRequest[]>;
  @Input({ required: true }) prompts$!: Observable<PrayerPrompt[]>;
  @Input({ required: true }) loading$!: Observable<boolean>;
  @Input({ required: true }) error$!: Observable<string | null>;
  @Input({ required: true }) isAdmin$!: Observable<boolean>;
  @Input({ required: true }) deletionsAllowed!: AllowanceLevel;
  @Input({ required: true }) updatesAllowed!: AllowanceLevel;
  @Input({ required: true }) personalCategoryPickerPrayerId!: string | null;
  @Input({ required: true }) personalWalkthroughPrayerFor!: string;
  @Input({ required: true }) personalWalkthroughDescription!: string;

  @Output() personalCategoryPickerOpenChange =
    new EventEmitter<HomePersonalCategoryPickerOpenChange>();

  constructor(
    readonly prayerService: PrayerService,
    readonly memorizationService: MemorizationService,
    readonly catalog: HomeCatalogStore,
    readonly filter: HomeFilterCoordinator,
    readonly personalCategory: HomePersonalCategoryController,
    readonly memorizationPanel: HomeMemorizationPanelController,
    readonly modals: HomeModalController,
    readonly prayerCardActions: PrayerCardActionsFacade,
    readonly memberCardActions: HomePrayerCardActionsController
  ) {}

  onCategoryPickerOpenChange(prayerId: string, open: boolean): void {
    this.personalCategoryPickerOpenChange.emit({ prayerId, open });
  }
}
