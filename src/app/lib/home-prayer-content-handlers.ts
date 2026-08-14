import type { CdkDragDrop } from "@angular/cdk/drag-drop";
import type { PrayerRequest } from "../services/prayer.service";
import type { PrayerUpdate } from "../services/prayer.service";
import type {
  PrayerCardAddUpdateEvent,
  PrayerCardDeletionRequest,
  PrayerCardDeleteUpdateEvent,
  PrayerCardToggleAnsweredEvent,
  PrayerCardUpdateDeletionRequest,
} from "../services/prayer-card-actions.facade";
import type { MemorizedItem } from "../types/memorization";

/** Card, modal, filter, drag, and memorization actions wired from Home. */
export interface HomePrayerContentHandlers {
  deleteCard(prayer: PrayerRequest): void;
  deletePrompt(promptId: string): void;
  onCardAddUpdate(prayer: PrayerRequest, event: PrayerCardAddUpdateEvent): void;
  onCardDeleteUpdate(
    prayer: PrayerRequest,
    event: PrayerCardDeleteUpdateEvent
  ): void;
  requestDeletion(request: PrayerCardDeletionRequest): void;
  requestUpdateDeletion(request: PrayerCardUpdateDeletionRequest): void;
  editMemberUpdate(event: { update: PrayerUpdate; prayerId: string }): void;
  toggleMemberUpdateAnswered(event: PrayerCardToggleAnsweredEvent): void;
  editPersonalPrayer(prayer: PrayerRequest): void;
  editPersonalUpdate(event: { update: PrayerUpdate; prayerId: string }): void;
  togglePromptType(type: string): void;
  onPersonalPrayerDrop(event: CdkDragDrop<PrayerRequest[]>): void;
  openMemorizationAddVerses(): void;
  openMemorizationBibleBooks(): void;
  openMemorizationRecommendations(): void;
  openMemorizationPractice(item: MemorizedItem): void;
  confirmRemoveMemorizedItem(item: MemorizedItem): void;
}
