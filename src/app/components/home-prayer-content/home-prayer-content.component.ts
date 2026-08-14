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
import { PrayerRequest } from "../../services/prayer.service";
import type { MemorizedItem } from "../../types/memorization";
import type { HomePrayerContentHandlers } from "../../lib/home-prayer-content-handlers";
import { HOME_SHELL_STACK_GAP_CLASSES } from "../../lib/home-shell-spacing";

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
  @Input({ required: true }) contentHidden!: boolean;
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
  @Input({ required: true }) filteredPersonalPrayers!: PrayerRequest[];
  @Input({ required: true }) filteredPlanningCenterPrayers!: PrayerRequest[];
  @Input({ required: true }) displayedPrompts!: PrayerPrompt[];
  @Input({ required: true }) loadingPersonalPrayers$!: Observable<boolean>;
  @Input({ required: true }) canReorderPersonalPrayers!: boolean;
  @Input({ required: true }) selectedPromptTypes!: string[];
  @Input({ required: true }) memorizedItems!: MemorizedItem[];
  @Input({ required: true }) memorizeLoading$!: Observable<boolean>;
  @Input({ required: true }) showAddMemorizedVerse!: boolean;
  @Input({ required: true }) showAddMemorizedBibleBooks!: boolean;
  @Input({ required: true }) showMemorizationRecommendations!: boolean;
  @Input({ required: true }) handlers!: HomePrayerContentHandlers;

  @Output() personalCategoryPickerOpenChange =
    new EventEmitter<HomePersonalCategoryPickerOpenChange>();

  readonly stackGapClass = HOME_SHELL_STACK_GAP_CLASSES;

  isPromptTypeSelected(type: string): boolean {
    return this.selectedPromptTypes.includes(type);
  }

  onCategoryPickerOpenChange(prayerId: string, open: boolean): void {
    this.personalCategoryPickerOpenChange.emit({ prayerId, open });
  }
}
