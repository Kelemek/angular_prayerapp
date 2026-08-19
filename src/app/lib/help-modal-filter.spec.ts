import { describe, it, expect } from 'vitest';
import {
  filterHelpModalSections,
  sortActiveHelpSectionsForFullTour,
} from './help-modal-filter';
import type { HelpSection } from '../types/help-content';

function section(
  id: string,
  overrides: Partial<HelpSection> = {}
): HelpSection {
  return {
    id,
    title: overrides.title ?? id,
    description: overrides.description ?? '',
    icon: overrides.icon ?? '',
    order: overrides.order ?? 0,
    isActive: overrides.isActive ?? true,
    content: overrides.content ?? [],
  };
}

describe('filterHelpModalSections', () => {
  it('returns all sections when query is empty or whitespace', () => {
    const sections = [
      section('1', { title: 'Getting Started' }),
      section('2', { title: 'Advanced' }),
    ];
    expect(filterHelpModalSections(sections, '')).toHaveLength(2);
    expect(filterHelpModalSections(sections, '   ')).toHaveLength(2);
  });

  it('filters by title, description, content, and examples', () => {
    const sections = [
      section('1', {
        title: 'Getting Started',
        description: 'Intro',
        content: [
          {
            subtitle: 'FAQ',
            text: 'user-generated content',
            examples: ['pray daily'],
          },
        ],
      }),
      section('2', { title: 'API', description: 'Technical' }),
    ];
    expect(filterHelpModalSections(sections, 'getting')).toHaveLength(1);
    expect(filterHelpModalSections(sections, 'technical')).toHaveLength(1);
    expect(filterHelpModalSections(sections, 'faq')).toHaveLength(1);
    expect(filterHelpModalSections(sections, 'pray daily')).toHaveLength(1);
  });
});

describe('sortActiveHelpSectionsForFullTour', () => {
  it('returns only active sections sorted by order', () => {
    const sorted = sortActiveHelpSectionsForFullTour([
      section('b', { order: 2, isActive: true }),
      section('a', { order: 1, isActive: false }),
      section('c', { order: 3, isActive: true }),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(['b', 'c']);
  });
});
