import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { PrayerRequest } from "../services/prayer.service";
import { filterPrayersByPresentationTimeFilter } from "./presentation-time-filter";
import type { PresentationTimeFilter } from "../types/presentation";

export type PresentationStatusFilters = {
  current: boolean;
  answered: boolean;
};

export function filterCommunityPrayersByStatus(
  prayers: PrayerRequest[],
  statusFilters: PresentationStatusFilters
): PrayerRequest[] {
  const statuses: PrayerRequest["status"][] = [];
  if (statusFilters.current) {
    statuses.push("current");
  }
  if (statusFilters.answered) {
    statuses.push("answered");
  }
  if (statuses.length === 0) {
    return prayers;
  }
  return prayers.filter((prayer) => statuses.includes(prayer.status));
}

export function filterPersonalPrayersByStatus(
  prayers: PrayerRequest[],
  statusFilters: PresentationStatusFilters
): PrayerRequest[] {
  const showCurrent = statusFilters.current;
  const showAnswered = statusFilters.answered;
  if (!showCurrent && !showAnswered) {
    return prayers;
  }
  return prayers.filter((prayer) => {
    const isAnswered = prayer.category === "Answered";
    return (showCurrent && !isAnswered) || (showAnswered && isAnswered);
  });
}

export function sortPrayersByLatestActivity(
  prayers: PrayerRequest[]
): PrayerRequest[] {
  return [...prayers]
    .map((prayer) => ({
      prayer,
      latestActivity: Math.max(
        new Date(prayer.created_at).getTime(),
        prayer.updates.length > 0
          ? Math.max(
              ...prayer.updates.map((update) =>
                new Date(update.created_at).getTime()
              )
            )
          : 0
      ),
    }))
    .sort((a, b) => b.latestActivity - a.latestActivity)
    .map(({ prayer }) => prayer);
}

export function filterPresentationPersonalPrayers(
  prayers: PrayerRequest[],
  options: {
    timeFilter: PresentationTimeFilter;
    statusFilters: PresentationStatusFilters;
    now?: Date;
  }
): PrayerRequest[] {
  let filtered = filterPrayersByPresentationTimeFilter(
    prayers,
    options.timeFilter,
    options.now
  );
  filtered = filterPersonalPrayersByStatus(filtered, options.statusFilters);
  return filtered;
}

export function filterPresentationCommunityPrayers(
  prayers: PrayerRequest[],
  options: {
    timeFilter: PresentationTimeFilter;
    statusFilters: PresentationStatusFilters;
    now?: Date;
  }
): PrayerRequest[] {
  let filtered = filterCommunityPrayersByStatus(prayers, options.statusFilters);
  filtered = filterPrayersByPresentationTimeFilter(
    filtered,
    options.timeFilter,
    options.now
  );
  return sortPrayersByLatestActivity(filtered);
}

export function filterPromptsByCategories(
  prompts: PrayerPrompt[],
  selectedCategories: string[]
): PrayerPrompt[] {
  if (selectedCategories.length === 0) {
    return prompts;
  }
  return prompts.filter((prompt) => selectedCategories.includes(prompt.type));
}

export function filterPersonalPrayersByCategories(
  prayers: PrayerRequest[],
  selectedCategories: string[]
): PrayerRequest[] {
  if (selectedCategories.length === 0) {
    return prayers;
  }
  return prayers.filter(
    (prayer) => prayer.category && selectedCategories.includes(prayer.category)
  );
}
