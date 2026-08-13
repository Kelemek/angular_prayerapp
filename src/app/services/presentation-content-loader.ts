import { Injectable } from "@angular/core";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import {
  filterPresentationCommunityPrayers,
  filterPresentationPersonalPrayers,
} from "../lib/presentation-content-filter";
import type { PresentationTimeFilter } from "../types/presentation";
import type { PrayerRequest } from "./prayer.service";
import { PrayerService } from "./prayer.service";
import { PromptService } from "./prompt.service";

export type PresentationContentStatusFilters = {
  current: boolean;
  answered: boolean;
};

export type PlanningCenterListMember = {
  id: string;
  name: string;
  avatar?: string | null;
};

@Injectable()
export class PresentationContentLoader {
  constructor(
    private readonly prayerService: PrayerService,
    private readonly promptService: PromptService
  ) {}

  async loadCommunityPrayers(options: {
    statusFilters: PresentationContentStatusFilters;
    timeFilter: PresentationTimeFilter;
    now?: Date;
  }): Promise<PrayerRequest[]> {
    await this.prayerService.loadPrayers();
    const snapshot = this.prayerService.getAllCommunityPrayersSnapshot();
    return filterPresentationCommunityPrayers(snapshot, options);
  }

  async loadPersonalPrayers(options: {
    statusFilters: PresentationContentStatusFilters;
    timeFilter: PresentationTimeFilter;
    now?: Date;
  }): Promise<PrayerRequest[]> {
    await this.prayerService.loadPersonalPrayers();
    const snapshot = this.prayerService.getPersonalPrayersSnapshot();
    return filterPresentationPersonalPrayers(snapshot, options);
  }

  async loadMemberPrayers(
    members: PlanningCenterListMember[]
  ): Promise<PrayerRequest[]> {
    if (members.length === 0) {
      return [];
    }

    const personIds = members.map((member) => member.id);
    const memberCountsMap =
      await this.prayerService.getMemberPrayedForCountsBatch(personIds);

    return Promise.all(
      members.map(async (member) => {
        const createdAt = new Date().toISOString();
        const updates = await this.prayerService.getMemberPrayerUpdates(
          member.id
        );
        const prayer: PrayerRequest = {
          id: `pc-member-${member.id}`,
          prayer_for: member.name,
          title: member.name,
          description: "",
          requester: member.name,
          status: "current",
          created_at: createdAt,
          date_requested: createdAt,
          updated_at: createdAt,
          approval_status: "approved",
          updates: updates || [],
          prayer_image: member.avatar,
          prayed_for_count: memberCountsMap[member.id] ?? 0,
        };
        return prayer;
      })
    );
  }

  async loadPrompts(): Promise<{
    prompts: PrayerPrompt[];
    categories: string[];
  }> {
    await this.promptService.loadPrompts();
    return {
      prompts: this.promptService.getPromptsSnapshot(),
      categories: this.promptService.getActivePromptCategories(),
    };
  }
}
