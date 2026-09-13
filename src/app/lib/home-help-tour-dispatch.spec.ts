import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HelpSection } from '../types/help-content';
import { dispatchHomeHelpSectionTour } from './home-help-tour-dispatch';

const envState = vi.hoisted(() => ({
  inAppFeedbackEnabled: true,
}));

vi.mock('../../environments/environment', () => ({
  environment: envState,
}));

function makeSection(id: string): HelpSection {
  return {
    id,
    title: 'Title',
    description: 'Description',
    icon: 'icon',
    content: [],
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test',
  };
}

describe('dispatchHomeHelpSectionTour', () => {
  const helpDriverTourService = {
    startFeedbackHelpSectionTour: vi.fn(),
  };
  const host = {
    openUserSettings: vi.fn(),
    closeUserSettings: vi.fn(),
    markForCheck: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    envState.inAppFeedbackEnabled = true;
  });

  afterEach(() => {
    envState.inAppFeedbackEnabled = true;
  });

  it('starts feedback tour when in-app feedback is enabled', () => {
    const dispatched = dispatchHomeHelpSectionTour(makeSection('help_feedback'), {
      host: host as never,
      helpDriverTourService: helpDriverTourService as never,
    });

    expect(dispatched).toBe(true);
    expect(helpDriverTourService.startFeedbackHelpSectionTour).toHaveBeenCalled();
  });

  it('returns false when in-app feedback is disabled so full tour can advance', () => {
    envState.inAppFeedbackEnabled = false;

    const dispatched = dispatchHomeHelpSectionTour(makeSection('help_feedback'), {
      host: host as never,
      helpDriverTourService: helpDriverTourService as never,
    });

    expect(dispatched).toBe(false);
    expect(helpDriverTourService.startFeedbackHelpSectionTour).not.toHaveBeenCalled();
  });
});
