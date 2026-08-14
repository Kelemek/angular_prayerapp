import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { PrayerRequest } from "../services/prayer.service";
import type { PersonalCategoryFilterMode } from "../types/presentation";
import type { HomeActiveFilter } from "../services/home-deep-link-host.adapter";

export interface HomeCatalogFilterState {
  activeFilter: HomeActiveFilter;
  searchTerm: string;
  personalCategoryFilterMode: PersonalCategoryFilterMode;
  selectedPersonalCategories: string[];
  selectedPromptTypes: string[];
}

function normalizeSearchTerm(searchTerm: string | undefined): string {
  return searchTerm?.trim().toLowerCase() ?? "";
}

function prayerMatchesSearch(prayer: PrayerRequest, searchLower: string): boolean {
  if (!searchLower) {
    return true;
  }
  const prayerMatch =
    prayer.prayer_for.toLowerCase().includes(searchLower) ||
    prayer.description.toLowerCase().includes(searchLower) ||
    prayer.title.toLowerCase().includes(searchLower);
  const updateMatch =
    prayer.updates?.some(
      (update) =>
        update.content && update.content.toLowerCase().includes(searchLower)
    ) ?? false;
  return prayerMatch || updateMatch;
}

export function filterPersonalPrayersForHome(
  prayers: PrayerRequest[],
  state: HomeCatalogFilterState
): PrayerRequest[] {
  const searchLower = normalizeSearchTerm(state.searchTerm);
  let filtered = searchLower
    ? prayers.filter((prayer) => prayerMatchesSearch(prayer, searchLower))
    : prayers;

  switch (state.personalCategoryFilterMode) {
    case "current":
      filtered = filtered.filter((p) => p.category !== "Answered");
      break;
    case "answered":
      filtered = filtered.filter((p) => p.category === "Answered");
      break;
    case "total":
      break;
    case "named":
      if (state.selectedPersonalCategories.length > 0) {
        filtered = filtered.filter(
          (p) => p.category && state.selectedPersonalCategories.includes(p.category)
        );
      }
      break;
    default: {
      const _exhaustive: never = state.personalCategoryFilterMode;
      return _exhaustive;
    }
  }

  return filtered;
}

export function filterPlanningCenterPrayersForHome(
  prayers: PrayerRequest[],
  searchTerm: string | undefined
): PrayerRequest[] {
  const searchLower = normalizeSearchTerm(searchTerm);
  if (!searchLower) {
    return prayers;
  }
  return prayers.filter((prayer) => prayerMatchesSearch(prayer, searchLower));
}

export function filterDisplayedPromptsForHome(
  prompts: PrayerPrompt[],
  state: HomeCatalogFilterState
): PrayerPrompt[] {
  if (state.activeFilter !== "prompts") {
    return [];
  }

  const searchLower = normalizeSearchTerm(state.searchTerm);
  let filtered = prompts;
  if (searchLower) {
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.type.toLowerCase().includes(searchLower)
    );
  }
  if (state.selectedPromptTypes.length > 0) {
    filtered = filtered.filter((p) => state.selectedPromptTypes.includes(p.type));
  }
  return filtered;
}

export function getUniquePromptTypes(prompts: PrayerPrompt[]): string[] {
  const seenTypes = new Set<string>();
  const orderedTypes: string[] = [];
  for (const prompt of prompts) {
    if (!seenTypes.has(prompt.type)) {
      seenTypes.add(prompt.type);
      orderedTypes.push(prompt.type);
    }
  }
  return orderedTypes;
}

export function getPromptCountByType(
  prompts: PrayerPrompt[],
  type: string
): number {
  return prompts.filter((p) => p.type === type).length;
}

export function buildPersonalCategoryCounts(
  prayers: PrayerRequest[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const prayer of prayers) {
    const category = prayer.category;
    if (!category) {
      continue;
    }
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}
