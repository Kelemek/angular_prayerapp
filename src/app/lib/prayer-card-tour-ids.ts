export interface PrayerCardAddUpdateTourElementIds {
  content?: string;
  anonymousWrap?: string;
  anonymousInput?: string;
  markAnsweredWrap?: string;
  markAnsweredInput?: string;
  submit?: string;
}

export function getPrayerCardAddUpdateTourElementIds(
  tourPersonalWalkthroughAnchors: boolean,
  tourUpdateAnchors: boolean
): PrayerCardAddUpdateTourElementIds | null {
  if (tourPersonalWalkthroughAnchors) {
    return { content: 'tour-walkthrough-update-content' };
  }
  if (tourUpdateAnchors) {
    return {
      content: 'tour-prayer-update-content',
      anonymousWrap: 'tour-prayer-update-anonymous-wrap',
      anonymousInput: 'tour-prayer-update-anonymous-input',
      markAnsweredWrap: 'tour-prayer-update-mark-answered-wrap',
      markAnsweredInput: 'tour-prayer-update-mark-answered-input',
      submit: 'tour-prayer-update-submit',
    };
  }
  return null;
}
