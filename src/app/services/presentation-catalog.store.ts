import { Injectable } from "@angular/core";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import {
  filterPersonalPrayersByCategories,
  filterPromptsByCategories,
} from "../lib/presentation-content-filter";
import {
  includesPresentationContentType,
  type SelectablePresentationContentType,
} from "../types/presentation";
import type { PrayerRequest } from "./prayer.service";

export type PresentationSlideItem = PrayerRequest | PrayerPrompt;

export interface PresentationVisibleItemsOptions {
  contentTypes: SelectablePresentationContentType[];
  randomize: boolean;
  selectedPersonalCategories: string[];
  selectedPromptCategories: string[];
}

export function isPresentationPrompt(
  item: PresentationSlideItem | null | undefined
): item is PrayerPrompt {
  return !!item && "type" in item && !("prayer_for" in item);
}

/**
 * Slide catalog lists for presentation mode. Owns list mutation helpers so the
 * page component stays a shell (fetch, play, settings).
 */
@Injectable()
export class PresentationCatalogStore {
  prayers: PrayerRequest[] = [];
  prompts: PrayerPrompt[] = [];
  personalPrayers: PrayerRequest[] = [];
  memberPrayers: PrayerRequest[] = [];
  combinedShuffledItems: PresentationSlideItem[] = [];

  /**
   * Confirmed slide Pray For tallies before PromptService emits. Cleared on
   * session email change so logout / account switch cannot Math.max stale counts.
   */
  readonly promptPrayedForFloors = new Map<string, number>();

  mapLists(
    mapItem: (item: PresentationSlideItem) => PresentationSlideItem
  ): void {
    const mapList = <T extends PresentationSlideItem>(list: T[]): T[] => {
      let changed = false;
      const next = list.map((item) => {
        const mapped = mapItem(item) as T;
        if (mapped !== item) {
          changed = true;
        }
        return mapped;
      });
      return changed ? next : list;
    };

    this.prayers = mapList(this.prayers);
    this.personalPrayers = mapList(this.personalPrayers);
    this.memberPrayers = mapList(this.memberPrayers);
    this.prompts = mapList(this.prompts);
    this.combinedShuffledItems = mapList(this.combinedShuffledItems);
  }

  patchItem(
    id: string,
    patch: Partial<PrayerRequest> & Partial<PrayerPrompt>
  ): void {
    this.mapLists((item) =>
      item.id === id ? ({ ...item, ...patch } as PresentationSlideItem) : item
    );
  }

  removeItem(id: string): void {
    this.prayers = this.prayers.filter((p) => p.id !== id);
    this.personalPrayers = this.personalPrayers.filter((p) => p.id !== id);
    this.memberPrayers = this.memberPrayers.filter((p) => p.id !== id);
    this.prompts = this.prompts.filter((p) => p.id !== id);
    this.combinedShuffledItems = this.combinedShuffledItems.filter(
      (p) => p.id !== id
    );
    this.promptPrayedForFloors.delete(id);
  }

  /** Keep a higher local Pray For tally across prayer refetches (shared counts). */
  applyLivePrayedForFloor<T extends { id: string; prayed_for_count?: number }>(
    previous: T[],
    next: T[]
  ): T[] {
    if (!previous.length) {
      return next;
    }
    const previousCounts = new Map(
      previous.map((item) => [item.id, item.prayed_for_count ?? 0] as const)
    );
    return next.map((item) => {
      const floor = previousCounts.get(item.id);
      if (floor === undefined) {
        return item;
      }
      const incoming = item.prayed_for_count ?? 0;
      return incoming >= floor ? item : { ...item, prayed_for_count: floor };
    });
  }

  setPromptPrayedForFloor(promptId: string, count: number): void {
    this.promptPrayedForFloors.set(promptId, count);
  }

  clearPromptPrayedForFloors(): void {
    this.promptPrayedForFloors.clear();
  }

  /**
   * Mirror PromptService prompt list into the slide catalog. Floors protect a
   * confirmed slide tally until the service catches up; session clears floors.
   */
  syncPromptsFromService(incoming: PrayerPrompt[]): void {
    const withFloors = incoming.map((prompt) => this.applyPromptFloor(prompt));
    const byId = new Map(withFloors.map((prompt) => [prompt.id, prompt] as const));
    this.prompts = withFloors;
    this.combinedShuffledItems = this.combinedShuffledItems
      .map((item) => {
        if (!isPresentationPrompt(item)) {
          return item;
        }
        return byId.get(item.id);
      })
      .filter((item): item is PresentationSlideItem => item !== undefined);
  }

  private applyPromptFloor(prompt: PrayerPrompt): PrayerPrompt {
    const floor = this.promptPrayedForFloors.get(prompt.id);
    if (floor === undefined) {
      return prompt;
    }
    const incomingCount = prompt.prayed_for_count ?? 0;
    const next = Math.max(incomingCount, floor);
    return next === incomingCount ? prompt : { ...prompt, prayed_for_count: next };
  }

  buildVisibleItems(options: PresentationVisibleItemsOptions): PresentationSlideItem[] {
    const {
      contentTypes,
      selectedPersonalCategories,
      selectedPromptCategories,
    } = options;

    if (contentTypes.length === 1) {
      const only = contentTypes[0];
      if (only === "prayers") {
        return this.prayers;
      }
      if (only === "prompts") {
        return filterPromptsByCategories(this.prompts, selectedPromptCategories);
      }
      if (only === "personal") {
        return filterPersonalPrayersByCategories(
          this.personalPrayers,
          selectedPersonalCategories
        );
      }
      if (only === "members") {
        return this.memberPrayers;
      }
    }

    const combined: PresentationSlideItem[] = [];
    if (includesPresentationContentType(contentTypes, "prayers")) {
      combined.push(...this.prayers);
    }
    if (includesPresentationContentType(contentTypes, "prompts")) {
      combined.push(
        ...filterPromptsByCategories(this.prompts, selectedPromptCategories)
      );
    }
    if (includesPresentationContentType(contentTypes, "personal")) {
      combined.push(
        ...filterPersonalPrayersByCategories(
          this.personalPrayers,
          selectedPersonalCategories
        )
      );
    }
    if (includesPresentationContentType(contentTypes, "members")) {
      combined.push(...this.memberPrayers);
    }
    return combined;
  }

  /** Active slide deck: shuffled cache for multi-type randomize, else fresh build. */
  getVisibleItems(options: PresentationVisibleItemsOptions): PresentationSlideItem[] {
    if (
      options.randomize &&
      options.contentTypes.length !== 1 &&
      this.combinedShuffledItems.length > 0
    ) {
      return this.combinedShuffledItems;
    }
    return this.buildVisibleItems(options);
  }

  shuffleVisibleItems(
    options: PresentationVisibleItemsOptions,
    shuffle: <T>(items: T[]) => T[]
  ): void {
    if (options.contentTypes.length === 1) {
      const only = options.contentTypes[0];
      if (only === "prayers") {
        this.prayers = shuffle([...this.prayers]);
      } else if (only === "prompts") {
        this.prompts = shuffle([...this.prompts]);
      } else if (only === "personal") {
        this.personalPrayers = shuffle([...this.personalPrayers]);
      } else if (only === "members") {
        this.memberPrayers = shuffle([...this.memberPrayers]);
      }
      return;
    }

    this.combinedShuffledItems = shuffle(this.buildVisibleItems(options));
  }
}
