import type { PrayerRequest, PrayerUpdate } from "../services/prayer.service";
import type { HelpSection } from "../types/help-content";
import type {
  MemorizationInProgressSavePayload,
  MemorizationRecommendation,
  MemorizedItem,
} from "../types/memorization";

export interface HomeModalsHostHandlers {
  onPrayerFormClose(): void;
  closeUserSettings(): void;
  onSettingsScrollToSectionComplete(): void;
  closeHelp(): void;
  startHelpSectionTour(section: HelpSection): void;
  startFullGuidedTour(sections: HelpSection[]): void;
  handleLogout(): void;
  cancelLogout(): void;
  closeEditPersonalPrayer(): void;
  onPersonalPrayerSaved(): void;
  closeRenamePersonalCategory(): void;
  saveRenamedPersonalCategory(name: string): void;
  closeEditPersonalUpdate(): void;
  onPersonalUpdateSaved(): void;
  closeEditMemberUpdate(): void;
  onMemberUpdateSaved(): void;
  closeAddMemorizedVerse(): void;
  onMemorizedVerseAdded(): void;
  closeAddMemorizedBibleBooks(): void;
  closeMemorizationRecommendations(): void;
  addRecommendedVerse(rec: MemorizationRecommendation): void;
  closeMemorizationPractice(): void;
  onMemorizationPracticeComplete(result: {
    wrongAttempts: number;
    correctKeystrokes: number;
    completed: boolean;
  }): void;
  onMemorizationPersistInProgress(
    payload: MemorizationInProgressSavePayload
  ): void;
  onMemorizationClearInProgress(): void;
  openSettingsFromReciteFeedback(): void;
  confirmRemoveMemorizedItem(): void;
  cancelRemoveMemorizedItem(): void;
}

export type HomeModalsHostEditingPrayer = PrayerRequest | null;
export type HomeModalsHostEditingUpdate = PrayerUpdate | null;
