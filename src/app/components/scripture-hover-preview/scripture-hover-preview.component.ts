import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EmbeddedViewRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { ScriptureService, type ScripturePassage } from '../../services/scripture.service';
import { stripNonTypableScriptureMarks } from '../../lib/memorization/strip-scripture-for-memorization';
import type { BibleTranslation } from '../../types/memorization';

const MODAL_WIDTH_CAP_DEFAULT_PX = 448;
const MODAL_WIDTH_CAP_TABLET_PX = 520;
const MODAL_WIDTH_CAP_DESKTOP_PX = 600;
const MODAL_WIDTH_BREAKPOINT_TABLET = 640;
const MODAL_WIDTH_BREAKPOINT_DESKTOP = 900;
const MODAL_LAYOUT_HEIGHT_CAP_PX = 720;
const PLACEMENT_PROBE_HEIGHT_PX = 520;
const MIN_POPOVER_MAX_HEIGHT_PX = 120;
const VIEWPORT_PADDING_PX = 12;
const ANCHOR_GAP_PX = 10;
const LONG_PRESS_MS = 500;
/** Cancel pending long-press when the finger moves this far (scroll gesture). */
const LONG_PRESS_MOVE_CANCEL_PX = 10;
/** Grace period so the pointer can cross the gap into the popover to scroll. */
const HOVER_HIDE_GRACE_MS = 150;

/** Shared across preview instances so re-hover does not refetch. */
const passageCache = new Map<string, ScripturePassage>();

/** At most one body-ported preview should be open at a time. */
let exclusivePreviewToken = 0;
let dismissExclusivePreview: { token: number; dismiss: () => void } | null = null;

function cacheKey(reference: string, translation: BibleTranslation): string {
  return `${translation}:${reference.trim()}`;
}

/** Strip KJV pilcrows (etc.) so hover preview matches Memorize practice display. */
function sanitizePassageForPreview(passage: ScripturePassage): ScripturePassage {
  return {
    ...passage,
    text: stripNonTypableScriptureMarks(passage.text ?? ''),
  };
}

function modalWidthCapPx(viewportWidth: number): number {
  if (viewportWidth >= MODAL_WIDTH_BREAKPOINT_DESKTOP) return MODAL_WIDTH_CAP_DESKTOP_PX;
  if (viewportWidth >= MODAL_WIDTH_BREAKPOINT_TABLET) return MODAL_WIDTH_CAP_TABLET_PX;
  return MODAL_WIDTH_CAP_DEFAULT_PX;
}

function modalMaxHeightPx(viewportHeight: number, pad: number): number {
  const usable = viewportHeight - 2 * pad;
  return Math.min(MODAL_LAYOUT_HEIGHT_CAP_PX, Math.max(1, usable));
}

function layoutViewportSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  const rawW = vv?.width ?? document.documentElement?.clientWidth ?? window.innerWidth;
  const rawH = vv?.height ?? document.documentElement?.clientHeight ?? window.innerHeight;
  const w = Math.round(rawW > 0 ? rawW : window.innerWidth);
  const h = Math.round(rawH > 0 ? rawH : window.innerHeight);
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

function isTouchOnlyDevice(): boolean {
  return (
    Capacitor.isNativePlatform() ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none)').matches)
  );
}

@Component({
  selector: 'app-scripture-hover-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #trigger
      class="relative h-full select-none [-webkit-touch-callout:none]"
      (mouseenter)="onMouseEnter($event)"
      (mouseleave)="onMouseLeave()"
      (click)="onTriggerActivate($event)"
      (keydown.capture)="onTriggerKeydown($event)"
      (contextmenu)="onTriggerContextMenu($event)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)"
      (touchcancel)="onTouchCancel()"
    >
      <ng-content />
    </div>

    <ng-template #popoverTpl>
      @if (openedByLongPress) {
        <div
          class="fixed inset-0 z-[210]"
          data-scripture-hover-backdrop
          aria-hidden="true"
          (click)="closeLongPressPopup()"
          (touchend)="onBackdropTouchEnd($event)"
        ></div>
      }
      <div
        data-scripture-hover-popover
        class="fixed z-[220] box-border flex min-h-0 max-w-none flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl select-none [-webkit-touch-callout:none] dark:border-slate-600 dark:bg-slate-800"
        [style.left.px]="positionX"
        [style.top.px]="positionY"
        [style.width.px]="popoverWidthPx"
        [style.maxHeight]="
          'min(' + popoverMaxHeightPx + 'px, min(90dvh, calc(100dvh - 24px)))'
        "
        [style.transform]="isAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0%)'"
        style="pointer-events: auto"
        (mouseenter)="onPopoverMouseEnter()"
        (mouseleave)="onPopoverMouseLeave()"
        role="dialog"
        [attr.aria-label]="'Scripture preview for ' + reference"
      >
        <div
          class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6"
        >
          @if (loading) {
            <div class="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div
                class="h-6 w-6 shrink-0 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400"
                aria-hidden="true"
              ></div>
              <span class="text-base md:text-lg">Loading verse...</span>
            </div>
          } @else if (error) {
            <div class="text-base text-red-600 md:text-lg dark:text-red-400">
              <p class="font-medium">Error loading verse:</p>
              <p>{{ error }}</p>
            </div>
          } @else if (passage) {
            <div class="text-slate-700 dark:text-slate-200">
              <div
                class="mb-2 text-base font-medium text-slate-900 md:text-lg dark:text-slate-100"
              >
                {{ passage.reference }}
              </div>
              <div class="wrap-break-word text-base leading-relaxed md:text-lg whitespace-pre-wrap">
                {{ passage.text }}
              </div>
            </div>
          } @else {
            <div class="text-base text-slate-600 md:text-lg dark:text-slate-400">
              Hover to load verse text
            </div>
          }
        </div>

        @if (isAbove) {
          <div
            class="pointer-events-none absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-4 border-r-4 border-l-4 border-transparent border-t-white dark:border-t-slate-800"
            style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1))"
          ></div>
        } @else {
          <div
            class="pointer-events-none absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-b-4 border-r-4 border-l-4 border-transparent border-b-white dark:border-b-slate-800"
            style="filter: drop-shadow(0 -1px 1px rgba(0,0,0,0.1))"
          ></div>
        }
      </div>
    </ng-template>
  `,
})
export class ScriptureHoverPreviewComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) reference = '';
  @Input() translation: BibleTranslation = 'esv';
  @Input() hoverDelayMs = 500;
  @Input() disabled = false;

  @ViewChild('popoverTpl', { static: true }) popoverTpl!: TemplateRef<unknown>;
  @ViewChild('trigger', { static: true }) triggerEl!: ElementRef<HTMLElement>;

  isVisible = false;
  openedByLongPress = false;
  loading = false;
  error: string | null = null;
  passage: ScripturePassage | null = null;
  positionX = 0;
  positionY = 0;
  popoverWidthPx = MODAL_WIDTH_CAP_DEFAULT_PX;
  popoverMaxHeightPx = 320;
  isAbove = true;

  private hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  private hoverHideTimeout: ReturnType<typeof setTimeout> | null = null;
  private longPressTimeout: ReturnType<typeof setTimeout> | null = null;
  private longPressTriggered = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private pointerOverPopover = false;
  private exclusiveToken = 0;
  private fetchGeneration = 0;
  private anchorCx = 0;
  private anchorCy = 0;
  /** Body-ported popover view (not DomPortalOutlet — host VCR detach blanked the page). */
  private portalView: EmbeddedViewRef<unknown> | null = null;
  private dismissListenersAttached = false;

  private readonly scripture = inject(ScriptureService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly appRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.teardown());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reference'] || changes['translation'] || changes['disabled']) {
      if (this.disabled || !this.reference.trim()) {
        this.hide();
      }
    }
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  onMouseEnter(event: MouseEvent): void {
    if (this.disabled || !this.reference.trim() || isTouchOnlyDevice()) return;

    this.clearHoverTimeout();
    this.clearHoverHideTimeout();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.setPositionFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

    const refAtHover = this.reference.trim();
    const translation = this.translation;
    this.hoverTimeout = setTimeout(() => {
      this.hoverTimeout = null;
      if (this.reference.trim() !== refAtHover) return;
      this.openedByLongPress = false;
      void this.showPreview(refAtHover, translation);
    }, this.hoverDelayMs);
  }

  onMouseLeave(): void {
    this.clearHoverTimeout();
    if (this.openedByLongPress) return;
    this.scheduleHoverHide();
  }

  onPopoverMouseEnter(): void {
    this.clearHoverHideTimeout();
    this.pointerOverPopover = true;
  }

  onPopoverMouseLeave(): void {
    this.pointerOverPopover = false;
    if (!this.openedByLongPress) {
      this.hide();
    }
  }

  /**
   * Keyboard / click on the wrapped card: cancel pending hover and dismiss an open
   * hover preview. While a long-press preview is open, block Enter/Space (and stray
   * clicks) so practice/add cannot open under the overlay.
   */
  onTriggerActivate(event?: Event): void {
    this.clearHoverTimeout();
    if (this.openedByLongPress && this.isVisible) {
      event?.preventDefault();
      event?.stopPropagation();
      this.hide();
      return;
    }
    if (!this.isVisible) return;
    this.hide();
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    this.clearHoverTimeout();
    if (this.openedByLongPress && this.isVisible) {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      return;
    }
    if (this.isVisible) {
      this.hide();
    }
  }

  onTouchStart(event: TouchEvent): void {
    if (this.disabled || !this.reference.trim() || !isTouchOnlyDevice()) return;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;

    this.longPressTriggered = false;
    this.clearLongPressTimeout();
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    this.touchStartX = clientX;
    this.touchStartY = clientY;
    const refAtTouch = this.reference.trim();
    const translation = this.translation;

    this.longPressTimeout = setTimeout(() => {
      this.longPressTimeout = null;
      this.longPressTriggered = true;
      // Suppress native text selection / callout that iOS/Android start on long-press.
      this.clearTextSelection();
      this.setPositionFromPoint(clientX, clientY);
      this.openedByLongPress = true;
      void this.showPreview(refAtTouch, translation);
    }, LONG_PRESS_MS);
  }

  /** Block the native long-press context/callout menu on touch devices. */
  onTriggerContextMenu(event: Event): void {
    if (this.disabled || !isTouchOnlyDevice()) return;
    event.preventDefault();
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.longPressTimeout) return;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    if (dx * dx + dy * dy >= LONG_PRESS_MOVE_CANCEL_PX * LONG_PRESS_MOVE_CANCEL_PX) {
      this.clearLongPressTimeout();
      this.longPressTriggered = false;
    }
  }

  onTouchEnd(event: TouchEvent): void {
    this.clearLongPressTimeout();
    if (this.longPressTriggered) {
      // Suppress the synthetic click so primary card actions do not fire, but keep
      // the preview open for reading until backdrop tap or Escape.
      event.preventDefault();
      event.stopPropagation();
      this.longPressTriggered = false;
    }
  }

  onTouchCancel(): void {
    this.clearLongPressTimeout();
    this.longPressTriggered = false;
    if (this.openedByLongPress && this.isVisible) {
      this.hide();
    }
  }

  onBackdropTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.closeLongPressPopup();
  }

  closeLongPressPopup(): void {
    if (this.openedByLongPress) {
      this.hide();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isVisible) {
      this.hide();
    }
  }

  private async showPreview(
    reference: string,
    translation: BibleTranslation
  ): Promise<void> {
    this.claimExclusivePreview();
    this.isVisible = true;
    this.attachPortal();
    this.attachDismissListeners();
    this.syncPortalView();

    const key = cacheKey(reference, translation);
    const cached = passageCache.get(key);
    if (cached) {
      this.passage = cached;
      this.loading = false;
      this.error = null;
      this.syncPortalView();
      queueMicrotask(() => this.nudgeAfterLayout());
      return;
    }

    this.loading = true;
    this.error = null;
    this.passage = null;
    this.syncPortalView();

    const generation = ++this.fetchGeneration;
    try {
      const passage = sanitizePassageForPreview(
        await this.scripture.getPassage(reference, translation)
      );
      if (generation !== this.fetchGeneration || !this.isVisible) return;
      if (this.reference.trim() !== reference || this.translation !== translation) return;
      passageCache.set(key, passage);
      this.passage = passage;
      this.loading = false;
      this.error = null;
      this.syncPortalView();
      this.setPositionFromPoint(this.anchorCx, this.anchorCy);
      queueMicrotask(() => this.nudgeAfterLayout());
    } catch (err) {
      if (generation !== this.fetchGeneration || !this.isVisible) return;
      this.loading = false;
      this.error = err instanceof Error ? err.message : 'Could not load scripture text';
      this.passage = null;
      this.syncPortalView();
      this.setPositionFromPoint(this.anchorCx, this.anchorCy);
      queueMicrotask(() => this.nudgeAfterLayout());
    }
  }

  private hide(): void {
    this.fetchGeneration++;
    this.isVisible = false;
    this.openedByLongPress = false;
    this.pointerOverPopover = false;
    this.loading = false;
    this.clearHoverTimeout();
    this.clearHoverHideTimeout();
    this.detachPortal();
    this.detachDismissListeners();
    this.releaseExclusivePreview();
    this.cdr.markForCheck();
  }

  private claimExclusivePreview(): void {
    const previous = dismissExclusivePreview;
    dismissExclusivePreview = null;
    previous?.dismiss();

    const token = ++exclusivePreviewToken;
    this.exclusiveToken = token;
    dismissExclusivePreview = {
      token,
      dismiss: () => {
        this.hide();
      },
    };
  }

  private releaseExclusivePreview(): void {
    if (dismissExclusivePreview?.token === this.exclusiveToken) {
      dismissExclusivePreview = null;
    }
  }

  private setPositionFromPoint(centerX: number, centerY: number): void {
    this.anchorCx = centerX;
    this.anchorCy = centerY;

    const { w: sw, h: sh } = layoutViewportSize();
    const pad = VIEWPORT_PADDING_PX;
    const inner = sw - 2 * pad;
    const widthCap = modalWidthCapPx(sw);
    const modalWidth = inner <= 0 ? Math.min(widthCap, sw) : Math.min(widthCap, inner);
    const viewportMaxH = modalMaxHeightPx(sh, pad);
    const fitProbe = Math.min(PLACEMENT_PROBE_HEIGHT_PX, viewportMaxH);
    const gap = ANCHOR_GAP_PX;

    const halfW = modalWidth / 2;
    let x = Math.min(Math.max(centerX, pad + halfW), sw - pad - halfW);

    const aboveBottom = centerY - gap;
    const aboveTop = aboveBottom - fitProbe;
    const belowTop = centerY + gap;
    const belowBottom = belowTop + fitProbe;
    const spaceAbove = centerY - gap - pad;
    const spaceBelow = sh - pad - centerY - gap;

    let y: number;
    let positionAbove: boolean;
    let maxH: number;

    if (aboveTop >= pad) {
      positionAbove = true;
      maxH = Math.min(viewportMaxH, Math.max(MIN_POPOVER_MAX_HEIGHT_PX, centerY - gap - pad));
      y = aboveBottom;
      y = Math.min(y, sh - pad);
      y = Math.max(y, pad + maxH);
    } else if (belowBottom <= sh - pad) {
      positionAbove = false;
      maxH = Math.min(
        viewportMaxH,
        Math.max(MIN_POPOVER_MAX_HEIGHT_PX, sh - pad - centerY - gap)
      );
      y = belowTop;
      y = Math.max(pad, Math.min(y, sh - pad - maxH));
    } else if (spaceBelow >= spaceAbove) {
      positionAbove = false;
      maxH = Math.min(viewportMaxH, Math.max(MIN_POPOVER_MAX_HEIGHT_PX, spaceBelow));
      y = belowTop;
      y = Math.max(pad, Math.min(y, sh - pad - maxH));
    } else {
      positionAbove = true;
      maxH = Math.min(viewportMaxH, Math.max(MIN_POPOVER_MAX_HEIGHT_PX, spaceAbove));
      y = aboveBottom;
      y = Math.min(y, sh - pad);
      y = Math.max(y, pad + maxH);
    }

    this.popoverWidthPx = modalWidth;
    this.popoverMaxHeightPx = maxH;
    this.positionX = x;
    this.positionY = y;
    this.isAbove = positionAbove;
    this.syncPortalView();
  }

  private nudgeAfterLayout(): void {
    if (!this.isVisible) return;
    this.setPositionFromPoint(this.anchorCx, this.anchorCy);
    const el = this.getPopoverElement();
    if (!el) return;
    const pad = VIEWPORT_PADDING_PX;
    const { w: sw, h: sh } = layoutViewportSize();
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;

    let dx = 0;
    if (r.left < pad - 0.5) dx = pad - r.left;
    else if (r.right > sw - pad + 0.5) dx = sw - pad - r.right;

    let dy = 0;
    if (r.top < pad - 0.5) dy = pad - r.top;
    else if (r.bottom > sh - pad + 0.5) dy = sh - pad - r.bottom;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    this.positionX += dx;
    this.positionY += dy;
    this.syncPortalView();
  }

  private syncPortalView(): void {
    this.cdr.markForCheck();
    this.portalView?.detectChanges();
  }

  private getPopoverElement(): HTMLElement | null {
    if (!this.portalView) return null;
    for (const node of this.portalView.rootNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches('[data-scripture-hover-popover]')) return node;
      const nested = node.querySelector('[data-scripture-hover-popover]');
      if (nested instanceof HTMLElement) return nested;
    }
    return null;
  }

  private attachPortal(): void {
    if (this.portalView) return;
    const viewRef = this.popoverTpl.createEmbeddedView(null);
    this.appRef.attachView(viewRef);
    for (const node of viewRef.rootNodes) {
      if (node instanceof Node) {
        document.body.appendChild(node);
      }
    }
    this.portalView = viewRef;
    viewRef.detectChanges();
  }

  private detachPortal(): void {
    if (!this.portalView) return;
    const viewRef = this.portalView;
    this.portalView = null;
    for (const node of viewRef.rootNodes) {
      if (node instanceof Node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    this.appRef.detachView(viewRef);
    viewRef.destroy();
  }

  private readonly onScrollHide = (event: Event): void => {
    this.handleScrollDismiss(event);
  };

  /**
   * Dismiss on scroll outside the popover (list / modal scroller), including after
   * long-press — otherwise the fixed portal detaches from its card. Scroll inside
   * the popover still keeps it open for reading.
   */
  private handleScrollDismiss(event: Event): void {
    if (!this.isVisible) return;
    const popover = this.getPopoverElement();
    const target = event.target;
    if (popover && target instanceof Node && popover.contains(target)) return;
    this.hide();
  }

  private readonly onResizeHide = (): void => {
    this.handleResizeDismiss();
  };

  private handleResizeDismiss(): void {
    if (this.isVisible) this.hide();
  }

  private readonly onBlurHide = (): void => {
    if (this.isVisible && !this.openedByLongPress) this.hide();
  };

  private readonly onVisibilityHide = (): void => {
    if (document.hidden && this.isVisible && !this.openedByLongPress) this.hide();
  };

  private readonly onPointerDownOutside = (event: PointerEvent): void => {
    this.handlePointerDownDismiss(event);
  };

  /**
   * Hover previews dismiss on any pointerdown outside the popover — including the
   * trigger — so practice / add clicks are not blocked by the z-[220] portal.
   * Long-press previews use the backdrop instead.
   */
  private handlePointerDownDismiss(event: PointerEvent): void {
    if (!this.isVisible || this.openedByLongPress) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const popover = this.getPopoverElement();
    if (popover?.contains(target)) return;
    this.hide();
  }

  private attachDismissListeners(): void {
    if (this.dismissListenersAttached) return;
    this.dismissListenersAttached = true;
    window.addEventListener('scroll', this.onScrollHide, true);
    window.addEventListener('resize', this.onResizeHide);
    window.addEventListener('blur', this.onBlurHide);
    document.addEventListener('pointerdown', this.onPointerDownOutside);
    document.addEventListener('visibilitychange', this.onVisibilityHide);
  }

  private detachDismissListeners(): void {
    if (!this.dismissListenersAttached) return;
    this.dismissListenersAttached = false;
    window.removeEventListener('scroll', this.onScrollHide, true);
    window.removeEventListener('resize', this.onResizeHide);
    window.removeEventListener('blur', this.onBlurHide);
    document.removeEventListener('pointerdown', this.onPointerDownOutside);
    document.removeEventListener('visibilitychange', this.onVisibilityHide);
  }

  private clearHoverTimeout(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  private scheduleHoverHide(): void {
    this.clearHoverHideTimeout();
    this.hoverHideTimeout = setTimeout(() => {
      this.hoverHideTimeout = null;
      if (!this.pointerOverPopover && !this.openedByLongPress) {
        this.hide();
      }
    }, HOVER_HIDE_GRACE_MS);
  }

  private clearHoverHideTimeout(): void {
    if (this.hoverHideTimeout) {
      clearTimeout(this.hoverHideTimeout);
      this.hoverHideTimeout = null;
    }
  }

  private clearLongPressTimeout(): void {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  private clearTextSelection(): void {
    window.getSelection()?.removeAllRanges();
  }

  private teardown(): void {
    this.clearHoverTimeout();
    this.clearHoverHideTimeout();
    this.clearLongPressTimeout();
    this.hide();
  }
}

/** Test helper: clear shared passage cache / exclusive preview between specs. */
export function clearScriptureHoverPreviewCacheForTests(): void {
  passageCache.clear();
  dismissExclusivePreview = null;
}
