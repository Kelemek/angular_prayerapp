import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APP_BECAME_VISIBLE_EVENT,
  BLANK_RESUME_RELOAD_GUARD_KEY,
  RESUME_PAINT_CLASS,
  applyResumePaintHint,
  clearBlankResumeReloadGuard,
  dispatchAppBecameVisible,
  isRoutedPagePainted,
  maybeReloadBlankVisiblePage,
} from './visible-page-recovery';

describe('visible-page-recovery', () => {
  afterEach(() => {
    sessionStorage.clear();
    document.documentElement.classList.remove(RESUME_PAINT_CLASS);
    document.body.innerHTML = '';
  });

  it('detects a painted routed page', () => {
    const home = document.createElement('app-home');
    Object.defineProperty(home, 'scrollHeight', { value: 400 });
    document.body.appendChild(home);
    expect(isRoutedPagePainted()).toBe(true);
  });

  it('is false when no routed page is mounted', () => {
    expect(isRoutedPagePainted()).toBe(false);
  });

  it('does not reload while the Angular shell is still attached', () => {
    const reload = vi.fn();
    expect(
      maybeReloadBlankVisiblePage({
        hidden: false,
        painted: false,
        previouslyPainted: true,
        shellAttached: true,
        reload,
      })
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when this document has never painted a routed page', () => {
    const reload = vi.fn();
    expect(
      maybeReloadBlankVisiblePage({
        hidden: false,
        painted: false,
        previouslyPainted: false,
        reload,
      })
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once when visible but unpainted', () => {
    const reload = vi.fn();
    expect(
      maybeReloadBlankVisiblePage({
        hidden: false,
        painted: false,
        previouslyPainted: true,
        reload,
      })
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(BLANK_RESUME_RELOAD_GUARD_KEY)).toBe('1');

    expect(
      maybeReloadBlankVisiblePage({
        hidden: false,
        painted: false,
        previouslyPainted: true,
        reload,
      })
    ).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clears the blank guard when the page is painted', () => {
    sessionStorage.setItem(BLANK_RESUME_RELOAD_GUARD_KEY, '1');
    const reload = vi.fn();
    expect(
      maybeReloadBlankVisiblePage({
        hidden: false,
        painted: true,
        reload,
      })
    ).toBe(false);
    expect(sessionStorage.getItem(BLANK_RESUME_RELOAD_GUARD_KEY)).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload while hidden', () => {
    const reload = vi.fn();
    expect(
      maybeReloadBlankVisiblePage({
        hidden: true,
        painted: false,
        reload,
      })
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('dispatches app-became-visible', () => {
    const spy = vi.fn();
    window.addEventListener(APP_BECAME_VISIBLE_EVENT, spy);
    dispatchAppBecameVisible();
    expect(spy).toHaveBeenCalled();
    window.removeEventListener(APP_BECAME_VISIBLE_EVENT, spy);
  });

  it('applies then clears the resume paint class around a reflow', () => {
    applyResumePaintHint();
    expect(document.documentElement.classList.contains(RESUME_PAINT_CLASS)).toBe(
      false
    );
  });

  it('clearBlankResumeReloadGuard removes the key', () => {
    sessionStorage.setItem(BLANK_RESUME_RELOAD_GUARD_KEY, '1');
    clearBlankResumeReloadGuard();
    expect(sessionStorage.getItem(BLANK_RESUME_RELOAD_GUARD_KEY)).toBeNull();
  });
});
