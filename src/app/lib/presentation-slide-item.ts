import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import {
  isPresentationPrompt,
  type PresentationSlideItem,
} from "../services/presentation-catalog.store";
import type { PrayerRequest } from "../services/prayer.service";

export function isPresentationPrayer(
  item: PresentationSlideItem | null | undefined
): item is PrayerRequest {
  return !!item && "prayer_for" in item;
}

export function prayerFromSlideItem(
  item: PresentationSlideItem | null | undefined
): PrayerRequest | null {
  return isPresentationPrayer(item) ? item : null;
}

export function promptFromSlideItem(
  item: PresentationSlideItem | null | undefined
): PrayerPrompt | null {
  return isPresentationPrompt(item) ? item : null;
}
