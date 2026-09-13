import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import {
  TOUR_SETTINGS_BTN_DESKTOP_ID,
  TOUR_SETTINGS_FEEDBACK_SECTION_ID,
} from '../help-tour-ids';

const envState = vi.hoisted(() => ({
  inAppFeedbackEnabled: true,
}));

vi.mock('../../../environments/environment', () => ({
  environment: envState,
}));

import { runFeedbackHelpSectionTour } from './feedback-section-tour';

function mockTourHost(): HelpTourDriverHost & { startTourDriver: ReturnType<typeof vi.fn> } {
  const mockDrive = vi.fn();
  const mockDriver = { drive: mockDrive };
  const startTourDriver = vi.fn(() => mockDriver);
  return {
    killActiveDriver: vi.fn(),
    startTourDriver,
  } as HelpTourDriverHost & { startTourDriver: ReturnType<typeof vi.fn> };
}

describe('runFeedbackHelpSectionTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
    document.body.innerHTML = `
      <button id="${TOUR_SETTINGS_BTN_DESKTOP_ID}"></button>
      <div id="${TOUR_SETTINGS_FEEDBACK_SECTION_ID}"></div>
    `;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    envState.inAppFeedbackEnabled = true;
  });

  it('includes type and details steps when in-app feedback is enabled', () => {
    envState.inAppFeedbackEnabled = true;
    const host = mockTourHost();
    runFeedbackHelpSectionTour(host, { title: 'Feedback', description: 'Help' }, {
      openSettings: vi.fn(),
      closeSettings: vi.fn(),
      markForCheck: vi.fn(),
    });

    const config = host.startTourDriver.mock.calls[0]?.[0];
    expect(config?.steps?.length).toBe(6);
  });

  it('does not start the tour when in-app feedback is disabled', () => {
    envState.inAppFeedbackEnabled = false;
    const host = mockTourHost();
    runFeedbackHelpSectionTour(host, { title: 'Feedback', description: 'Help' }, {
      openSettings: vi.fn(),
      closeSettings: vi.fn(),
      markForCheck: vi.fn(),
    });

    expect(host.startTourDriver).not.toHaveBeenCalled();
  });
});
