import type { MemorizedItem } from '../../types/memorization';
import { groupItemsByMasterLevel } from './memorization-mastery';
import { filterMemorizedItemsBySearch } from './memorization-search';

export interface MemorizedVerseSection {
  title: string;
  items: MemorizedItem[];
  headingClass: string;
}

const SECTION_HEADING =
  'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2';

/** Group already-filtered items into Learning / Practicing / Mastered (omit empty). */
export function memorizedVerseSectionsFromItems(
  items: MemorizedItem[]
): MemorizedVerseSection[] {
  const grouped = groupItemsByMasterLevel(items);
  const sections: MemorizedVerseSection[] = [];
  if (grouped.learning.length > 0) {
    sections.push({
      title: 'Learning',
      items: grouped.learning,
      headingClass: SECTION_HEADING,
    });
  }
  if (grouped.practicing.length > 0) {
    sections.push({
      title: 'Practicing',
      items: grouped.practicing,
      headingClass: `${SECTION_HEADING} mt-4`,
    });
  }
  if (grouped.mastered.length > 0) {
    sections.push({
      title: 'Mastered',
      items: grouped.mastered,
      headingClass: `${SECTION_HEADING} mt-4`,
    });
  }
  return sections;
}

/** Filter once, then build card sections from that same list. */
export function buildFilteredMemorizedList(
  items: MemorizedItem[],
  searchTerm: string
): {
  filtered: MemorizedItem[];
  sections: MemorizedVerseSection[];
} {
  const filtered = filterMemorizedItemsBySearch(items, searchTerm);
  return {
    filtered,
    sections: memorizedVerseSectionsFromItems(filtered),
  };
}
