import type { HelpSection } from '../types/help-content';
import { HELP_SECTION_ID_GROUPS } from './help-section-ids';

/** What the signed-in person can see. Help list, search, and the full tour all use this. */
export interface HelpSectionViewer {
  prayerGroupsEnabled: boolean;
}

const HELP_SECTION_VISIBLE_FOR_VIEWER: Record<
  string,
  (viewer: HelpSectionViewer) => boolean
> = {
  [HELP_SECTION_ID_GROUPS]: (viewer) => viewer.prayerGroupsEnabled,
};

export function filterHelpSectionsForViewer(
  sections: HelpSection[],
  viewer: HelpSectionViewer,
): HelpSection[] {
  return sections.filter((section) => {
    const visible = HELP_SECTION_VISIBLE_FOR_VIEWER[section.id];
    return visible ? visible(viewer) : true;
  });
}

export function filterHelpModalSections(
  sections: HelpSection[],
  query: string
): HelpSection[] {
  if (!query.trim()) {
    return sections;
  }

  const lowerQuery = query.toLowerCase();

  return sections.filter((section) => {
    if (
      section.title.toLowerCase().includes(lowerQuery) ||
      section.description.toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    return section.content.some(
      (content) =>
        content.subtitle.toLowerCase().includes(lowerQuery) ||
        content.text.toLowerCase().includes(lowerQuery) ||
        (content.examples &&
          content.examples.some((example) =>
            example.toLowerCase().includes(lowerQuery)
          ))
    );
  });
}

export function sortActiveHelpSectionsForFullTour(
  sections: HelpSection[]
): HelpSection[] {
  return [...sections]
    .filter((s) => s.isActive)
    .sort((a, b) => a.order - b.order);
}
