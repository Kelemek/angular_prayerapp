import { Component, Input, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
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
import { VerseMemorizationTranslationModalComponent } from "../verse-memorization-translation-modal/verse-memorization-translation-modal.component";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import type { PrayerRequest, PrayerUpdate } from "../../services/prayer.service";
import type {
  BibleTranslation,
  MemorizationRecommendationCategoryGroup,
  MemorizedItem,
} from "../../types/memorization";
import type { HomeModalsHostHandlers } from "../../lib/home-modals-host-handlers";

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
    VerseMemorizationTranslationModalComponent,
  ],
  templateUrl: "./home-modals-host.component.html",
})
export class HomeModalsHostComponent {
  @Input({ required: true }) activeFilter!: HomeActiveFilter;
  @Input({ required: true }) showPrayerForm!: boolean;
  @Input({ required: true }) showSettings!: boolean;
  @Input({ required: true }) settingsScrollToSectionId!: string | null;
  @Input({ required: true }) showHelp!: boolean;
  @Input({ required: true }) showLogoutConfirmation!: boolean;
  @Input({ required: true }) showEditPersonalPrayer!: boolean;
  @Input({ required: true }) editingPrayer!: PrayerRequest | null;
  @Input({ required: true }) showRenamePersonalCategory!: boolean;
  @Input({ required: true }) renamingPersonalCategory!: string | null;
  @Input({ required: true }) personalCategoryRenameDeferInputFocus!: boolean;
  @Input({ required: true }) isRenamingPersonalCategory!: boolean;
  @Input({ required: true }) showEditPersonalUpdate!: boolean;
  @Input({ required: true }) editingUpdate!: PrayerUpdate | null;
  @Input({ required: true }) editingUpdatePrayerId!: string;
  @Input({ required: true }) showEditMemberUpdate!: boolean;
  @Input({ required: true }) editingMemberUpdate!: PrayerUpdate | null;
  @Input({ required: true }) editingMemberUpdatePrayerId!: string;
  @Input({ required: true }) planningCenterListId!: string | null;
  @Input({ required: true }) showAddMemorizedVerse!: boolean;
  @Input({ required: true }) showAddMemorizedBibleBooks!: boolean;
  @Input({ required: true }) showMemorizationRecommendations!: boolean;
  @Input({ required: true })
  memorizationRecommendationGroups!: MemorizationRecommendationCategoryGroup[];
  @Input({ required: true })
  memorizationRecommendationOwnedKeys!: Set<string>;
  @Input({ required: true }) addingRecommendationId!: string | null;
  @Input({ required: true })
  memorizationRecommendationsLoading$!: Observable<boolean>;
  @Input({ required: true }) practiceMemorizedItem!: MemorizedItem | null;
  @Input({ required: true }) showRemoveMemorizedConfirm!: boolean;
  @Input({ required: true }) memorizedItemToRemove!: MemorizedItem | null;
  @Input({ required: true }) showVerseMemorizationTranslationModal!: boolean;
  @Input({ required: true }) pendingVerseMemorizationReference!: string | null;
  @Input() pendingVerseMemorizationSuggestedTranslation: BibleTranslation | null =
    null;
  @Input({ required: true }) handlers!: HomeModalsHostHandlers;

  @ViewChild("prayerFormComp") prayerFormComp?: PrayerFormComponent;
}
