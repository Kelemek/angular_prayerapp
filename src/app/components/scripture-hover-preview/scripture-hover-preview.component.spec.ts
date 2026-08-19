import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { ChangeDetectorRef, DestroyRef, ElementRef } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import {
  ScriptureHoverPreviewComponent,
  clearScriptureHoverPreviewCacheForTests,
} from './scripture-hover-preview.component';
import { resolveScriptureHoverPreviewComponentResources } from './scripture-hover-preview-component-resources.spec-helper';
import { ScriptureService } from '../../services/scripture.service';
import type { ScriptureService as ScriptureServiceType } from '../../services/scripture.service';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

beforeAll(async () => {
  await resolveScriptureHoverPreviewComponentResources();
});

describe('ScriptureHoverPreviewComponent', () => {
  let component: ScriptureHoverPreviewComponent;
  let getPassage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearScriptureHoverPreviewCacheForTests();
    vi.useFakeTimers();
    getPassage = vi.fn(() =>
      Promise.resolve({
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'esv',
      })
    );

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '(hover: none)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });

    const scripture = { getPassage } as unknown as ScriptureServiceType;
    const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
    const destroyRef = { onDestroy: vi.fn() } as unknown as DestroyRef;

    component = Object.create(ScriptureHoverPreviewComponent.prototype);
    Object.assign(component, {
      reference: 'John 3:16',
      translation: 'esv',
      hoverDelayMs: 500,
      disabled: false,
      isVisible: false,
      openedByLongPress: false,
      loading: false,
      error: null,
      passage: null,
      positionX: 0,
      positionY: 0,
      popoverWidthPx: 448,
      popoverMaxHeightPx: 320,
      isAbove: true,
      hoverTimeout: null,
      hoverHideTimeout: null,
      longPressTimeout: null,
      longPressTriggered: false,
      touchStartX: 0,
      touchStartY: 0,
      pointerOverPopover: false,
      exclusiveToken: 0,
      fetchGeneration: 0,
      anchorCx: 0,
      anchorCy: 0,
      portalView: null,
      dismissListenersAttached: false,
      scripture,
      cdr,
      destroyRef,
      appRef: { attachView: vi.fn(), detachView: vi.fn() },
      triggerEl: {
        nativeElement: document.createElement('div'),
      } as ElementRef<HTMLElement>,
      attachPortal: vi.fn(),
      detachPortal: vi.fn(),
      attachDismissListeners: vi.fn(),
      detachDismissListeners: vi.fn(),
      setPositionFromPoint: vi.fn(),
      nudgeAfterLayout: vi.fn(),
      syncPortalView: vi.fn(),
      getPopoverElement: vi.fn(() => null),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    clearScriptureHoverPreviewCacheForTests();
  });

  it('fetches after hover delay and caches for re-hover', async () => {
    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 40,
      right: 300,
      bottom: 140,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    expect(getPassage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(getPassage).toHaveBeenCalledWith('John 3:16', 'esv');
    expect(component.isVisible).toBe(true);
    expect(component.passage?.text).toContain('For God so loved');

    getPassage.mockClear();
    component.hide();
    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(getPassage).not.toHaveBeenCalled();
    expect(component.passage?.text).toContain('For God so loved');
  });

  it('strips KJV pilcrow marks from fetched passage text before display', async () => {
    getPassage.mockResolvedValueOnce({
      reference: 'John 3:16',
      text: '¶ For God so loved the world',
      translation: 'kjv',
    });
    component.translation = 'kjv';

    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 40,
      right: 300,
      bottom: 140,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(component.passage?.text).toBe('For God so loved the world');
    expect(component.passage?.text).not.toContain('¶');
  });

  it('hides on mouse leave before delay completes', async () => {
    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 10,
      height: 10,
      right: 10,
      bottom: 10,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    component.onMouseLeave();
    await vi.advanceTimersByTimeAsync(500);
    expect(getPassage).not.toHaveBeenCalled();
    expect(component.isVisible).toBe(false);
  });

  it('keeps hover preview open when pointer moves into popover to scroll', async () => {
    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 40,
      right: 300,
      bottom: 140,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(component.isVisible).toBe(true);

    component.onMouseLeave();
    component.onPopoverMouseEnter();
    await vi.advanceTimersByTimeAsync(200);

    expect(component.isVisible).toBe(true);
    expect(component['pointerOverPopover']).toBe(true);

    component.onPopoverMouseLeave();
    expect(component.isVisible).toBe(false);
  });

  it('dismisses hover preview when the trigger is clicked for a primary action', async () => {
    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 40,
      right: 300,
      bottom: 140,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);
    component.triggerEl = { nativeElement: target } as ElementRef<HTMLElement>;

    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(component.isVisible).toBe(true);

    const popover = document.createElement('div');
    (component as any).getPopoverElement = () => popover;

    (component as any).handlePointerDownDismiss({
      target: target,
    } as unknown as PointerEvent);
    expect(component.isVisible).toBe(false);

    await (component as any).showPreview('John 3:16', 'esv');
    expect(component.isVisible).toBe(true);
    (component as any).handlePointerDownDismiss({
      target: popover,
    } as unknown as PointerEvent);
    expect(component.isVisible).toBe(true);
  });

  it('dismisses hover preview on keyboard activation of the trigger', async () => {
    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 40,
      right: 300,
      bottom: 140,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(component.isVisible).toBe(true);

    component.onTriggerKeydown({ key: 'Enter' } as KeyboardEvent);
    expect(component.isVisible).toBe(false);

    await (component as any).showPreview('John 3:16', 'esv');
    expect(component.isVisible).toBe(true);
    component.onTriggerKeydown({ key: ' ' } as KeyboardEvent);
    expect(component.isVisible).toBe(false);
  });

  it('blocks keyboard activation while a long-press preview is open', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(hover: none)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });

    const touch = { clientX: 120, clientY: 80 };
    component.onTouchStart({
      changedTouches: [touch],
      touches: [touch],
    } as unknown as TouchEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(component.isVisible).toBe(true);
    expect(component.openedByLongPress).toBe(true);

    const keyEvent = {
      key: 'Enter',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    component.onTriggerKeydown(keyEvent as unknown as KeyboardEvent);

    expect(keyEvent.preventDefault).toHaveBeenCalled();
    expect(keyEvent.stopPropagation).toHaveBeenCalled();
    expect(component.isVisible).toBe(false);
    expect(component.openedByLongPress).toBe(false);
  });

  it('cancels pending hover open when the trigger is activated before the delay', async () => {
    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 40,
      right: 300,
      bottom: 140,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    expect((component as any).hoverTimeout).not.toBeNull();

    component.onTriggerActivate();
    expect((component as any).hoverTimeout).toBeNull();

    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(getPassage).not.toHaveBeenCalled();
    expect(component.isVisible).toBe(false);
  });

  it('dismisses long-press preview on viewport resize and touchcancel', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(hover: none)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });

    const touch = { clientX: 120, clientY: 80 };
    component.onTouchStart({
      changedTouches: [touch],
      touches: [touch],
    } as unknown as TouchEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(component.isVisible).toBe(true);
    expect(component.openedByLongPress).toBe(true);

    (component as any).handleResizeDismiss();
    expect(component.isVisible).toBe(false);

    component.onTouchStart({
      changedTouches: [touch],
      touches: [touch],
    } as unknown as TouchEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(component.isVisible).toBe(true);

    component.onTouchCancel();
    expect(component.isVisible).toBe(false);
    expect(component.openedByLongPress).toBe(false);
  });

  it('does nothing when disabled', () => {
    component.disabled = true;
    const target = document.createElement('div');
    component.onMouseEnter({ currentTarget: target } as unknown as MouseEvent);
    expect((component as any).hoverTimeout).toBeNull();
  });

  it('ignores late fetch after hide', async () => {
    let resolvePassage!: (v: unknown) => void;
    getPassage.mockReturnValue(
      new Promise((resolve) => {
        resolvePassage = resolve;
      })
    );

    const showPromise = (component as any).showPreview('John 3:16', 'esv');
    expect(component.loading).toBe(true);
    component.hide();

    resolvePassage({
      reference: 'John 3:16',
      text: 'stale',
      translation: 'esv',
    });
    await showPromise;

    expect(component.isVisible).toBe(false);
    expect(component.passage).toBeNull();
  });

  it('keeps long-press preview open after finger lift', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(hover: none)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });

    const touch = { clientX: 120, clientY: 80 };
    component.onTouchStart({
      changedTouches: [touch],
      touches: [touch],
    } as unknown as TouchEvent);

    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(component.isVisible).toBe(true);
    expect(component.openedByLongPress).toBe(true);

    const touchEnd = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    component.onTouchEnd(touchEnd as unknown as TouchEvent);

    expect(touchEnd.preventDefault).toHaveBeenCalled();
    expect(touchEnd.stopPropagation).toHaveBeenCalled();
    expect(component.isVisible).toBe(true);
    expect(component.openedByLongPress).toBe(true);
    expect(getPassage).toHaveBeenCalledWith('John 3:16', 'esv');

    component.closeLongPressPopup();
    expect(component.isVisible).toBe(false);
    expect(component.openedByLongPress).toBe(false);
  });

  it('clears text selection when long-press opens and blocks the context menu on touch devices', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(hover: none)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });

    const removeAllRanges = vi.fn();
    vi.spyOn(window, 'getSelection').mockReturnValue({
      removeAllRanges,
    } as unknown as Selection);

    const touch = { clientX: 120, clientY: 80 };
    component.onTouchStart({
      changedTouches: [touch],
      touches: [touch],
    } as unknown as TouchEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(component.isVisible).toBe(true);
    expect(removeAllRanges).toHaveBeenCalled();

    const contextEvent = { preventDefault: vi.fn() };
    component.onTriggerContextMenu(contextEvent as unknown as Event);
    expect(contextEvent.preventDefault).toHaveBeenCalled();
  });

  it('dismisses long-press preview when the list scrolls, but not when scrolling the popover', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(hover: none)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });

    const touch = { clientX: 120, clientY: 80 };
    component.onTouchStart({
      changedTouches: [touch],
      touches: [touch],
    } as unknown as TouchEvent);
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(component.isVisible).toBe(true);
    expect(component.openedByLongPress).toBe(true);

    const popover = document.createElement('div');
    (component as any).getPopoverElement = () => popover;

    (component as any).handleScrollDismiss({
      target: popover,
    } as unknown as Event);
    expect(component.isVisible).toBe(true);

    const listScroller = document.createElement('div');
    (component as any).handleScrollDismiss({
      target: listScroller,
    } as unknown as Event);
    expect(component.isVisible).toBe(false);
    expect(component.openedByLongPress).toBe(false);
  });

  it('cancels long-press when the finger moves while scrolling', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(hover: none)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });

    const start = { clientX: 100, clientY: 100 };
    component.onTouchStart({
      changedTouches: [start],
      touches: [start],
    } as unknown as TouchEvent);

    const moved = { clientX: 100, clientY: 130 };
    component.onTouchMove({
      changedTouches: [moved],
      touches: [moved],
    } as unknown as TouchEvent);

    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(getPassage).not.toHaveBeenCalled();
    expect(component.isVisible).toBe(false);
    expect((component as any).longPressTimeout).toBeNull();
  });

  it('closes the previous preview when another instance opens', async () => {
    const otherGetPassage = vi.fn(() =>
      Promise.resolve({
        reference: 'Romans 8:28',
        text: 'And we know that for those who love God...',
        translation: 'esv',
      })
    );
    const other = Object.create(ScriptureHoverPreviewComponent.prototype);
    Object.assign(other, {
      ...component,
      reference: 'Romans 8:28',
      scripture: { getPassage: otherGetPassage },
      cdr: { markForCheck: vi.fn() },
      attachPortal: vi.fn(),
      detachPortal: vi.fn(),
      attachDismissListeners: vi.fn(),
      detachDismissListeners: vi.fn(),
      setPositionFromPoint: vi.fn(),
      nudgeAfterLayout: vi.fn(),
      syncPortalView: vi.fn(),
      getPopoverElement: vi.fn(() => null),
      isVisible: false,
      openedByLongPress: false,
      passage: null,
      loading: false,
      error: null,
      fetchGeneration: 0,
      hoverTimeout: null,
      hoverHideTimeout: null,
      longPressTimeout: null,
      portalView: null,
      dismissListenersAttached: false,
      pointerOverPopover: false,
      exclusiveToken: 0,
    });

    await (component as any).showPreview('John 3:16', 'esv');
    expect(component.isVisible).toBe(true);

    await (other as any).showPreview('Romans 8:28', 'esv');
    expect(other.isVisible).toBe(true);
    expect(component.isVisible).toBe(false);
  });

  it('show then hide removes body portal without destroying host content', async () => {
    vi.useRealTimers();
    const getPassageFn = vi.fn(() =>
      Promise.resolve({
        reference: 'John 3:16',
        text: 'For God so loved the world',
        translation: 'esv',
      })
    );

    const { fixture } = await render(
      `
      <div data-testid="host-shell">
        <app-scripture-hover-preview reference="John 3:16" translation="esv">
          <button type="button">Card</button>
        </app-scripture-hover-preview>
      </div>
      `,
      {
        imports: [ScriptureHoverPreviewComponent],
        providers: [
          {
            provide: ScriptureService,
            useValue: { getPassage: getPassageFn, getAudioUrl: vi.fn() },
          },
        ],
      }
    );

    const preview = fixture.debugElement.query(
      (el) => el.componentInstance instanceof ScriptureHoverPreviewComponent
    )?.componentInstance as ScriptureHoverPreviewComponent;
    expect(preview).toBeTruthy();

    await (preview as unknown as { showPreview: (r: string, t: string) => Promise<void> }).showPreview(
      'John 3:16',
      'esv'
    );
    expect(document.querySelector('[data-scripture-hover-popover]')).toBeTruthy();
    expect(
      document.querySelector('[data-scripture-hover-popover]')?.className
    ).toMatch(/z-\[220\]/);
    expect(
      (document.querySelector('[data-scripture-hover-popover]') as HTMLElement).style
        .pointerEvents
    ).toBe('auto');

    (preview as unknown as { hide: () => void }).hide();
    expect(document.querySelector('[data-scripture-hover-popover]')).toBeNull();
    expect(screen.getByTestId('host-shell')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Card' })).toBeTruthy();
  });
});
