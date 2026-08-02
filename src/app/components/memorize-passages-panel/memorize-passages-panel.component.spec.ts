import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { MEMORIZE_LIST_VIEW_KEY } from '../../lib/memorization/memorization-list-prefs';
import type { MemorizedItem } from '../../types/memorization';
import { MemorizePassagesPanelComponent } from './memorize-passages-panel.component';
import { ScriptureService } from '../../services/scripture.service';

function item(
  partial: Pick<MemorizedItem, 'id' | 'reference'> & Partial<MemorizedItem>
): MemorizedItem {
  return {
    text: '',
    translation: 'esv',
    dateAdded: 1,
    lastPracticedAt: null,
    practiceSessions: [],
    ...partial,
  };
}

function sessions(count: number): MemorizedItem['practiceSessions'] {
  return Array.from({ length: count }, (_, i) => ({
    date: i,
    wrongAttempts: 0,
    correctKeystrokes: 1,
    completed: true,
  }));
}

const sampleItems: MemorizedItem[] = [
  item({ id: 'l', reference: 'Genesis 1:1', practiceSessions: sessions(1) }),
  item({ id: 'p', reference: 'Romans 8:28', practiceSessions: sessions(4) }),
];

describe('MemorizePassagesPanelComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(MEMORIZE_LIST_VIEW_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(MEMORIZE_LIST_VIEW_KEY);
  });

  async function renderPanel(
    inputs: {
      items?: MemorizedItem[];
      searchTerm?: string;
      loading?: boolean;
    } = {}
  ) {
    return render(MemorizePassagesPanelComponent, {
      componentInputs: {
        items: inputs.items ?? sampleItems,
        searchTerm: inputs.searchTerm ?? '',
        loading: inputs.loading ?? false,
      },
      providers: [
        {
          provide: ScriptureService,
          useValue: {
            getPassage: vi.fn(() =>
              Promise.resolve({
                reference: 'Genesis 1:1',
                text: 'In the beginning',
                translation: 'esv',
              })
            ),
          },
        },
      ],
    });
  }

  it('defaults to cards when no preference is stored', async () => {
    await renderPanel();
    expect(screen.getByText('Learning')).toBeTruthy();
    expect(screen.getByTestId('memorize-view-cards').getAttribute('aria-pressed')).toBe(
      'true'
    );
  });

  it('restores saved table preference on load', async () => {
    localStorage.setItem(MEMORIZE_LIST_VIEW_KEY, 'table');
    await renderPanel();
    expect(screen.getByTestId('memorized-verses-table')).toBeTruthy();
    expect(screen.getByTestId('memorize-view-table').getAttribute('aria-pressed')).toBe(
      'true'
    );
  });

  it('saves list view preference when Table is clicked', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(screen.getByTestId('memorize-view-table'));
    expect(localStorage.getItem(MEMORIZE_LIST_VIEW_KEY)).toBe('table');
    expect(screen.getByTestId('memorized-verses-table')).toBeTruthy();
  });

  it('filters cards by search term', async () => {
    await renderPanel({ searchTerm: 'rom' });
    expect(screen.queryByText('Genesis 1:1')).toBeNull();
    expect(screen.getByText('Romans 8:28')).toBeTruthy();
    expect(screen.getByText('Practicing')).toBeTruthy();
  });

  it('shows search empty state when nothing matches', async () => {
    await renderPanel({ searchTerm: 'zzzz-no-match' });
    expect(screen.getByTestId('memorize-search-empty')).toBeTruthy();
  });

  it('shows empty onboarding when there are no items', async () => {
    await renderPanel({ items: [] });
    expect(screen.getByTestId('memorize-empty-state')).toBeTruthy();
  });
});
