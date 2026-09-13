import { describe, it, expect, vi, afterEach } from 'vitest';
import { HELP_SECTION_ID_FEEDBACK, HELP_SECTION_ID_PRINTING, helpSectionHasUiTour } from './help-section-ids';

const envState = vi.hoisted(() => ({
  inAppFeedbackEnabled: true,
}));

vi.mock('../../environments/environment', () => ({
  environment: envState,
}));

describe('helpSectionHasUiTour', () => {
  afterEach(() => {
    envState.inAppFeedbackEnabled = true;
  });

  it('includes feedback when in-app feedback is enabled', () => {
    envState.inAppFeedbackEnabled = true;
    expect(helpSectionHasUiTour(HELP_SECTION_ID_FEEDBACK)).toBe(true);
  });

  it('hides feedback tour when in-app feedback is disabled', () => {
    envState.inAppFeedbackEnabled = false;
    expect(helpSectionHasUiTour(HELP_SECTION_ID_FEEDBACK)).toBe(false);
  });

  it('does not affect other sections', () => {
    envState.inAppFeedbackEnabled = false;
    expect(helpSectionHasUiTour(HELP_SECTION_ID_PRINTING)).toBe(true);
  });
});
