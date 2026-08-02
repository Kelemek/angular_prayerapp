import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { MemorizationActionBarComponent } from './memorization-action-bar.component';

describe('MemorizationActionBarComponent', () => {
  it('renders add buttons', async () => {
    await render(MemorizationActionBarComponent);
    expect(screen.getByRole('button', { name: /^Add Verses$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bible Books/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Recommended/i })).toBeTruthy();
  });

  it('emits addVerses when Add Verses is clicked', async () => {
    const user = userEvent.setup();
    const addVerses = vi.fn();
    const { fixture } = await render(MemorizationActionBarComponent);
    fixture.componentInstance.addVerses.subscribe(addVerses);

    await user.click(screen.getByRole('button', { name: /^Add Verses$/i }));
    expect(addVerses).toHaveBeenCalledOnce();
  });

  it('emits addBibleBooks when Bible Books is clicked', async () => {
    const user = userEvent.setup();
    const addBibleBooks = vi.fn();
    const { fixture } = await render(MemorizationActionBarComponent);
    fixture.componentInstance.addBibleBooks.subscribe(addBibleBooks);

    await user.click(screen.getByRole('button', { name: /Bible Books/i }));
    expect(addBibleBooks).toHaveBeenCalledOnce();
  });

  it('emits openRecommended when Recommended is clicked', async () => {
    const user = userEvent.setup();
    const openRecommended = vi.fn();
    const { fixture } = await render(MemorizationActionBarComponent);
    fixture.componentInstance.openRecommended.subscribe(openRecommended);

    await user.click(screen.getByRole('button', { name: /Recommended/i }));
    expect(openRecommended).toHaveBeenCalledOnce();
  });

  it('applies soft blue styles to secondary buttons when their modal is active', async () => {
    await render(MemorizationActionBarComponent, {
      componentInputs: {
        bibleBooksActive: true,
        recommendedActive: false,
      },
    });

    const bibleBooks = screen.getByRole('button', { name: /Bible Books/i });
    const recommended = screen.getByRole('button', { name: /Recommended/i });

    expect(bibleBooks.className).toContain('bg-blue-100');
    expect(bibleBooks.className).toContain('dark:bg-blue-950');
    expect(bibleBooks.className).toContain('#0047AB');
    expect(bibleBooks.getAttribute('aria-pressed')).toBe('true');

    expect(recommended.className).toContain('bg-white');
    expect(recommended.className).toContain('dark:bg-gray-800');
    expect(recommended.className).toContain('hover:ring-[#0047AB]');
    expect(recommended.className).toContain('dark:hover:!bg-blue-950');
    expect(recommended.getAttribute('aria-pressed')).toBe('false');
  });

  it('emits listViewChange when Table is clicked', async () => {
    const user = userEvent.setup();
    const listViewChange = vi.fn();
    const { fixture } = await render(MemorizationActionBarComponent, {
      componentInputs: { listView: 'cards' },
    });
    fixture.componentInstance.listViewChange.subscribe(listViewChange);

    await user.click(screen.getByTestId('memorize-view-table'));
    expect(listViewChange).toHaveBeenCalledWith('table');
  });

  it('marks Cards as pressed when listView is cards', async () => {
    await render(MemorizationActionBarComponent, {
      componentInputs: { listView: 'cards' },
    });
    expect(screen.getByTestId('memorize-view-cards').getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByTestId('memorize-view-table').getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('places a compact Cards/Table toggle under the actions, right-aligned with a View label', async () => {
    const { container } = await render(MemorizationActionBarComponent);
    const bar = container.querySelector('#tour-memorize-action-bar');
    expect(bar?.className).toContain('flex-col');
    expect(bar?.className).toContain('gap-2');
    expect(bar?.className).toContain('mb-2');
    const row = screen.getByTestId('memorize-list-layout-row');
    expect(row.className).toContain('self-end');
    expect(row.textContent).toContain('View');
    const label = container.querySelector('#memorize-list-layout-label');
    expect(label?.textContent?.trim()).toBe('View');
    const toggle = screen.getByTestId('memorize-list-layout-toggle');
    expect(toggle.getAttribute('aria-labelledby')).toBe('memorize-list-layout-label');
    expect(screen.getByTestId('memorize-view-cards').className).toContain('text-xs');
    const actionsRow = bar?.querySelector('.flex.w-full.min-w-0.gap-2');
    expect(actionsRow).toBeTruthy();
    expect(
      actionsRow!.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('does not use hover/active ring styles on the layout toggle (avoids size jump)', async () => {
    await render(MemorizationActionBarComponent, {
      componentInputs: { listView: 'table' },
    });
    const cards = screen.getByTestId('memorize-view-cards');
    const table = screen.getByTestId('memorize-view-table');
    expect(cards.className).not.toMatch(/(?:^|\s)hover:ring(?:\s|$)/);
    expect(table.className).not.toMatch(/(?:^|\s)ring(?:\s|$)/);
    expect(table.className).not.toContain('hover:ring');
  });
});
