import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DriveStep } from 'driver.js';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type { GroupsHelpSectionTourHooks, GroupsTourMode } from '../help-tour-hooks';
import { TOUR_FILTER_GROUPS_ID, TOUR_GROUPS_FIRST_CARD_ID } from '../help-tour-ids';
import { runGroupsHelpSectionTour } from './groups-section-tour';

const OWNER_ONLY_TITLES = [
  'Add',
  'New prayer or new group',
  'Create a group',
  'Invite by email',
  'Group settings',
  'Prayer for',
  'Submit',
  'Done with the sample group',
];

function mockTourHost(): HelpTourDriverHost & {
  startTourDriver: ReturnType<typeof vi.fn>;
} {
  const startTourDriver = vi.fn(() => ({ drive: vi.fn() }));
  return {
    killActiveDriver: vi.fn(),
    startTourDriver,
  } as HelpTourDriverHost & { startTourDriver: ReturnType<typeof vi.fn> };
}

function hooks(): GroupsHelpSectionTourHooks {
  return {
    markForCheck: vi.fn(),
    openAddChooser: vi.fn(),
    chooseAddGroupForTour: vi.fn(),
    createWalkthroughGroup: vi.fn(async () => undefined),
    closeMembersModal: vi.fn(),
    openSettingsForWalkthrough: vi.fn(),
    closeSettings: vi.fn(),
    openWalkthroughGroupPrayer: vi.fn(),
    fillWalkthroughGroupPrayer: vi.fn(),
    submitWalkthroughPrayerForm: vi.fn(),
    deleteWalkthroughSampleGroups: vi.fn(async () => undefined),
  };
}

function titlesFor(mode: GroupsTourMode): string[] {
  const host = mockTourHost();
  runGroupsHelpSectionTour(
    host,
    { title: 'Prayer Groups', description: 'Private prayers' },
    mode,
    hooks(),
  );
  const config = host.startTourDriver.mock.calls[0]?.[0] as { steps?: DriveStep[] };
  return (config.steps ?? []).map((step) => String(step.popover?.title ?? ''));
}

describe('runGroupsHelpSectionTour', () => {
  beforeEach(() => {
    document.body.innerHTML = `<button id="${TOUR_FILTER_GROUPS_ID}"></button>`;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not start when the Group tab is missing', () => {
    document.body.innerHTML = '';
    const host = mockTourHost();
    runGroupsHelpSectionTour(
      host,
      { title: 'Prayer Groups', description: 'Private prayers' },
      { kind: 'owner_walkthrough' },
      hooks(),
    );
    expect(host.startTourDriver).not.toHaveBeenCalled();
  });

  it('walks a church member through creating a sample group', () => {
    const tourHooks = hooks();
    const host = mockTourHost();
    runGroupsHelpSectionTour(
      host,
      { title: 'Prayer Groups', description: 'Private prayers' },
      { kind: 'owner_walkthrough' },
      tourHooks,
    );
    const config = host.startTourDriver.mock.calls[0]?.[0] as {
      steps?: DriveStep[];
      onDestroyed?: () => void;
    };
    const steps = config.steps ?? [];
    expect(steps.map((step) => step.popover?.title)).toEqual([
      'Prayer Groups',
      'Group tab',
      'Current, Answered, and Total',
      'Add',
      'New prayer or new group',
      'Create a group',
      'Invite by email',
      'Your group',
      'Group menu',
      'Group settings',
      'Prayer for',
      'Details',
      'Submit',
      'Your group prayer',
      'Prayer actions',
      'Leave, transfer, or delete',
      'Done with the sample group',
    ]);
    for (const step of steps) {
      if (typeof step.element === 'function') {
        expect(step.element()).toBeInstanceOf(HTMLElement);
      }
    }
    config.onDestroyed?.();
    expect(tourHooks.deleteWalkthroughSampleGroups).toHaveBeenCalledTimes(1);
  });

  it('only highlights existing groups for a group-only member, including a prayer card when one is on the page', () => {
    document.body.innerHTML += `<div id="${TOUR_GROUPS_FIRST_CARD_ID}"></div>`;
    const titles = titlesFor({ kind: 'member_with_groups' });
    expect(titles).toEqual([
      'Prayer Groups',
      'Group tab',
      'Current, Answered, and Total',
      'Your groups',
      'Group menu',
      'Joining a group',
      'A group prayer',
      'Prayer actions',
      'Leaving a group',
      'Groups in Help',
    ]);
    for (const title of OWNER_ONLY_TITLES) {
      expect(titles).not.toContain(title);
    }
  });

  it('skips prayer-card steps when a group-only member has groups but no prayers', () => {
    const titles = titlesFor({ kind: 'member_with_groups' });
    expect(titles).toEqual([
      'Prayer Groups',
      'Group tab',
      'Current, Answered, and Total',
      'Your groups',
      'Group menu',
      'Joining a group',
      'Leaving a group',
      'Groups in Help',
    ]);
    expect(titles).not.toContain('Create a group');
  });

  it('explains the empty state for a group-only member with no groups', () => {
    const tourHooks = hooks();
    const host = mockTourHost();
    runGroupsHelpSectionTour(
      host,
      { title: 'Prayer Groups', description: 'Private prayers' },
      { kind: 'member_no_groups' },
      tourHooks,
    );
    const config = host.startTourDriver.mock.calls[0]?.[0] as {
      steps?: DriveStep[];
      onDestroyed?: () => void;
    };
    const titles = (config.steps ?? []).map((step) => step.popover?.title);
    expect(titles).toEqual([
      'Prayer Groups',
      'Group tab',
      'Current, Answered, and Total',
      'No groups yet',
      'Email invites',
      'Groups in Help',
    ]);
    expect(titles).not.toContain('Create a group');
    config.onDestroyed?.();
    expect(tourHooks.deleteWalkthroughSampleGroups).toHaveBeenCalledTimes(1);
  });
});
