import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HelpSection } from '../types/help-content';
import { dispatchHomeHelpSectionTour } from './home-help-tour-dispatch';
import { TOUR_FILTER_GROUPS_ID } from './help-tour-ids';

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
    const groupsTab = document.createElement('button');
    groupsTab.id = TOUR_FILTER_GROUPS_ID;
    document.body.appendChild(groupsTab);
  });

  afterEach(() => {
    envState.inAppFeedbackEnabled = true;
    document.getElementById(TOUR_FILTER_GROUPS_ID)?.remove();
  });

  it('starts feedback tour when in-app feedback is enabled', () => {
    const dispatched = dispatchHomeHelpSectionTour(makeSection('help_feedback'), {
      host: host as never,
      helpDriverTourService: helpDriverTourService as never,
    });

    expect(dispatched).toBe(true);
    expect(helpDriverTourService.startFeedbackHelpSectionTour).toHaveBeenCalled();
  });

  it('returns false for Prayer Groups when Groups is off', () => {
    const startGroupsHelpSectionTour = vi.fn();
    const dispatched = dispatchHomeHelpSectionTour(makeSection('help_groups'), {
      host: { isPrayerGroupsEnabled: () => false } as never,
      helpDriverTourService: { startGroupsHelpSectionTour } as never,
    });

    expect(dispatched).toBe(false);
    expect(startGroupsHelpSectionTour).not.toHaveBeenCalled();
  });

  it('returns false for Prayer Groups when the Group tab is not rendered, so the full tour can skip it', () => {
    document.getElementById(TOUR_FILTER_GROUPS_ID)?.remove();
    const startGroupsHelpSectionTour = vi.fn();
    const deleteWalkthroughSampleGroups = vi.fn(async () => undefined);
    const dispatched = dispatchHomeHelpSectionTour(makeSection('help_groups'), {
      host: { isPrayerGroupsEnabled: () => true, deleteWalkthroughSampleGroups } as never,
      helpDriverTourService: { startGroupsHelpSectionTour } as never,
    });

    expect(dispatched).toBe(false);
    expect(deleteWalkthroughSampleGroups).not.toHaveBeenCalled();
  });

  it('starts the church-member Groups tour when Groups is on', async () => {
    vi.useFakeTimers();
    const startGroupsHelpSectionTour = vi.fn();
    const host = {
      isPrayerGroupsEnabled: () => true,
      isChurchMember: () => true,
      getGroupCount: () => 0,
      deleteWalkthroughSampleGroups: vi.fn(async () => undefined),
      findWalkthroughGroupId: vi.fn(async () => null),
      setFilter: vi.fn(),
      markForCheck: vi.fn(),
      getGroupsPanelHooks: () => null,
      getPrayerFormHooks: () => null,
      openNewGroupPrayer: vi.fn(),
    };
    const dispatched = dispatchHomeHelpSectionTour(makeSection('help_groups'), {
      host: host as never,
      helpDriverTourService: { startGroupsHelpSectionTour } as never,
    });

    expect(dispatched).toBe(true);
    await vi.runAllTimersAsync();
    expect(startGroupsHelpSectionTour).toHaveBeenCalledWith(
      { title: 'Title', description: 'Description' },
      { kind: 'owner_walkthrough' },
      expect.any(Object),
    );
    vi.useRealTimers();
  });

  it('starts the empty group-only tour when the person is not a church member and has no groups', async () => {
    vi.useFakeTimers();
    const startGroupsHelpSectionTour = vi.fn();
    const dispatched = dispatchHomeHelpSectionTour(makeSection('help_groups'), {
      host: {
        isPrayerGroupsEnabled: () => true,
        isChurchMember: () => false,
        getGroupCount: () => 0,
        deleteWalkthroughSampleGroups: vi.fn(async () => undefined),
        findWalkthroughGroupId: vi.fn(async () => null),
        setFilter: vi.fn(),
        markForCheck: vi.fn(),
        getGroupsPanelHooks: () => null,
        getPrayerFormHooks: () => null,
        openNewGroupPrayer: vi.fn(),
      } as never,
      helpDriverTourService: { startGroupsHelpSectionTour } as never,
    });

    expect(dispatched).toBe(true);
    await vi.runAllTimersAsync();
    expect(startGroupsHelpSectionTour).toHaveBeenCalledWith(
      { title: 'Title', description: 'Description' },
      { kind: 'member_no_groups' },
      expect.any(Object),
    );
    vi.useRealTimers();
  });

  it('starts the highlight tour when a group-only member already has groups', async () => {
    vi.useFakeTimers();
    const startGroupsHelpSectionTour = vi.fn();
    const dispatched = dispatchHomeHelpSectionTour(makeSection('help_groups'), {
      host: {
        isPrayerGroupsEnabled: () => true,
        isChurchMember: () => false,
        getGroupCount: () => 2,
        deleteWalkthroughSampleGroups: vi.fn(async () => undefined),
        findWalkthroughGroupId: vi.fn(async () => null),
        setFilter: vi.fn(),
        markForCheck: vi.fn(),
        getGroupsPanelHooks: () => null,
        getPrayerFormHooks: () => null,
        openNewGroupPrayer: vi.fn(),
      } as never,
      helpDriverTourService: { startGroupsHelpSectionTour } as never,
    });

    expect(dispatched).toBe(true);
    await vi.runAllTimersAsync();
    expect(startGroupsHelpSectionTour).toHaveBeenCalledWith(
      { title: 'Title', description: 'Description' },
      { kind: 'member_with_groups' },
      expect.any(Object),
    );
    vi.useRealTimers();
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
