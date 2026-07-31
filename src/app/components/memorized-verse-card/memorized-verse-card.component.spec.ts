import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { MemorizedVerseCardComponent } from './memorized-verse-card.component';
import { ScriptureService } from '../../services/scripture.service';
import type { MemorizedItem } from '../../types/memorization';

const mockScriptureService = {
  getPassage: vi.fn(() =>
    Promise.resolve({
      reference: 'John 3:16',
      text: 'For God so loved the world',
      translation: 'esv',
    })
  ),
  getAudioUrl: vi.fn(),
};

describe('MemorizedVerseCardComponent', () => {
  const verseItem: MemorizedItem = {
    id: 'v1',
    reference: 'John 3:16',
    text: 'For God so loved the world',
    translation: 'esv',
    dateAdded: Date.now(),
    lastPracticedAt: new Date('2026-03-15').getTime(),
    practiceSessions: [
      { date: 1, wrongAttempts: 0, correctKeystrokes: 10, completed: true },
      { date: 2, wrongAttempts: 1, correctKeystrokes: 8, completed: false },
    ],
    kind: 'verse',
  };

  const bibleBooksItem: MemorizedItem = {
    id: 'bb1',
    reference: 'Bible Books (OT)',
    text: 'Genesis Exodus',
    translation: 'esv',
    dateAdded: Date.now(),
    lastPracticedAt: null,
    practiceSessions: [],
    kind: 'bibleBooks',
    bibleBooksScope: 'ot',
  };

  const renderCard = (item: MemorizedItem) =>
    render(MemorizedVerseCardComponent, {
      componentInputs: { item },
      providers: [{ provide: ScriptureService, useValue: mockScriptureService }],
    });

  it('renders verse reference, translation, and session stats', async () => {
    await renderCard(verseItem);
    expect(screen.getByText('John 3:16')).toBeTruthy();
    expect(screen.getByText(/ESV/i)).toBeTruthy();
    expect(screen.getByText(/Sessions: 1 completed/i)).toBeTruthy();
    expect(screen.getByText(/Last:/)).toBeTruthy();
  });

  it('renders bible books count label instead of translation', async () => {
    await renderCard(bibleBooksItem);
    expect(screen.getByText('Bible Books (OT)')).toBeTruthy();
    expect(screen.getByText(/39 books/i)).toBeTruthy();
    expect(screen.queryByText(/ESV/i)).toBeNull();
  });

  it('wraps verse card in scripture hover preview', async () => {
    const { container } = await renderCard(verseItem);
    expect(container.querySelector('app-scripture-hover-preview')).toBeTruthy();
  });

  it('uses independent Memorize outlined blue hover on practice and remove controls', async () => {
    const { getByTestId } = await renderCard(bibleBooksItem);
    const practice = getByTestId('memorize-card-practice');
    const remove = getByTestId('memorize-card-remove');

    expect(practice.className).toContain('hover:!border-[#0047AB]');
    expect(practice.className).toContain('hover:!bg-blue-100');
    expect(practice.className).toContain('dark:hover:!bg-blue-950');

    expect(remove.className).toContain('hover:!border-[#0047AB]');
    expect(remove.className).toContain('hover:!bg-blue-100');
    expect(remove.className).toContain('dark:hover:!bg-blue-950');
    expect(remove.className).toContain('hover:text-red-600');
  });

  it('emits practice when main button is clicked', async () => {
    const user = userEvent.setup();
    const practice = vi.fn();
    const { fixture } = await renderCard(verseItem);
    fixture.componentInstance.practice.subscribe(practice);

    const [practiceBtn] = screen.getAllByRole('button');
    await user.click(practiceBtn);
    expect(practice).toHaveBeenCalledWith(verseItem);
  });

  it('emits remove when remove button is clicked', async () => {
    const user = userEvent.setup();
    const remove = vi.fn();
    const { fixture } = await renderCard(verseItem);
    fixture.componentInstance.remove.subscribe(remove);

    await user.click(screen.getByRole('button', { name: 'Remove John 3:16' }));
    expect(remove).toHaveBeenCalledWith(verseItem);
  });

  it('formatDate formats valid timestamps', () => {
    const component = new MemorizedVerseCardComponent();
    expect(component.formatDate(new Date('2026-01-15').getTime())).toMatch(/Jan/);
  });

  it('formatDate returns em dash when Date throws', () => {
    const component = new MemorizedVerseCardComponent();
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new Error('bad date');
    });
    expect(component.formatDate(1)).toBe('—');
  });

  it('masterLabel reflects practicing and mastered levels', () => {
    const component = new MemorizedVerseCardComponent();
    component.item = {
      ...verseItem,
      practiceSessions: Array.from({ length: 5 }, (_, i) => ({
        date: i,
        wrongAttempts: 0,
        correctKeystrokes: 10,
        completed: true,
      })),
    };
    expect(component.masterLabel).toBe('Practicing');

    component.item = {
      ...verseItem,
      practiceSessions: Array.from({ length: 12 }, (_, i) => ({
        date: i,
        wrongAttempts: 0,
        correctKeystrokes: 10,
        completed: true,
      })),
    };
    expect(component.masterLabel).toBe('Mastered');
  });
});
