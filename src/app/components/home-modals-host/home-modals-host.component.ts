import { Component, Input, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PrayerFormComponent } from "../prayer-form/prayer-form.component";
import { UserSettingsComponent } from "../user-settings/user-settings.component";
import { HelpModalComponent } from "../help-modal/help-modal.component";
import { PersonalPrayerEditModalComponent } from "../personal-prayer-edit-modal/personal-prayer-edit-modal.component";
import { PersonalPrayerUpdateEditModalComponent } from "../personal-prayer-update-edit-modal/personal-prayer-update-edit-modal.component";
import { PersonalCategoryRenameModalComponent } from "../personal-category-rename-modal/personal-category-rename-modal.component";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { AddMemorizedVerseModalComponent } from "../add-memorized-verse-modal/add-memorized-verse-modal.component";
import { AddMemorizedBibleBooksModalComponent } from "../add-memorized-bible-books-modal/add-memorized-bible-books-modal.component";
import { MemorizationRecommendationsModalComponent } from "../memorization-recommendations-modal/memorization-recommendations-modal.component";
import { MemorizationPracticeSessionComponent } from "../memorization-practice-session/memorization-practice-session.component";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import { HomeModalController } from "../../services/home-modal.controller";
import { HomePersonalCategoryController } from "../../services/home-personal-category.controller";
import { HomeMemorizationPanelController } from "../../services/home-memorization-panel.controller";
import { HomePlanningCenterController } from "../../services/home-planning-center.controller";
import { HomeHelpTourLauncher } from "../../services/home-help-tour.launcher";
import { MemorizationRecommendationsService } from "../../services/memorization-recommendations.service";

@Component({
  selector: "app-home-modals-host",
  standalone: true,
  imports: [
    CommonModule,
    PrayerFormComponent,
    UserSettingsComponent,
    HelpModalComponent,
    PersonalPrayerEditModalComponent,
    PersonalPrayerUpdateEditModalComponent,
    PersonalCategoryRenameModalComponent,
    ConfirmationDialogComponent,
    AddMemorizedVerseModalComponent,
    AddMemorizedBibleBooksModalComponent,
    MemorizationRecommendationsModalComponent,
    MemorizationPracticeSessionComponent,
  ],
  templateUrl: "./home-modals-host.component.html",
})
export class HomeModalsHostComponent {
  @Input({ required: true }) activeFilter!: HomeActiveFilter;

  @ViewChild("prayerFormComp") prayerFormComp?: PrayerFormComponent;

  constructor(
    readonly modals: HomeModalController,
    readonly personalCategory: HomePersonalCategoryController,
    readonly memorizationPanel: HomeMemorizationPanelController,
    readonly planningCenter: HomePlanningCenterController,
    readonly helpTour: HomeHelpTourLauncher,
    readonly memorizationRecommendationsService: MemorizationRecommendationsService
  ) {}
}
