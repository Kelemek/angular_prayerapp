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
import { ScriptureService, type ScripturePassage } from '../../services/scripture.service';
import {
  claimScriptureHoverPreviewExclusive,
  getCachedScriptureHoverPreviewPassage,
  releaseScriptureHoverPreviewExclusive,
  sanitizeScriptureHoverPreviewPassage,
  scriptureHoverPreviewCacheKey,
  setCachedScriptureHoverPreviewPassage,
  clearScriptureHoverPreviewCacheForTests,
} from '../../lib/scripture-hover-preview-cache';
import {
  SCRIPTURE_HOVER_PREVIEW_HOVER_HIDE_GRACE_MS,
  SCRIPTURE_HOVER_PREVIEW_LONG_PRESS_MOVE_CANCEL_PX,
  SCRIPTURE_HOVER_PREVIEW_LONG_PRESS_MS,
  SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_DEFAULT_PX,
} from '../../lib/scripture-hover-preview-constants';
import { isScriptureHoverPreviewTouchOnlyDevice } from '../../lib/scripture-hover-preview-device';
import {
  computeScriptureHoverPreviewPlacement,
  nudgeScriptureHoverPreviewPosition,
} from '../../lib/scripture-hover-preview-layout';
import type { BibleTranslation } from '../../types/memorization';

export { clearScriptureHoverPreviewCacheForTests };

@Component({
  selector: 'app-scripture-hover-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scripture-hover-preview.component.html',
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
  popoverWidthPx = SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_DEFAULT_PX;
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
    if (this.disabled || !this.reference.trim() || isScriptureHoverPreviewTouchOnlyDevice()) {
      return;
    }

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
    if (this.disabled || !this.reference.trim() || !isScriptureHoverPreviewTouchOnlyDevice()) {
      return;
    }
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
      this.clearTextSelection();
      this.setPositionFromPoint(clientX, clientY);
      this.openedByLongPress = true;
      void this.showPreview(refAtTouch, translation);
    }, SCRIPTURE_HOVER_PREVIEW_LONG_PRESS_MS);
  }

  onTriggerContextMenu(event: Event): void {
    if (this.disabled || !isScriptureHoverPreviewTouchOnlyDevice()) return;
    event.preventDefault();
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.longPressTimeout) return;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    if (
      dx * dx + dy * dy >=
      SCRIPTURE_HOVER_PREVIEW_LONG_PRESS_MOVE_CANCEL_PX *
        SCRIPTURE_HOVER_PREVIEW_LONG_PRESS_MOVE_CANCEL_PX
    ) {
      this.clearLongPressTimeout();
      this.longPressTriggered = false;
    }
  }

  onTouchEnd(event: TouchEvent): void {
    this.clearLongPressTimeout();
    if (this.longPressTriggered) {
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

  private async showPreview(reference: string, translation: BibleTranslation): Promise<void> {
    this.claimExclusivePreview();
    this.isVisible = true;
    this.attachPortal();
    this.attachDismissListeners();
    this.syncPortalView();

    const key = scriptureHoverPreviewCacheKey(reference, translation);
    const cached = getCachedScriptureHoverPreviewPassage(key);
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
      const passage = sanitizeScriptureHoverPreviewPassage(
        await this.scripture.getPassage(reference, translation)
      );
      if (generation !== this.fetchGeneration || !this.isVisible) return;
      if (this.reference.trim() !== reference || this.translation !== translation) return;
      setCachedScriptureHoverPreviewPassage(key, passage);
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
    this.exclusiveToken = claimScriptureHoverPreviewExclusive(() => this.hide());
  }

  private releaseExclusivePreview(): void {
    releaseScriptureHoverPreviewExclusive(this.exclusiveToken);
  }

  private setPositionFromPoint(centerX: number, centerY: number): void {
    this.anchorCx = centerX;
    this.anchorCy = centerY;

    const placement = computeScriptureHoverPreviewPlacement(centerX, centerY);
    this.popoverWidthPx = placement.popoverWidthPx;
    this.popoverMaxHeightPx = placement.popoverMaxHeightPx;
    this.positionX = placement.positionX;
    this.positionY = placement.positionY;
    this.isAbove = placement.isAbove;
    this.syncPortalView();
  }

  private nudgeAfterLayout(): void {
    if (!this.isVisible) return;
    this.setPositionFromPoint(this.anchorCx, this.anchorCy);
    const el = this.getPopoverElement();
    if (!el) return;

    const nudged = nudgeScriptureHoverPreviewPosition(this.positionX, this.positionY, el);
    if (!nudged) return;
    this.positionX = nudged.positionX;
    this.positionY = nudged.positionY;
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
    }, SCRIPTURE_HOVER_PREVIEW_HOVER_HIDE_GRACE_MS);
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
