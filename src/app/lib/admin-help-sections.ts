import type { AdminHelpSection } from '../types/admin-help-content';
import type { HelpContent } from '../types/help-content';

export const ADMIN_HELP_TOUR_IDS = {
  emailSubscribersOverview: 'admin_help_email_subscribers_overview',
  emailSubscribers: 'admin_help_email_subscribers',
  prayerEditorCreate: 'admin_help_prayer_editor',
  prayerEditorManage: 'admin_help_prayer_editor_manage',
  promptsAndTypes: 'admin_help_prompts_and_types',
  memorizeRecommendations: 'admin_help_memorize_recommendations',
} as const;

export type AdminHelpTourId = (typeof ADMIN_HELP_TOUR_IDS)[keyof typeof ADMIN_HELP_TOUR_IDS];

const TOUR_ID_SET = new Set<string>(Object.values(ADMIN_HELP_TOUR_IDS));

export function isAdminHelpTourId(id: string): id is AdminHelpTourId {
  return TOUR_ID_SET.has(id);
}

export const ADMIN_HELP_SECTIONS: readonly AdminHelpSection[] = [
  {
    id: ADMIN_HELP_TOUR_IDS.emailSubscribersOverview,
    kind: 'tour',
    title: 'Email Subscribers — list & toolbar',
    description:
      'Start the guided tour — searches app-test, then walks each column on the first row (name through delete) plus pagination. Does not open Add Subscriber.',
    icon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/><circle cx="18" cy="18" r="3"/></svg>',
    content: [],
    order: 1,
    isActive: true,
  },
  {
    id: ADMIN_HELP_TOUR_IDS.emailSubscribers,
    kind: 'tour',
    title: 'Email subscribers & Planning Center',
    description: 'Start the guided tour — walks Settings → Email, subscribers, Add Subscriber, and Planning Center search.',
    icon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    content: [],
    order: 2,
    isActive: true,
  },
  {
    id: ADMIN_HELP_TOUR_IDS.prayerEditorCreate,
    kind: 'tour',
    title: 'Prayer Editor — create a prayer',
    description:
      'Start the guided tour — walks Settings → Tools → Prayer Editor and each field in Create New Prayer, including the subscriber prompt after save.',
    icon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>',
    content: [],
    order: 3,
    isActive: true,
  },
  {
    id: ADMIN_HELP_TOUR_IDS.prayerEditorManage,
    kind: 'tour',
    title: 'Prayer Editor — edit, delete, add update',
    description:
      'Start the guided tour — opens edit and Add Update on the first prayer, walks each field, then cancels (nothing saved).',
    icon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    content: [],
    order: 4,
    isActive: true,
  },
  {
    id: ADMIN_HELP_TOUR_IDS.promptsAndTypes,
    kind: 'tour',
    title: 'Prayer Prompts & Prayer Types',
    description:
      'Start the guided tour — walks Settings → Content, Prayer Prompts (CSV, search, list) and Prayer Types (reorder, active). Does not open add forms.',
    icon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h8"/></svg>',
    content: [],
    order: 5,
    isActive: true,
  },
  {
    id: ADMIN_HELP_TOUR_IDS.memorizeRecommendations,
    kind: 'tour',
    title: 'Memorize Recommendations',
    description:
      'Start the guided tour — walks Settings → Content, Memorize Recommendations (categories, verses, drag-reorder). Does not open add forms.',
    icon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h6"/></svg>',
    content: [],
    order: 6,
    isActive: true,
  },
];

export function filterAdminHelpSections(
  sections: readonly AdminHelpSection[],
  query: string,
): AdminHelpSection[] {
  const active = sections.filter((section) => section.isActive);
  const trimmed = query.trim();
  if (!trimmed) {
    return [...active];
  }
  const lowerQuery = trimmed.toLowerCase();
  return active.filter((section) => {
    if (section.title.toLowerCase().includes(lowerQuery) || section.description.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    return section.content.some(
      (block: HelpContent) =>
        block.subtitle.toLowerCase().includes(lowerQuery) ||
        block.text.toLowerCase().includes(lowerQuery) ||
        (block.examples && block.examples.some((example) => example.toLowerCase().includes(lowerQuery))),
    );
  });
}
