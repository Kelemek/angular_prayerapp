import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  inject,
} from "@angular/core";
import { NgClass } from "@angular/common";
import {
  appTopChromeOverlayPaddingTop,
  appTopChromeOverlayPaddingTopFromPx,
} from "../../lib/measure-app-top-chrome-inset";
import {
  acquireModalShellScrollLock,
  releaseModalShellScrollLock,
} from "./modal-shell-scroll-lock";

@Component({
  selector: "app-modal-shell",
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: contents;
      }

      .modal-shell-overlay {
        padding-top: env(safe-area-inset-top, 0px);
      }

      @media (min-width: 640px) {
        .modal-shell-overlay {
          padding-top: max(16px, env(safe-area-inset-top, 0px));
        }
      }

      .modal-shell-body {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .modal-shell-body::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
  template: `
    <div
      #overlay
      class="modal-shell-overlay fixed inset-0 bg-gray-900/50 z-modal-overlay flex items-start sm:items-center justify-center px-2 pb-2 sm:px-4 sm:pb-4 overflow-hidden overscroll-none touch-none safe-area-overlay"
      [ngClass]="overlayClass"
      [style.top]="overlayTop"
      [style.left]="overlayLeft"
      [style.width]="overlayWidth"
      [style.height]="overlayHeight"
      [style.padding-top]="overlayPaddingTop"
      (click)="onBackdropClick($event)"
      (touchmove)="onOverlayTouchMove($event)"
    >
      <div
        [id]="panelId || null"
        class="modal-shell-panel flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full overflow-hidden touch-none"
        [ngClass]="panelClass"
        [style.max-height]="panelMaxHeight"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="showHeader ? titleId : null"
        [attr.aria-label]="!showHeader && ariaLabel ? ariaLabel : null"
      >
        @if (showHeader) {
        <div
          class="flex shrink-0 items-center justify-between p-4 sm:p-6 modal-chrome-header touch-none"
        >
          <h2
            [id]="titleId"
            class="text-xl font-semibold text-gray-800 dark:text-gray-200"
          >
            {{ title }}
          </h2>
          <button
            type="button"
            (click)="close.emit()"
            [attr.aria-label]="closeAriaLabel"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1 cursor-pointer"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        }
        <div
          #bodyScroller
          class="modal-shell-body flex-1 min-h-0 overflow-y-auto touch-pan-y"
          [class.relative]="!showHeader"
          (focusin)="onBodyFocusIn($event)"
        >
          @if (!showHeader) {
          <button
            type="button"
            (click)="close.emit()"
            [attr.aria-label]="closeAriaLabel"
            class="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer z-10"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
          }
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class ModalShellComponent
  implements OnInit, OnChanges, AfterViewInit, OnDestroy
{
  private static readonly TOUCH_GUARD_OPTIONS: AddEventListenerOptions = {
    passive: false,
    capture: true,
  };

  @Input() title = "";
  @Input() titleId = "modal-title";
  @Input() panelId = "";
  @Input() closeAriaLabel = "Close dialog";
  @Input() panelClass = "max-w-2xl";
  @Input() overlayClass = "";
  @Input() closeOnBackdrop = true;
  @Input() showHeader = true;
  @Input() ariaLabel = "";
  /** Portals overlay to document.body (escapes overflow-hidden ancestors). */
  @Input() appendToBody = true;
  /** Fixed pixel inset below safe-area (overrides reserveAppTopChrome when > 0). */
  @Input() reserveTopChromePx = 0;
  /** When true, reserves space for optional sticky app chrome (unused; org switcher is in Settings). */
  @Input() reserveAppTopChrome = true;

  @Output() close = new EventEmitter<void>();

  @ViewChild("bodyScroller") private bodyScroller?: ElementRef<HTMLElement>;
  @ViewChild("overlay") private overlayRef?: ElementRef<HTMLElement>;

  /** Fits panel inside visual viewport when mobile keyboard is open. */
  panelMaxHeight = "min(90dvh, 100%)";

  overlayTop = "0";
  overlayLeft = "0";
  overlayWidth = "100%";
  overlayHeight = "100%";
  overlayPaddingTop: string | null = null;

  private overlayMovedToBody = false;

  private readonly blockBackgroundTouchMove = (event: TouchEvent): void => {
    if (!this.isAllowedScrollTouch(event)) {
      event.preventDefault();
    }
  };

  private readonly onVisualViewportChange = (): void => {
    const vv = window.visualViewport;
    if (!vv) return;

    this.overlayTop = `${vv.offsetTop}px`;
    this.overlayLeft = `${vv.offsetLeft}px`;
    this.overlayWidth = `${vv.width}px`;
    this.overlayHeight = `${vv.height}px`;

    const overlayPadTop = this.readOverlayPaddingTop();
    const overlayPadBottom = this.readOverlayPaddingBottom();
    const max = Math.max(
      120,
      Math.floor(vv.height - overlayPadTop - overlayPadBottom)
    );
    this.panelMaxHeight = `${max}px`;
    this.syncOverlayPaddingTop();
    this.cdr.markForCheck();
  };

  private readOverlayPaddingTop(): number {
    const overlay = this.overlayRef?.nativeElement;
    if (!overlay) return 0;
    return parseFloat(window.getComputedStyle(overlay).paddingTop) || 0;
  }

  private readOverlayPaddingBottom(): number {
    const overlay = this.overlayRef?.nativeElement;
    if (!overlay) return 8;
    return parseFloat(window.getComputedStyle(overlay).paddingBottom) || 8;
  }

  private syncOverlayPaddingTop(): void {
    if (this.reserveTopChromePx > 0) {
      this.overlayPaddingTop = appTopChromeOverlayPaddingTopFromPx(
        this.reserveTopChromePx
      );
      return;
    }
    if (this.reserveAppTopChrome) {
      this.overlayPaddingTop = appTopChromeOverlayPaddingTop();
      return;
    }
    this.overlayPaddingTop = null;
  }

  private portalOverlayToBodyIfNeeded(): void {
    if (!this.appendToBody) {
      return;
    }
    const overlay = this.overlayRef?.nativeElement;
    if (!overlay || overlay.parentElement === document.body) {
      return;
    }
    document.body.appendChild(overlay);
    this.overlayMovedToBody = true;
  }

  private restoreOverlayFromBody(): void {
    if (!this.overlayMovedToBody) {
      return;
    }
    const overlay = this.overlayRef?.nativeElement;
    if (overlay?.parentElement === document.body) {
      overlay.remove();
    }
    this.overlayMovedToBody = false;
  }

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["reserveTopChromePx"] || changes["reserveAppTopChrome"]) {
      this.syncOverlayPaddingTop();
    }
  }

  ngOnInit(): void {
    this.syncOverlayPaddingTop();
    acquireModalShellScrollLock();
    document.addEventListener(
      "touchmove",
      this.blockBackgroundTouchMove,
      ModalShellComponent.TOUCH_GUARD_OPTIONS
    );
  }

  ngAfterViewInit(): void {
    this.portalOverlayToBodyIfNeeded();
    this.syncOverlayPaddingTop();
    this.bindVisualViewport();
  }

  ngOnDestroy(): void {
    this.restoreOverlayFromBody();
    document.removeEventListener(
      "touchmove",
      this.blockBackgroundTouchMove,
      ModalShellComponent.TOUCH_GUARD_OPTIONS
    );
    releaseModalShellScrollLock();
    this.unbindVisualViewport();
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.closeOnBackdrop) {
      return;
    }
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  onOverlayTouchMove(event: TouchEvent): void {
    if (!this.isAllowedScrollTouch(event)) {
      event.preventDefault();
    }
  }

  onBodyFocusIn(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const scroller = this.bodyScroller?.nativeElement;
    if (!scroller?.contains(target)) return;
    if (!this.shouldScrollFocusedFieldIntoModalBody(target)) return;

    requestAnimationFrame(() => {
      this.scrollFocusedFieldIntoModalBody(target, scroller);
    });
  }

  /** Avoid scrollIntoView — it scrolls ancestor viewports (Home virtual scroll) and can recycle the row hosting this modal. */
  private shouldScrollFocusedFieldIntoModalBody(target: HTMLElement): boolean {
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  private scrollFocusedFieldIntoModalBody(
    target: HTMLElement,
    scroller: HTMLElement
  ): void {
    const pad = 8;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    if (targetRect.bottom > scrollerRect.bottom - pad) {
      scroller.scrollTop += targetRect.bottom - scrollerRect.bottom + pad;
      return;
    }
    if (targetRect.top < scrollerRect.top + pad) {
      scroller.scrollTop -= scrollerRect.top - targetRect.top + pad;
    }
  }

  private isAllowedScrollTouch(event: TouchEvent): boolean {
    if (!(event.target instanceof Node)) return false;
    const scroller = this.bodyScroller?.nativeElement;
    return !!(scroller && scroller.contains(event.target));
  }

  private bindVisualViewport(): void {
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener("resize", this.onVisualViewportChange);
    vv.addEventListener("scroll", this.onVisualViewportChange);
    requestAnimationFrame(() => this.onVisualViewportChange());
  }

  private unbindVisualViewport(): void {
    const vv = window.visualViewport;
    if (!vv) return;
    vv.removeEventListener("resize", this.onVisualViewportChange);
    vv.removeEventListener("scroll", this.onVisualViewportChange);
  }

}
