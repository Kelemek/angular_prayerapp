import { describe, expect, it } from "vitest";
import {
  clampMemorizePracticeSlideIndex,
  INFO_MEMORIZE_PRACTICE_SLIDES,
  memorizePracticeSlideSrc,
  nextMemorizePracticeSlideIndex,
  previousMemorizePracticeSlideIndex,
} from "./info-memorize-practice-preview";

describe("INFO_MEMORIZE_PRACTICE_SLIDES", () => {
  it("lists the five practice modes in order", () => {
    expect(INFO_MEMORIZE_PRACTICE_SLIDES.map((slide) => slide.id)).toEqual([
      "type",
      "initials",
      "word",
      "reorder",
      "recite",
    ]);
  });

  it("uses light or dark screenshot paths from the Info page theme", () => {
    const typeSlide = INFO_MEMORIZE_PRACTICE_SLIDES[0];
    expect(memorizePracticeSlideSrc(typeSlide, false)).toBe(
      "/info/memorize-practice/light/01-type.png"
    );
    expect(memorizePracticeSlideSrc(typeSlide, true)).toBe(
      "/info/memorize-practice/dark/01-type.png"
    );
  });
});

describe("memorize practice slide index", () => {
  it("does not go past the first or last slide", () => {
    expect(previousMemorizePracticeSlideIndex(0)).toBe(0);
    expect(nextMemorizePracticeSlideIndex(4)).toBe(4);
    expect(clampMemorizePracticeSlideIndex(-3)).toBe(0);
    expect(clampMemorizePracticeSlideIndex(99)).toBe(4);
  });

  it("steps forward and back one slide", () => {
    expect(nextMemorizePracticeSlideIndex(0)).toBe(1);
    expect(previousMemorizePracticeSlideIndex(2)).toBe(1);
  });
});
