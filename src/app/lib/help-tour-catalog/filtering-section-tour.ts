import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpSection } from '../../types/help-content';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type { FilteringHelpSectionTourHooks } from '../help-tour-hooks';

export function runFilteringHelpSectionTour(
  host: HelpTourDriverHost,
  section: HelpSection, hooks: FilteringHelpSectionTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  const c0 = section.content[0];
  if (!c0 || !dom.getPublicFilterEl()) {
    return;
  }

  host.killActiveDriver();

  const c1 = section.content[1];
  const c2 = section.content[2];
  const c3 = section.content[3];
  const overview = c0.text;
  const currentPhrase = excerptForNamedFilter(overview, 'Current');
  const currentStepDescription = isDescriptiveFilterTourExcerpt(currentPhrase)
    ? `${formatHelpContentHtml(currentPhrase)}<br><br>${formatHelpContentHtml(c0.text)}`
    : formatHelpContentHtml(c0.text);

  const steps: DriveStep[] = [
    {
      popover: {
        title: dom.escapeHtml(section.title),
        description: formatHelpContentHtml(section.description),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: () => dom.getPublicFilterEl()!,
      popover: {
        title: dom.escapeHtml('Church'),
        description:
          'The <strong>Church</strong> tab shows community prayers shared with your church (highlighted with a colored border when active). Use the <strong>Current</strong>, <strong>Answered</strong>, <strong>Archived</strong>, <strong>Total</strong>, and <strong>Prompts</strong> filters in the row below to switch views. If a Planning Center list is mapped, <strong>Members</strong> also appears after <strong>Prompts</strong>.',
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Next',
        onNextClick: host.advanceAfterOrKill(hooks.switchToCurrent),
      },
    },
    {
      element: () => dom.getCurrentFilterEl()!,
      popover: {
        title: dom.escapeHtml('Current'),
        description: currentStepDescription,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Next',
        onNextClick: host.advanceAfterOrKill(hooks.switchToCurrent),
      },
    },
  ];

  const answeredPhrase = excerptForNamedFilter(overview, 'Answered');
  const answeredDescription = isDescriptiveFilterTourExcerpt(answeredPhrase)
    ? answeredPhrase
    : 'This filter shows prayers that have been answered.';
  steps.push({
    element: () => dom.getAnsweredFilterEl()!,
    popover: {
      title: dom.escapeHtml('Answered'),
      description: formatHelpContentHtml(answeredDescription),
      side: 'bottom',
      align: 'start',
      nextBtnText: 'Next',
      onNextClick: host.advanceAfterOrKill(hooks.switchToAnswered),
    },
  });

  if (c2) {
    const archivedDescription = `${dom.escapeHtml(c2.subtitle)}<br><br>${formatHelpContentHtml(c2.text)}`;
    steps.push({
      element: () => dom.getArchivedFilterEl()!,
      popover: {
        title: dom.escapeHtml('Archived'),
        description: archivedDescription,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Next',
        onNextClick: host.advanceAfterOrKill(hooks.switchToArchived),
      },
    });
  }

  const totalPhrase = excerptForNamedFilter(overview, 'Total');
  const totalDescription = isDescriptiveFilterTourExcerpt(totalPhrase)
    ? totalPhrase
    : 'This filter shows all community prayers, including current, answered, and archived.';
  steps.push({
    element: () => dom.getTotalFilterEl()!,
    popover: {
      title: dom.escapeHtml('Total'),
      description: formatHelpContentHtml(totalDescription),
      side: 'bottom',
      align: 'start',
      nextBtnText: 'Next',
      onNextClick: host.advanceAfterOrKill(hooks.switchToTotal),
    },
  });

  const promptsPhrase = excerptForNamedFilter(overview, 'Prompts');
  if (dom.getPromptsFilterEl()) {
    steps.push({
      element: () => dom.getPromptsFilterEl()!,
      popover: {
        title: dom.escapeHtml('Prompts'),
        description: promptsPhrase
          ? formatHelpContentHtml(promptsPhrase)
          : formatHelpContentHtml('This filter shows prayer prompt cards under Church.'),
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Next',
        onNextClick: host.advanceAfterOrKill(hooks.switchToPrompts),
      },
    });
  }

  const membersPhrase = excerptForNamedFilter(overview, 'Members');
  if (dom.getMembersFilterEl()) {
    steps.push({
      element: () => dom.getMembersFilterEl()!,
      popover: {
        title: dom.escapeHtml('Members'),
        description: membersPhrase
          ? formatHelpContentHtml(membersPhrase)
          : formatHelpContentHtml(
              'Members shows Planning Center list people as prayer cards under Church, after Prompts.'
            ),
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Next',
        onNextClick: host.advanceAfterOrKill(hooks.switchToMembers),
      },
    });
  }

  if (c1 && dom.getPersonalFilterEl()) {
    const personalDescription = `${dom.escapeHtml(c1.subtitle)}<br><br>${formatHelpContentHtml(c1.text)}`;
    const advancePersonal = hooks.openSearchPanel
      ? () => {
          hooks.switchToPersonal();
          hooks.openSearchPanel!();
        }
      : hooks.switchToPersonal;
    steps.push({
      element: () => dom.getPersonalFilterEl()!,
      popover: {
        title: dom.escapeHtml('Personal'),
        description: personalDescription,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Next',
        onNextClick: host.advanceAfterOrKill(advancePersonal),
      },
    });
  }

  if (c3 && dom.getPrayerSearchInputEl()) {
    steps.push({
      element: () => dom.getPrayerSearchInputEl()!,
      popover: {
        title: dom.escapeHtml('Search'),
        description: `${dom.escapeHtml(c3.subtitle)}<br><br>${formatHelpContentHtml(c3.text)}`,
        side: 'bottom',
        align: 'start',
        onNextClick: host.popoverNextKillsTour(),
      },
    });
  }

  const d = host.startTourDriver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    smoothScroll: true,
    allowClose: true,
    popoverClass: 'help-driver-popover',
    steps,
  });

  d.drive(0);
}
