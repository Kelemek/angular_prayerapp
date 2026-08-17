import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildEmailSubscribersOverviewTourSteps,
  buildPrayerEditorManageTourSteps,
  buildMemorizeRecommendationsTourSteps,
} from './admin-help-tour-catalog';

describe('admin-help-tour-catalog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('buildEmailSubscribersOverviewTourSteps uses column steps when overview anchors exist', () => {
    const anchor = document.createElement('div');
    anchor.id = 'tour-email-overview-name';
    document.body.appendChild(anchor);

    const steps = buildEmailSubscribersOverviewTourSteps();
    expect(steps.some((s) => s.element === '#tour-email-overview-name')).toBe(true);
    expect(steps.some((s) => s.element === '#tour-email-subscribers-list-area')).toBe(false);
  });

  it('buildEmailSubscribersOverviewTourSteps uses list fallback when no column anchors', () => {
    const steps = buildEmailSubscribersOverviewTourSteps();
    expect(steps.some((s) => s.element === '#tour-email-subscribers-list-area')).toBe(true);
  });

  it('buildPrayerEditorManageTourSteps includes row walkthrough when hasPrayerRow', () => {
    const callbacks = {
      openEditFormForTour: () => {},
      cancelEditForTour: () => {},
      openAddUpdateFormForTour: () => {},
      cancelAddUpdateForTour: () => {},
      resetTourUiState: () => {},
    };
    const steps = buildPrayerEditorManageTourSteps(true, callbacks);
    expect(steps.some((s) => s.element === '#tour-prayer-editor-edit-first')).toBe(true);
  });

  it('buildMemorizeRecommendationsTourSteps includes verse list when hasCategories', () => {
    const steps = buildMemorizeRecommendationsTourSteps(true);
    expect(steps.some((s) => s.element === '#tour-memorize-rec-verses-list')).toBe(true);
  });
});
