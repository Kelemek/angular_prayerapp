import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { BibleBooksMemorizationListComponent } from './bible-books-memorization-list.component';

describe('BibleBooksMemorizationListComponent', () => {
  it('lists all books for scope all with testament tabs', async () => {
    await render(BibleBooksMemorizationListComponent, {
      componentInputs: { scope: 'all' },
    });
    expect(screen.getByRole('tablist', { name: /Testament/i })).toBeTruthy();
    expect(screen.getByText('Genesis')).toBeTruthy();
    expect(screen.getByTestId('bible-books-memorization-list')).toBeTruthy();
  });

  it('shows only OT books for ot scope without tabs', async () => {
    await render(BibleBooksMemorizationListComponent, {
      componentInputs: { scope: 'ot' },
    });
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('Genesis')).toBeTruthy();
    expect(screen.queryByText('Matthew')).toBeNull();
  });

  it('shows only NT books for nt scope', async () => {
    await render(BibleBooksMemorizationListComponent, {
      componentInputs: { scope: 'nt' },
    });
    expect(screen.getByText('Matthew')).toBeTruthy();
    expect(screen.queryByText('Genesis')).toBeNull();
  });

  it('switches testament tab for scope all', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(BibleBooksMemorizationListComponent, {
      componentInputs: { scope: 'all' },
    });
    expect(screen.getByText('Genesis')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: /New Testament/i }));
    expect(fixture.componentInstance.testament).toBe('nt');
    expect(screen.getByText('Matthew')).toBeTruthy();
    expect(screen.queryByText('Genesis')).toBeNull();
  });

  it('reinitializes when scope input changes', async () => {
    const { fixture } = await render(BibleBooksMemorizationListComponent, {
      componentInputs: { scope: 'all' },
    });
    fixture.componentRef.setInput('scope', 'nt');
    fixture.detectChanges();
    expect(fixture.componentInstance.showTabs).toBe(false);
    expect(fixture.componentInstance.testament).toBe('nt');
    expect(screen.getByText('Matthew')).toBeTruthy();
  });

  it('disables inner scroll when innerScroll is false (parent scrolls)', async () => {
    const { fixture } = await render(BibleBooksMemorizationListComponent, {
      componentInputs: { scope: 'all', innerScroll: false },
    });
    const list = screen.getByTestId('bible-books-memorization-list');
    expect(list.className).not.toContain('overflow-y-auto');
    expect(list.className).not.toContain('max-h-');
    expect(fixture.componentInstance.rootClass).not.toContain('flex-1');
  });
});
