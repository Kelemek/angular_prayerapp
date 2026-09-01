export type InfoMemorizePracticeSlideId =
  | "type"
  | "initials"
  | "word"
  | "reorder"
  | "recite";

export interface InfoMemorizePracticeSlide {
  id: InfoMemorizePracticeSlideId;
  title: string;
  description: string;
  lightSrc: string;
  darkSrc: string;
  alt: string;
}

export const INFO_MEMORIZE_PRACTICE_SLIDES: readonly InfoMemorizePracticeSlide[] =
  [
    {
      id: "type",
      title: "Type",
      description:
        "Type the first letter of each blank. Later rounds hide more of the verse.",
      lightSrc: "/info/memorize-practice/light/01-type.png",
      darkSrc: "/info/memorize-practice/dark/01-type.png",
      alt: "Type practice for 2 Timothy 3:16 with some words hidden as blanks",
    },
    {
      id: "initials",
      title: "Initials",
      description:
        "First-letter cues sit above the blanks. Dots hide a cue until you type the right key.",
      lightSrc: "/info/memorize-practice/light/02-initials.png",
      darkSrc: "/info/memorize-practice/dark/02-initials.png",
      alt: "Initials practice showing first-letter cues above verse blanks",
    },
    {
      id: "word",
      title: "Word",
      description:
        "Tap the correct word from the choice bar to fill the highlighted blank.",
      lightSrc: "/info/memorize-practice/light/03-word.png",
      darkSrc: "/info/memorize-practice/dark/03-word.png",
      alt: "Word practice with a choice bar under 2 Timothy 3:16",
    },
    {
      id: "reorder",
      title: "Reorder",
      description:
        "Drag highlighted verse parts back into reading order.",
      lightSrc: "/info/memorize-practice/light/04-reorder.png",
      darkSrc: "/info/memorize-practice/dark/04-reorder.png",
      alt: "Reorder practice with verse fragments as moveable chips",
    },
    {
      id: "recite",
      title: "Recite",
      description:
        "Say the whole verse and reference from memory, then tap Record. Shown words are cues only.",
      lightSrc: "/info/memorize-practice/light/05-recite.png",
      darkSrc: "/info/memorize-practice/dark/05-recite.png",
      alt: "Recite practice with a Record button and partial verse cues",
    },
  ];

export function memorizePracticeSlideSrc(
  slide: InfoMemorizePracticeSlide,
  dark: boolean
): string {
  return dark ? slide.darkSrc : slide.lightSrc;
}

export function clampMemorizePracticeSlideIndex(
  index: number,
  length = INFO_MEMORIZE_PRACTICE_SLIDES.length
): number {
  if (length <= 0) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index >= length) {
    return length - 1;
  }
  return index;
}

export function nextMemorizePracticeSlideIndex(index: number): number {
  return clampMemorizePracticeSlideIndex(index + 1);
}

export function previousMemorizePracticeSlideIndex(index: number): number {
  return clampMemorizePracticeSlideIndex(index - 1);
}
