import { Injectable } from "@angular/core";
import { PrayerService, type PrayerUpdate } from "./prayer.service";
import { PromptService } from "./prompt.service";
import { ToastService } from "./toast.service";
import { UserSessionService } from "./user-session.service";
import { AdminAuthService } from "./admin-auth.service";
import { PlanningCenterListService } from "./planning-center-list.service";
import {
  getPrayerCardMutationKind,
  memberPersonIdFromPrayerId,
  type PrayerCardIdentity,
} from "../lib/prayer-card-kind";

export interface PrayerCardAddUpdateEvent {
  prayer_id: string;
  content: string;
  author: string;
  author_email: string;
  is_anonymous: boolean;
  mark_as_answered: boolean;
}

export interface PrayerCardDeleteUpdateEvent {
  updateId: string;
  prayerId: string;
}

export interface PrayerCardToggleAnsweredEvent {
  updateId: string;
  prayerId: string;
  isAnswered: boolean;
}

export interface PrayerCardDeletionRequest {
  prayer_id: string;
  requester_first_name: string;
  requester_last_name: string;
  requester_email: string;
  reason: string;
}

export interface PrayerCardUpdateDeletionRequest {
  update_id: string;
  requester_first_name: string;
  requester_last_name: string;
  requester_email: string;
  reason: string;
}

@Injectable({
  providedIn: "root",
})
export class PrayerCardActionsFacade {
  constructor(
    private prayerService: PrayerService,
    private promptService: PromptService,
    private toastService: ToastService,
    private userSessionService: UserSessionService,
    private adminAuthService: AdminAuthService,
    private planningCenterListService: PlanningCenterListService
  ) {}

  get isAdmin(): boolean {
    return this.adminAuthService.getIsAdmin();
  }

  deleteCard(prayer: PrayerCardIdentity): void {
    void this.deleteCardForCard(prayer);
  }

  async deleteCardForCard(prayer: PrayerCardIdentity): Promise<boolean> {
    try {
      const kind = getPrayerCardMutationKind(prayer);
      switch (kind) {
        case "personal":
          return await this.prayerService.deletePersonalPrayer(prayer.id);
        case "community":
          return await this.prayerService.deletePrayer(prayer.id);
        case "member":
          return false;
        default: {
          const _exhaustive: never = kind;
          return _exhaustive;
        }
      }
    } catch (error) {
      console.error("Error deleting prayer card:", error);
      this.toastService.error("Failed to delete prayer");
      return false;
    }
  }

  async addUpdateForCard(
    prayer: PrayerCardIdentity,
    updateData: PrayerCardAddUpdateEvent
  ): Promise<boolean> {
    try {
      const kind = getPrayerCardMutationKind(prayer);
      switch (kind) {
        case "member":
          return await this.addMemberUpdate(prayer.id, updateData);
        case "personal":
          return await this.addPersonalUpdate(updateData);
        case "community":
          await this.prayerService.addUpdate(updateData);
          return true;
        default: {
          const _exhaustive: never = kind;
          return _exhaustive;
        }
      }
    } catch (error) {
      console.error("Error adding update:", error);
      this.toastService.error("Failed to submit update");
      return false;
    }
  }

  async deleteUpdateForCard(
    prayer: PrayerCardIdentity,
    event: PrayerCardDeleteUpdateEvent
  ): Promise<boolean> {
    try {
      const kind = getPrayerCardMutationKind(prayer);
      switch (kind) {
        case "member":
          return await this.deleteMemberUpdate(event);
        case "personal": {
          const success =
            await this.prayerService.deletePersonalPrayerUpdate(event.updateId);
          return success;
        }
        case "community":
          await this.prayerService.deleteUpdate(event.updateId);
          return true;
        default: {
          const _exhaustive: never = kind;
          return _exhaustive;
        }
      }
    } catch (error) {
      console.error("Error deleting update:", error);
      this.toastService.error("Failed to delete update");
      return false;
    }
  }

  async requestDeletion(requestData: PrayerCardDeletionRequest): Promise<void> {
    try {
      await this.prayerService.requestDeletion(requestData);
    } catch (error) {
      console.error("Error requesting deletion:", error);
      this.toastService.error("Failed to submit deletion request");
    }
  }

  async requestUpdateDeletion(
    requestData: PrayerCardUpdateDeletionRequest
  ): Promise<void> {
    try {
      await this.prayerService.requestUpdateDeletion(requestData);
    } catch (error) {
      console.error("Error requesting update deletion:", error);
      this.toastService.error("Failed to submit update deletion request");
    }
  }

  async toggleMemberUpdateAnswered(
    event: PrayerCardToggleAnsweredEvent
  ): Promise<boolean> {
    try {
      const personId = memberPersonIdFromPrayerId(event.prayerId);
      const patch: Partial<PrayerUpdate> = { is_answered: event.isAnswered };
      const success = await this.prayerService.updateMemberPrayerUpdate(
        event.updateId,
        personId,
        patch,
        this.planningCenterListService.getCurrentListId() ?? undefined
      );
      return success;
    } catch (error) {
      console.error("Error toggling update answered status:", error);
      this.toastService.error("Failed to update answered status");
      return false;
    }
  }

  async deletePrompt(id: string): Promise<boolean> {
    return this.promptService.deletePrompt(id);
  }

  private async addMemberUpdate(
    prayerId: string,
    updateData: PrayerCardAddUpdateEvent
  ): Promise<boolean> {
    const personId = memberPersonIdFromPrayerId(prayerId);
    const member = this.planningCenterListService
      .getCurrentMembers()
      .find((m) => m.id === personId);

    if (!member) {
      console.error("Member not found for person_id:", personId);
      this.toastService.error("Member not found");
      return false;
    }

    const userSession = this.userSessionService.getCurrentSession();
    const author = userSession?.fullName || "Anonymous";
    const authorEmail = userSession?.email || "";

    return this.prayerService.addMemberPrayerUpdate(
      personId,
      member.name,
      updateData.content,
      author,
      authorEmail,
      updateData.mark_as_answered,
      this.planningCenterListService.getCurrentListId() ?? undefined
    );
  }

  private async addPersonalUpdate(
    updateData: PrayerCardAddUpdateEvent
  ): Promise<boolean> {
    const userSession = this.userSessionService.getCurrentSession();
    const author = userSession?.fullName || "Anonymous";
    const authorEmail = userSession?.email || "";

    const success = await this.prayerService.addPersonalPrayerUpdate(
      updateData.prayer_id,
      updateData.content,
      author,
      authorEmail,
      updateData.mark_as_answered
    );

    if (success && updateData.mark_as_answered) {
      await this.prayerService.updatePersonalPrayer(updateData.prayer_id, {
        category: "Answered",
      });
    }
    return success;
  }

  private async deleteMemberUpdate(
    event: PrayerCardDeleteUpdateEvent
  ): Promise<boolean> {
    const personId = memberPersonIdFromPrayerId(event.prayerId);
    return this.prayerService.deleteMemberPrayerUpdate(
      event.updateId,
      personId,
      this.planningCenterListService.getCurrentListId() ?? undefined
    );
  }
}
