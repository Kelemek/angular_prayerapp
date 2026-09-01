import { loadMemorizeListView } from './memorization/memorization-list-prefs';
import type { HelpSection } from '../types/help-content';
import type { HelpDriverTourService } from '../services/help-driver-tour.service';
import { getCardActionsOverflowTriggerEl } from './help-card-actions-menu-tour';
import type { HomeHelpTourHost } from '../services/home-help-tour-host.adapter';

export interface HomeHelpTourSectionStartContext {
  host: HomeHelpTourHost;
  helpDriverTourService: HelpDriverTourService;
}

function requireHost(ctx: HomeHelpTourSectionStartContext): HomeHelpTourHost {
  return ctx.host;
}

export function startCreatingPrayersTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  const host = requireHost(ctx);
  const includeAnonymous =
    host.getActiveFilter() !== "personal" &&
    host.getActiveFilter() !== "planning_center_list";
  ctx.helpDriverTourService.startCreatingPrayersHelpSectionTour(
    { title: section.title, description: section.description },
    {
      openPrayerForm: () => {
        host.openPrayerForm();
        host.markForCheck();
      },
      closePrayerForm: () => {
        host.closePrayerForm();
        host.markForCheck();
      },
      switchToCurrent: () => {
        host.setFilter("current");
        host.markForCheck();
      },
    },
    { includeAnonymousUpdateStep: includeAnonymous }
  );
}

export function startFilteringTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  const host = requireHost(ctx);
  host.setFilter("current");
  host.markForCheck();
  window.setTimeout(() => {
    ctx.helpDriverTourService.startFilteringHelpSectionTour(section, {
      switchToCurrent: () => {
        host.setFilter("current");
        host.markForCheck();
      },
      switchToAnswered: () => {
        host.setFilter("answered");
        host.markForCheck();
      },
      switchToArchived: () => {
        host.setFilter("archived");
        host.markForCheck();
      },
      switchToTotal: () => {
        host.setFilter("total");
        host.markForCheck();
      },
      switchToMembers: () => {
        host.setFilter("planning_center_list");
        host.markForCheck();
      },
      switchToPrompts: () => {
        host.setFilter("prompts");
        host.markForCheck();
      },
      switchToPersonal: () => {
        host.setFilter("personal");
        host.markForCheck();
      },
      openSearchPanel: () => {
        host.openSearchPanel();
        host.markForCheck();
      },
    });
  }, 80);
}

export function startPrayerPromptsTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  const host = requireHost(ctx);
  host.setFilter("prompts");
  host.markForCheck();
  window.setTimeout(
    () =>
      ctx.helpDriverTourService.startPrayerPromptsTour(
        { title: section.title, description: section.description },
        { hasPrompts: host.getPromptsCount() > 0 },
        {
          switchToPrompts: () => {
            host.setFilter("prompts");
            host.markForCheck();
          },
          clearPromptTypes: () => {
            host.clearSelectedPromptTypes();
            host.markForCheck();
          },
        }
      ),
    80
  );
}

export async function startPrayerEncouragementTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): Promise<void> {
  const host = requireHost(ctx);
  host.setFilter("current");
  host.markForCheck();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
  const list = await host.getCurrentPrayers();
  ctx.helpDriverTourService.startPrayerEncouragementTour(
    { title: section.title, description: section.description },
    { hasCommunityPrayer: list.length > 0 },
    {
      switchToCurrent: () => {
        host.setFilter("current");
        host.markForCheck();
      },
    }
  );
}

export function startSearchPrayersTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  const host = requireHost(ctx);
  host.closeHelp();
  host.openSearchPanel();
  host.markForCheck();
  window.setTimeout(
    () =>
      ctx.helpDriverTourService.startSearchPrayersTour({
        title: section.title,
        description: section.description,
      }),
    280
  );
}

export function startPersonalPrayersTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  const host = requireHost(ctx);
  const form = host.getPrayerFormHooks();
  ctx.helpDriverTourService.startPersonalPrayersHelpSectionTour(
    { title: section.title, description: section.description },
    {
      switchToPersonalFilter: () => {
        host.setFilter("personal");
        host.markForCheck();
      },
      openPrayerForm: () => {
        host.openPrayerForm();
        host.markForCheck();
      },
      markForCheck: () => host.markForCheck(),
      fillWalkthroughPrayerFor: () => form?.fillWalkthroughPrayerFor(),
      fillWalkthroughDescription: () => form?.fillWalkthroughDescription(),
      ensureWalkthroughPersonalSelected: () =>
        form?.ensureWalkthroughPersonalSelected(),
      fillWalkthroughCategory: () => form?.fillWalkthroughCategory(),
      submitWalkthroughPrayerForm: () => form?.submitWalkthroughPrayerForm(),
      openWalkthroughPersonalEdit: () => {
        const p = host.getWalkthroughPersonalPrayer();
        if (p) {
          host.openWalkthroughPersonalEdit(p);
        }
        host.markForCheck();
      },
      closeWalkthroughPersonalEdit: () => {
        host.closeWalkthroughPersonalEdit();
        host.markForCheck();
      },
      clickWalkthroughAddUpdate: () => host.clickWalkthroughAddUpdate(),
      narrowToWalkthroughCategoryFilter: () => {
        host.narrowToWalkthroughCategoryFilter();
        host.markForCheck();
      },
      deleteWalkthroughTestPrayer: () => host.deleteWalkthroughTestPrayer(),
    }
  );
}

export function startMemorizeTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  const host = requireHost(ctx);
  ctx.helpDriverTourService.startMemorizeHelpSectionTour(
    { title: section.title, description: section.description },
    {
      hasMemorizedItems: host.getMemorizedItemsCount() > 0,
      listView: loadMemorizeListView(),
    },
    {
      switchToMemorize: () => {
        host.setFilter("memorize");
        host.markForCheck();
      },
    }
  );
}

function startSettingsTour(
  section: HelpSection,
  ctx: HomeHelpTourSectionStartContext,
  start: (
    copy: { title: string; description: string },
    hooks: {
      openSettings: () => void;
      closeSettings: () => void;
      markForCheck: () => void;
    }
  ) => void
): void {
  const host = requireHost(ctx);
  start(
    { title: section.title, description: section.description },
    {
      openSettings: () => host.openUserSettings(),
      closeSettings: () => host.closeUserSettings(),
      markForCheck: () => host.markForCheck(),
    }
  );
}

export function startEmailSubscriptionTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  startSettingsTour(section, ctx, (copy, hooks) =>
    ctx.helpDriverTourService.startEmailSubscriptionHelpSectionTour(
      copy,
      hooks
    )
  );
}

export async function startPrayerRemindersTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): Promise<void> {
  const host = requireHost(ctx);
  host.setFilter("current");
  host.markForCheck();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
  const hasEmail = host.hasSessionEmail();
  let hasReminderCardMenuTarget = false;
  if (hasEmail) {
    const list = await host.getCurrentPrayers();
    hasReminderCardMenuTarget = list.length > 0;
  }
  if (
    hasReminderCardMenuTarget &&
    typeof document !== "undefined" &&
    !getCardActionsOverflowTriggerEl(document)
  ) {
    hasReminderCardMenuTarget = false;
  }
  ctx.helpDriverTourService.startPrayerRemindersHelpSectionTour(
    { title: section.title, description: section.description },
    { hasReminderCardMenuTarget },
    {
      switchToCurrent: () => {
        host.setFilter("current");
        host.markForCheck();
      },
      openSettings: () => host.openUserSettings(),
      closeSettings: () => host.closeUserSettings(),
      markForCheck: () => host.markForCheck(),
    }
  );
}

export function startFeedbackTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  startSettingsTour(section, ctx, (copy, hooks) =>
    ctx.helpDriverTourService.startFeedbackHelpSectionTour(copy, hooks)
  );
}

export function startAppSettingsTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  startSettingsTour(section, ctx, (copy, hooks) =>
    ctx.helpDriverTourService.startAppSettingsHelpSectionTour(copy, hooks)
  );
}

export function startPrintingTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  startSettingsTour(section, ctx, (copy, hooks) =>
    ctx.helpDriverTourService.startPrintingHelpSectionTour(copy, hooks)
  );
}

export function startPresentationModeTour(section: HelpSection, ctx: HomeHelpTourSectionStartContext): void {
  const host = requireHost(ctx);
  ctx.helpDriverTourService.startPresentationModePrayButtonPreludeTour(
    { title: section.title, description: section.description },
    {
      continueToPresentation: () => {
        host.stashPresentationTourSession(
          JSON.stringify({
            title: section.title,
            description: section.description,
          })
        );
        host.navigateToPresentation();
      },
      markForCheck: () => host.markForCheck(),
    }
  );
}

