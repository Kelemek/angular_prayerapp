import { Injectable } from "@angular/core";
import {
  PrayerCardActionsFacade,
  type PrayerCardAddUpdateEvent,
} from "./prayer-card-actions.facade";
import type { PrayerRequest } from "./prayer.service";
import {
  isMemberPrayerId,
  memberPersonIdFromPrayerId,
} from "../lib/prayer-card-kind";
import { HomePlanningCenterController } from "./home-planning-center.controller";

@Injectable()
export class HomePrayerCardActionsController {
  constructor(
    private readonly prayerCardActions: PrayerCardActionsFacade,
    private readonly planningCenter: HomePlanningCenterController
  ) {}

  async toggleMemberUpdateAnswered(event: {
    updateId: string;
    prayerId: string;
    isAnswered: boolean;
  }): Promise<void> {
    const ok = await this.prayerCardActions.toggleMemberUpdateAnswered(event);
    if (ok) {
      await this.planningCenter.reloadMemberPrayerUpdates(
        memberPersonIdFromPrayerId(event.prayerId)
      );
    }
  }

  async onCardAddUpdate(
    prayer: PrayerRequest,
    event: PrayerCardAddUpdateEvent
  ): Promise<void> {
    const ok = await this.prayerCardActions.addUpdateForCard(prayer, event);
    if (ok && isMemberPrayerId(prayer.id)) {
      await this.planningCenter.reloadMemberPrayerUpdates(
        memberPersonIdFromPrayerId(prayer.id)
      );
    }
  }

  async onCardDeleteUpdate(
    prayer: PrayerRequest,
    event: { updateId: string; prayerId: string }
  ): Promise<void> {
    const ok = await this.prayerCardActions.deleteUpdateForCard(prayer, event);
    if (ok && isMemberPrayerId(prayer.id)) {
      await this.planningCenter.reloadMemberPrayerUpdates(
        memberPersonIdFromPrayerId(prayer.id)
      );
    }
  }
}
