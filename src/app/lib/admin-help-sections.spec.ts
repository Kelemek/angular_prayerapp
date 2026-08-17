import { describe, it, expect } from 'vitest';
import {
  ADMIN_HELP_SECTIONS,
  ADMIN_HELP_TOUR_IDS,
  filterAdminHelpSections,
  isAdminHelpTourId,
} from './admin-help-sections';
import type { AdminHelpSection } from '../types/admin-help-content';

function section(overrides: Partial<AdminHelpSection> = {}): AdminHelpSection {
  return {
    id: 's1',
    kind: 'article',
    title: 'Test topic',
    description: 'Desc',
    icon: '<svg></svg>',
    content: [{ subtitle: 'A', text: 'Body' }],
    order: 1,
    isActive: true,
    ...overrides,
  };
}

describe('admin help sections catalog', () => {
  it('includes the guided-tour topics in order', () => {
    const ids = ADMIN_HELP_SECTIONS.map((s) => s.id);
    expect(ids).toEqual([
      ADMIN_HELP_TOUR_IDS.emailSubscribersOverview,
      ADMIN_HELP_TOUR_IDS.emailSubscribers,
      ADMIN_HELP_TOUR_IDS.prayerEditorCreate,
      ADMIN_HELP_TOUR_IDS.prayerEditorManage,
      ADMIN_HELP_TOUR_IDS.promptsAndTypes,
      ADMIN_HELP_TOUR_IDS.memorizeRecommendations,
    ]);
    expect(ADMIN_HELP_SECTIONS.every((s) => s.kind === 'tour' && s.isActive)).toBe(true);
  });

  it('isAdminHelpTourId accepts catalog ids only', () => {
    expect(isAdminHelpTourId(ADMIN_HELP_TOUR_IDS.emailSubscribers)).toBe(true);
    expect(isAdminHelpTourId('not_a_tour')).toBe(false);
  });
});

describe('filterAdminHelpSections', () => {
  it('returns only active sections when query is empty', () => {
    const sections = [section({ id: 'a', isActive: true }), section({ id: 'b', isActive: false, title: 'Hidden' })];
    expect(filterAdminHelpSections(sections, '').map((s) => s.id)).toEqual(['a']);
  });

  it('matches title, description, content, and examples', () => {
    expect(filterAdminHelpSections([section({ title: 'UniqueTitle' })], 'uniquetitle')).toHaveLength(1);
    expect(filterAdminHelpSections([section({ description: 'FindMeDesc' })], 'findme')).toHaveLength(1);
    expect(
      filterAdminHelpSections([section({ content: [{ subtitle: 'SubMatch', text: 'x' }] })], 'submatch'),
    ).toHaveLength(1);
    expect(
      filterAdminHelpSections(
        [section({ content: [{ subtitle: 'S', text: 'T', examples: ['ExamplePhrase'] }] })],
        'examplephrase',
      ),
    ).toHaveLength(1);
  });

  it('excludes inactive sections even when query matches', () => {
    expect(filterAdminHelpSections([section({ title: 'Visible', isActive: false })], 'visible')).toHaveLength(0);
  });
});
