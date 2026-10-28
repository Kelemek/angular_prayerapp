import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type {
  GroupsHelpSectionTourHooks,
  GroupsTourAudience,
  GroupsTourMode,
} from '../help-tour-hooks';
import {
  TOUR_FILTER_ADD_GROUP_ID,
  TOUR_FILTER_GROUPS_ID,
  TOUR_GROUPS_ADD_CHOICE_GROUP_ID,
  TOUR_GROUPS_CREATE_MODAL_ID,
  TOUR_GROUPS_EMPTY_STATE_ID,
  TOUR_GROUPS_FIRST_CARD_ID,
  TOUR_GROUPS_INVITE_ID,
  TOUR_GROUPS_MEMBERS_MODAL_ID,
  TOUR_GROUPS_SETTINGS_MODAL_ID,
  TOUR_GROUPS_STATUS_ROW_ID,
  TOUR_GROUPS_WALKTHROUGH_CARD_ID,
  TOUR_GROUPS_WALKTHROUGH_CHIP_ID,
  TOUR_GROUP_CHIP_FIRST_ID,
  TOUR_PRAYER_DESCRIPTION_FIELD_ID,
  TOUR_PRAYER_SUBMIT_REQUEST_ID,
} from '../help-tour-ids';

export function groupsTourModeForAudience(audience: GroupsTourAudience): GroupsTourMode {
  switch (audience.kind) {
    case 'church_member':
      return { kind: 'owner_walkthrough' };
    case 'group_only':
      if (audience.groupCount > 0) {
        return { kind: 'member_with_groups' };
      }
      return { kind: 'member_no_groups' };
    default: {
      const _never: never = audience;
      return _never;
    }
  }
}

export function runGroupsHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
  mode: GroupsTourMode,
  hooks: GroupsHelpSectionTourHooks,
): void {
  if (typeof document === 'undefined') {
    return;
  }
  const groupsTab = dom.getGroupsFilterEl();
  if (!groupsTab) {
    return;
  }

  host.killActiveDriver();

  const title = dom.escapeHtml(section.title);
  const anchor = (id: string): (() => HTMLElement) => {
    return () => document.getElementById(id) ?? groupsTab;
  };
  const menuAnchored = (id: string): (() => HTMLElement) => {
    return () => {
      const menu = document.querySelector('[data-card-actions-overflow-menu]');
      if (menu instanceof HTMLElement) {
        return menu;
      }
      return document.getElementById(id) ?? groupsTab;
    };
  };
  const advance = (fn: () => void | Promise<void>, delayMs: number): DriverHook => {
    return (_element, _step, { driver: drv }) => {
      void Promise.resolve(fn()).then(() => {
        window.setTimeout(() => {
          hooks.markForCheck();
          drv.refresh();
          drv.moveNext();
        }, delayMs);
      });
    };
  };

  const steps = stepsForMode(mode, {
    title,
    descriptionHtml: formatHelpContentHtml(section.description),
    anchor,
    menuAnchored,
    advance,
    hooks,
    finishSample: () => {
      void hooks.deleteWalkthroughSampleGroups().finally(() => {
        hooks.markForCheck();
        host.killActiveDriver();
      });
    },
  });

  const driver = host.startTourDriver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    smoothScroll: true,
    allowClose: true,
    popoverClass: 'help-driver-popover',
    steps,
    onDestroyed: () => {
      void hooks.deleteWalkthroughSampleGroups();
    },
  });
  driver.drive(0);
}

interface GroupsStepBuild {
  title: string;
  descriptionHtml: string;
  anchor: (id: string) => () => HTMLElement;
  menuAnchored: (id: string) => () => HTMLElement;
  advance: (fn: () => void | Promise<void>, delayMs: number) => DriverHook;
  hooks: GroupsHelpSectionTourHooks;
  finishSample: () => void;
}

function stepsForMode(mode: GroupsTourMode, build: GroupsStepBuild): DriveStep[] {
  switch (mode.kind) {
    case 'owner_walkthrough':
      return ownerWalkthroughSteps(build);
    case 'member_with_groups':
      return memberWithGroupsSteps(build);
    case 'member_no_groups':
      return memberNoGroupsSteps(build);
    default: {
      const _never: never = mode;
      return _never;
    }
  }
}

function openOverflowIn(id: string): void {
  const root =
    document.getElementById(id) ??
    document.getElementById(TOUR_GROUP_CHIP_FIRST_ID) ??
    document.getElementById(TOUR_GROUPS_FIRST_CARD_ID);
  openCardActionsOverflowMenu(getCardActionsOverflowTriggerEl(root));
}

function ownerWalkthroughSteps(build: GroupsStepBuild): DriveStep[] {
  const { anchor, menuAnchored, advance, hooks } = build;
  return [
    {
      popover: {
        title: build.title,
        description: `${build.descriptionHtml}<br><br>We'll create a <strong>sample group</strong> that only you are in, so nobody else is notified, and remove it at the end.`,
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: anchor(TOUR_FILTER_GROUPS_ID),
      popover: {
        title: 'Group tab',
        description:
          '<strong>Group</strong> holds private prayers for the people in each group. Church prayers stay on the <strong>Church</strong> tab.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: anchor(TOUR_GROUPS_STATUS_ROW_ID),
      popover: {
        title: 'Current, Answered, and Total',
        description:
          '<strong>Current</strong> is open prayers. <strong>Answered</strong> is prayers marked answered. <strong>Total</strong> is both. The counts cover every group you belong to.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: anchor(TOUR_FILTER_ADD_GROUP_ID),
      popover: {
        title: 'Add',
        description:
          'The <strong>+</strong> chip is for church members. Next opens a choice between a new prayer and a new group.',
        side: 'bottom',
        align: 'start',
        onNextClick: advance(() => hooks.openAddChooser(), 200),
      },
    },
    {
      element: anchor(TOUR_GROUPS_ADD_CHOICE_GROUP_ID),
      popover: {
        title: 'New prayer or new group',
        description:
          '<strong>New prayer</strong> shares with a group you already belong to, and stays disabled until you have one. <strong>New group</strong> creates a private list. Next chooses <strong>New group</strong> and fills in the sample name.',
        side: 'bottom',
        align: 'center',
        onNextClick: advance(() => hooks.chooseAddGroupForTour(), 220),
      },
    },
    {
      element: anchor(TOUR_GROUPS_CREATE_MODAL_ID),
      popover: {
        title: 'Create a group',
        description:
          'The name and color are filled in. Next creates the group. Manage members opens afterward. This tour does not send any invites.',
        side: 'bottom',
        align: 'center',
        onNextClick: advance(() => hooks.createWalkthroughGroup(), 300),
      },
    },
    {
      element: () =>
        document.getElementById(TOUR_GROUPS_INVITE_ID) ??
        document.getElementById(TOUR_GROUPS_MEMBERS_MODAL_ID) ??
        anchor(TOUR_FILTER_GROUPS_ID)(),
      popover: {
        title: 'Invite by email',
        description:
          'Owners invite by email, separated by commas. Each invite sends a welcome email. The owner can remove a member. Every member can open this list. Next closes the panel without sending an invite.',
        side: 'top',
        align: 'start',
        onNextClick: advance(() => hooks.closeMembersModal(), 200),
      },
    },
    {
      element: () =>
        document.getElementById(TOUR_GROUPS_WALKTHROUGH_CHIP_ID) ??
        document.getElementById(TOUR_GROUP_CHIP_FIRST_ID) ??
        anchor(TOUR_FILTER_GROUPS_ID)(),
      popover: {
        title: 'Your group',
        description:
          'Tap a chip to show that group. Tap it again to return to <strong>Total</strong>. Next opens the menu on this chip.',
        side: 'bottom',
        align: 'start',
        onNextClick: advance(
          () => openOverflowIn(TOUR_GROUPS_WALKTHROUGH_CHIP_ID),
          80,
        ),
      },
    },
    {
      element: menuAnchored(TOUR_GROUPS_WALKTHROUGH_CHIP_ID),
      popover: {
        title: 'Group menu',
        description:
          '<strong>Reorder</strong> appears when you have more than one group. <strong>Manage members</strong>, <strong>Settings</strong>, <strong>Rename group</strong>, and <strong>Delete group</strong> are for the owner. Next opens Settings. Nothing is deleted or renamed.',
        side: 'left',
        align: 'start',
        onNextClick: advance(() => hooks.openSettingsForWalkthrough(), 220),
      },
    },
    {
      element: anchor(TOUR_GROUPS_SETTINGS_MODAL_ID),
      popover: {
        title: 'Group settings',
        description:
          'The owner can limit updates to the person who wrote the prayer, limit <strong>Mark as answered</strong> the same way, or hide <strong>Pray For</strong>. Next closes this panel without saving.',
        side: 'bottom',
        align: 'center',
        onNextClick: advance(() => {
          hooks.closeSettings();
          hooks.openWalkthroughGroupPrayer();
        }, 350),
      },
    },
    {
      element: anchor('prayer_for'),
      popover: {
        title: 'Prayer for',
        description:
          'This form is locked to the sample group. Next fills in <strong>Test Group Prayer</strong> and a short description.',
        side: 'bottom',
        align: 'start',
        onNextClick: advance(() => hooks.fillWalkthroughGroupPrayer(), 80),
      },
    },
    {
      element: anchor(TOUR_PRAYER_DESCRIPTION_FIELD_ID),
      popover: {
        title: 'Details',
        description: 'The sample description is filled in. Next goes to submit.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: anchor(TOUR_PRAYER_SUBMIT_REQUEST_ID),
      popover: {
        title: 'Submit',
        description: 'Next saves this prayer in the sample group only.',
        side: 'top',
        align: 'start',
        onNextClick: advance(() => hooks.submitWalkthroughPrayerForm(), 950),
      },
    },
    {
      element: () =>
        document.getElementById(TOUR_GROUPS_WALKTHROUGH_CARD_ID) ??
        document.getElementById(TOUR_GROUPS_FIRST_CARD_ID) ??
        anchor(TOUR_FILTER_GROUPS_ID)(),
      popover: {
        title: 'Your group prayer',
        description:
          '<strong>Add update</strong> and <strong>Pray For</strong> sit on the card when that group allows them. Next opens the card menu. Those actions are not run.',
        side: 'top',
        align: 'start',
        onNextClick: advance(
          () => openOverflowIn(TOUR_GROUPS_WALKTHROUGH_CARD_ID),
          80,
        ),
      },
    },
    {
      element: menuAnchored(TOUR_GROUPS_WALKTHROUGH_CARD_ID),
      popover: {
        title: 'Prayer actions',
        description:
          '<strong>Edit prayer</strong> and <strong>Mark as answered</strong> are here for the author. The group owner can delete any prayer in the group. The author can delete their own. This tour does not change the prayer. Removing the sample group removes it.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: () =>
        document.getElementById(TOUR_GROUPS_WALKTHROUGH_CHIP_ID) ??
        document.getElementById(TOUR_GROUP_CHIP_FIRST_ID) ??
        anchor(TOUR_FILTER_GROUPS_ID)(),
      popover: {
        title: 'Leave, transfer, or delete',
        description:
          'An owner transfers ownership before leaving. <strong>Delete group</strong> removes the group and every prayer in it. A group-only person who leaves their last group loses the account and is signed out.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Done with the sample group',
        description:
          'Next deletes the sample group and the prayer we added. Nobody else was in it, so no one is notified. <strong>Prayer Groups</strong> stays in Help. The full guided tour includes it only when Groups is on for you.',
        side: 'bottom',
        align: 'center',
        onNextClick: () => build.finishSample(),
      },
    },
  ];
}

function memberWithGroupsSteps(build: GroupsStepBuild): DriveStep[] {
  const { anchor, menuAnchored, advance } = build;
  const cardSteps: DriveStep[] = hasGroupPrayerCard()
    ? [
        {
          element: anchor(TOUR_GROUPS_FIRST_CARD_ID),
          popover: {
            title: 'A group prayer',
            description:
              '<strong>Add update</strong>, <strong>Edit</strong>, <strong>Mark as answered</strong>, and <strong>Pray For</strong> follow the settings for that group. Next opens the card menu. Nothing is changed.',
            side: 'top',
            align: 'start',
            onNextClick: advance(() => openOverflowIn(TOUR_GROUPS_FIRST_CARD_ID), 80),
          },
        },
        {
          element: menuAnchored(TOUR_GROUPS_FIRST_CARD_ID),
          popover: {
            title: 'Prayer actions',
            description:
              'The menu shows the actions this prayer allows. This tour only points at them.',
            side: 'left',
            align: 'start',
          },
        },
      ]
    : [];
  return [
    {
      popover: {
        title: build.title,
        description: `${build.descriptionHtml}<br><br>This tour only points at groups you already belong to. It does not create a group, send an invite, or change settings.`,
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: anchor(TOUR_FILTER_GROUPS_ID),
      popover: {
        title: 'Group tab',
        description:
          '<strong>Group</strong> holds private prayers for the people in each group. You do not see a <strong>+</strong> chip, so you cannot create a group from here.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: anchor(TOUR_GROUPS_STATUS_ROW_ID),
      popover: {
        title: 'Current, Answered, and Total',
        description:
          '<strong>Current</strong> is open prayers. <strong>Answered</strong> is prayers marked answered. <strong>Total</strong> is both.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: anchor(TOUR_GROUP_CHIP_FIRST_ID),
      popover: {
        title: 'Your groups',
        description:
          'Tap a chip to show that group. Tap it again to return to <strong>Total</strong>. Next opens the menu.',
        side: 'bottom',
        align: 'start',
        onNextClick: advance(() => openOverflowIn(TOUR_GROUP_CHIP_FIRST_ID), 80),
      },
    },
    {
      element: menuAnchored(TOUR_GROUP_CHIP_FIRST_ID),
      popover: {
        title: 'Group menu',
        description:
          '<strong>Manage members</strong> shows who is in the group. <strong>Reorder</strong> appears when you belong to more than one group. Settings, rename, delete, and invites stay with the owner.',
        side: 'left',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Joining a group',
        description:
          'You join when an owner invites your email. <strong>Request</strong> then <strong>Group Prayer</strong> adds a prayer once you belong to a group. This tour does not open <strong>New prayer</strong>.',
        side: 'bottom',
        align: 'center',
      },
    },
    ...cardSteps,
    {
      element: anchor(TOUR_GROUP_CHIP_FIRST_ID),
      popover: {
        title: 'Leaving a group',
        description:
          'Any member can leave from <strong>Manage members</strong>. The owner has to transfer ownership first. If this is your only group and you are not a church member, leaving deletes your account and signs you out.',
        side: 'bottom',
        align: 'start',
      },
    },
    closingTip(build.title),
  ];
}

function memberNoGroupsSteps(build: GroupsStepBuild): DriveStep[] {
  const { anchor } = build;
  return [
    {
      popover: {
        title: build.title,
        description: `${build.descriptionHtml}<br><br>You are not in a group yet. This tour shows where groups appear. You join when someone emails you an invite.`,
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: anchor(TOUR_FILTER_GROUPS_ID),
      popover: {
        title: 'Group tab',
        description:
          '<strong>Group</strong> is where invited prayers show up. There is no <strong>+</strong> chip on a group-only account.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: anchor(TOUR_GROUPS_STATUS_ROW_ID),
      popover: {
        title: 'Current, Answered, and Total',
        description:
          'After you join, <strong>Current</strong>, <strong>Answered</strong>, and <strong>Total</strong> filter the prayers in your groups.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: anchor(TOUR_GROUPS_EMPTY_STATE_ID),
      popover: {
        title: 'No groups yet',
        description:
          'The page says you are not in a group yet. <strong>Request</strong> does not offer <strong>Group Prayer</strong> until you belong to one.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: anchor(TOUR_GROUPS_EMPTY_STATE_ID),
      popover: {
        title: 'Email invites',
        description:
          'When an owner invites your email, you get a welcome email and the group shows up here.',
        side: 'top',
        align: 'center',
      },
    },
    closingTip(build.title),
  ];
}

function closingTip(sectionTitle: string): DriveStep {
  return {
    popover: {
      title: 'Groups in Help',
      description: `<strong>${sectionTitle}</strong> stays in Help. The full guided tour includes Groups only when Groups is on for you.`,
      side: 'bottom',
      align: 'center',
    },
  };
}

function hasGroupPrayerCard(): boolean {
  return !!(
    document.getElementById(TOUR_GROUPS_FIRST_CARD_ID) ||
    document.getElementById(TOUR_GROUPS_WALKTHROUGH_CARD_ID)
  );
}
