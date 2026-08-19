import type { HelpSection } from '../types/help-content';

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
