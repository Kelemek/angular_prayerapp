import { afterEach, beforeEach, describe, expect, it, vi, beforeAll } from 'vitest';
import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import {
  MEMORIZE_TABLE_SORT_KEY,
  loadMemorizeTableSort,
} from '../../lib/memorization/memorization-list-prefs';
import type { MemorizedItem } from '../../types/memorization';
import { MemorizedVersesTableComponent } from './memorized-verses-table.component';
import { ScriptureService } from '../../services/scripture.service';
import { resolveScriptureHoverPreviewComponentResources } from '../scripture-hover-preview/scripture-hover-preview-component-resources.spec-helper';

beforeAll(async () => {
  await resolveScriptureHoverPreviewComponentResources();
});

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

@Component({
  standalone: true,
  imports: [MemorizedVersesTableComponent],
  template: `
    <app-memorized-verses-table
      [items]="items"
      (practice)="onPractice($event)"
      (remove)="onRemove($event)"
    />
  `,
})
class HostComponent {
  items: MemorizedItem[] = [
    item({
      id: 'm',
      reference: 'John 3:16',
      practiceSessions: sessions(9),
      translation: 'niv',
    }),
    item({
      id: 'l',
      reference: 'Genesis 1:1',
      practiceSessions: sessions(1),
      translation: 'kjv',
    }),
    item({
      id: 'p',
      reference: 'Romans 8:28',
      practiceSessions: sessions(4),
      translation: 'esv',
    }),
  ];
  onPractice = vi.fn();
  onRemove = vi.fn();
}

describe('MemorizedVersesTableComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(MEMORIZE_TABLE_SORT_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(MEMORIZE_TABLE_SORT_KEY);
  });

  async function renderTable() {
    return render(HostComponent, {
      providers: [
        {
          provide: ScriptureService,
          useValue: {
            getPassage: vi.fn(() =>
              Promise.resolve({
                reference: 'John 3:16',
                text: 'For God so loved',
                translation: 'esv',
              })
            ),
          },
        },
      ],
    });
  }

  function practiceReferences(): string[] {
    return screen.getAllByTestId('memorize-table-practice').map((el) => {
      const refLine = el.querySelector('span.flex');
      return (refLine?.textContent ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
    });
  }

  it('defaults to mastery ascending with Learning on top', async () => {
    await renderTable();
    expect(practiceReferences()).toEqual([
      'Genesis 1:1',
      'Romans 8:28',
      'John 3:16',
    ]);
    expect(screen.getByRole('button', { name: /Mastery ↑/i })).toBeTruthy();
  });

  it('persists sort when a header is toggled', async () => {
    const user = userEvent.setup();
    await renderTable();

    await user.click(screen.getByRole('button', { name: /Reference/i }));
    expect(loadMemorizeTableSort()).toEqual({
      sortBy: 'reference',
      sortDirection: 'asc',
    });

    await user.click(screen.getByRole('button', { name: /Reference ↑/i }));
    expect(loadMemorizeTableSort()).toEqual({
      sortBy: 'reference',
      sortDirection: 'desc',
    });
  });

  it('shows full Sessions label with sort arrow after toggling sessions sort', async () => {
    const user = userEvent.setup();
    await renderTable();

    await user.click(screen.getByTitle('Click to sort by sessions'));
    const sessionsHeader = screen.getByTitle('Click to sort by sessions');
    expect(sessionsHeader.textContent).toMatch(/Sessions\s*↑/);

    const headerRow = sessionsHeader.closest('.grid') as HTMLElement;
    expect(headerRow.className).toContain('max-content');
  });

  it('restores saved sort on init', async () => {
    localStorage.setItem(
      MEMORIZE_TABLE_SORT_KEY,
      JSON.stringify({ sortBy: 'sessions', sortDirection: 'asc' })
    );
    await renderTable();
    expect(practiceReferences()).toEqual([
      'Genesis 1:1',
      'Romans 8:28',
      'John 3:16',
    ]);
  });

  it('emits practice and remove', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderTable();
    const host = fixture.componentInstance;

    await user.click(screen.getAllByTestId('memorize-table-practice')[0]!);
    expect(host.onPractice).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'Genesis 1:1' })
    );

    await user.click(screen.getAllByTestId('memorize-table-remove')[0]!);
    expect(host.onRemove).toHaveBeenCalled();
  });

  it('fits all columns without a horizontal scroll container', async () => {
    await renderTable();
    const root = screen.getByTestId('memorized-verses-table');
    expect(root.className).toContain('w-full');
    expect(root.className).toContain('min-w-0');
    expect(root.className).not.toContain('overflow-x-auto');
    expect(screen.getByRole('button', { name: /Mastery/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reference/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sessions/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Version/i })).toBeNull();
  });

  it('renders book and citation so citation can stay visible when book truncates', async () => {
    await renderTable();
    const first = screen.getAllByTestId('memorize-table-practice')[0]!;
    const refLine = first.querySelector('span.flex') as HTMLElement;
    const spans = refLine.querySelectorAll(':scope > span');
    expect(spans[0]?.textContent).toBe('Genesis');
    expect(spans[1]?.textContent).toBe(' 1:1');
    expect(spans[1]?.className).toContain('shrink-0');
    expect(spans[0]?.className).toContain('truncate');
  });

  it('shows translation under the reference in secondary text', async () => {
    await renderTable();
    const versions = screen.getAllByTestId('memorize-table-version');
    expect(versions.map((el) => el.textContent?.trim())).toEqual(['KJV', 'ESV', 'NIV']);
    expect(versions[0]?.className).toContain('text-xs');
    expect(versions[0]?.className).toContain('text-gray-600');
    expect(versions[0]?.className).toContain('dark:text-gray-400');
  });

  it('uses the same surface colors as memorized verse cards', async () => {
    await renderTable();
    const root = screen.getByTestId('memorized-verses-table');
    const header = root.firstElementChild as HTMLElement;
    const row = root.querySelector('[role="listitem"]') as HTMLElement;
    expect(header.className).toContain('bg-white');
    expect(header.className).toContain('dark:bg-gray-800');
    expect(header.className).toContain('shadow-md');
    expect(row.className).toContain('bg-white');
    expect(row.className).toContain('dark:bg-gray-800');
    expect(row.className).toContain('shadow-md');
    expect(row.className).not.toContain('bg-gray-50');
    expect(row.className).not.toContain('bg-gray-900/50');
  });
});
