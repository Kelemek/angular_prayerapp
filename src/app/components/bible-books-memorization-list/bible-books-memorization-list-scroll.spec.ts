import { describe, it, expect, afterEach } from 'vitest';
import {
  getNearestVerticalScrollParent,
  resetBibleBooksListScroll,
} from './bible-books-memorization-list-scroll';

describe('bible-books-memorization-list-scroll', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    container?.remove();
    container = null;
  });

  it('resetBibleBooksListScroll resets inner list when innerScroll is true', () => {
    const list = document.createElement('div');
    list.style.overflowY = 'auto';
    Object.defineProperty(list, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(list, 'clientHeight', { value: 100, configurable: true });
    list.scrollTop = 120;

    resetBibleBooksListScroll(list, true);

    expect(list.scrollTop).toBe(0);
  });

  it('resetBibleBooksListScroll resets parent scroll container when innerScroll is false', () => {
    container = document.createElement('div');
    const parent = document.createElement('div');
    parent.style.overflowY = 'auto';
    Object.defineProperty(parent, 'scrollHeight', { value: 800, configurable: true });
    Object.defineProperty(parent, 'clientHeight', { value: 200, configurable: true });
    parent.scrollTop = 240;

    const list = document.createElement('div');
    parent.appendChild(list);
    container.appendChild(parent);
    document.body.appendChild(container);

    resetBibleBooksListScroll(list, false);

    expect(list.scrollTop).toBe(0);
    expect(parent.scrollTop).toBe(0);
  });

  it('getNearestVerticalScrollParent finds overflow-y-auto ancestor', () => {
    container = document.createElement('div');
    const parent = document.createElement('div');
    parent.style.overflowY = 'auto';
    const list = document.createElement('div');
    parent.appendChild(list);
    container.appendChild(parent);
    document.body.appendChild(container);

    expect(getNearestVerticalScrollParent(list)).toBe(parent);
  });
});
