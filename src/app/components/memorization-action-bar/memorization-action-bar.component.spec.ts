import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { MemorizationActionBarComponent } from './memorization-action-bar.component';

describe('MemorizationActionBarComponent', () => {
  it('renders add buttons', async () => {
    await render(MemorizationActionBarComponent);
    expect(screen.getByRole('button', { name: /^Verses$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bible Books/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Recommended/i })).toBeTruthy();
  });

  it('emits addVerses when Verses is clicked', async () => {
    const user = userEvent.setup();
    const addVerses = vi.fn();
    const { fixture } = await render(MemorizationActionBarComponent);
    fixture.componentInstance.addVerses.subscribe(addVerses);

    await user.click(screen.getByRole('button', { name: /^Verses$/i }));
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
});
