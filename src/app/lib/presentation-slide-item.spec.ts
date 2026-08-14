import { describe, expect, it } from "vitest";
import {
  isPresentationPrayer,
  prayerFromSlideItem,
  promptFromSlideItem,
} from "./presentation-slide-item";

describe("presentation-slide-item", () => {
  it("isPresentationPrayer and promptFromSlideItem discriminate deck items", () => {
    const prayer = { id: "p1", prayer_for: "A", updates: [] } as const;
    const prompt = { id: "pr1", type: "Morning" } as const;

    expect(isPresentationPrayer(prayer)).toBe(true);
    expect(isPresentationPrayer(prompt)).toBe(false);
    expect(prayerFromSlideItem(prayer)).toBe(prayer);
    expect(promptFromSlideItem(prompt)).toBe(prompt);
    expect(prayerFromSlideItem(prompt)).toBeNull();
    expect(promptFromSlideItem(prayer)).toBeNull();
  });
});
