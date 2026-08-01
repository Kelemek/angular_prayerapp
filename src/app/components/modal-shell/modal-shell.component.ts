import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  inject,
} from "@angular/core";

@Component({
  selector: "app-modal-shell",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
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
      }
    `,
  ],
  template: `
    <div
      #overlay
      class="modal-shell-overlay fixed inset-0 bg-gray-900/50 z-50 flex items-start sm:items-center justify-center px-2 pb-2 sm:px-4 sm:pb-4 overflow-hidden overscroll-none touch-none safe-area-overlay"
      [style.top]="overlayTop"
      [style.left]="overlayLeft"
      [style.width]="overlayWidth"
      [style.height]="overlayHeight"
      (click)="onBackdropClick($event)"
      (touchmove)="onOverlayTouchMove($event)"
    >
      <div
        [id]="panelId || null"
        class="modal-shell-panel flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full overflow-hidden touch-none"
        [style.max-height]="panelMaxHeight"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
      >
        <div
          class="flex shrink-0 items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 touch-none"
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
        <div
          #bodyScroller
          class="modal-shell-body flex-1 min-h-0 overflow-y-auto touch-pan-y"
          (focusin)="onBodyFocusIn($event)"
        >
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class ModalShellComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly TOUCH_GUARD_OPTIONS: AddEventListenerOptions = {
    passive: false,
    capture: true,
  };

  @Input() title = "";
  @Input() titleId = "modal-title";
  @Input() panelId = "";
  @Input() closeAriaLabel = "Close dialog";

  @Output() close = new EventEmitter<void>();

  @ViewChild("bodyScroller") private bodyScroller?: ElementRef<HTMLElement>;
  @ViewChild("overlay") private overlayRef?: ElementRef<HTMLElement>;

  /** Fits panel inside visual viewport when mobile keyboard is open. */
  panelMaxHeight = "min(90dvh, 100%)";

  overlayTop = "0";
  overlayLeft = "0";
  overlayWidth = "100%";
  overlayHeight = "100%";

  private scrollLockEl: HTMLElement | null = null;
  private scrollLockPreviousOverflow = "";
  private scrollLockPreviousTouchAction = "";
  private bodyPreviousOverflow = "";
  private htmlPreviousOverflow = "";

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

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.lockBackgroundScroll();
    document.addEventListener(
      "touchmove",
      this.blockBackgroundTouchMove,
      ModalShellComponent.TOUCH_GUARD_OPTIONS
    );
  }

  ngAfterViewInit(): void {
    this.bindVisualViewport();
  }

  ngOnDestroy(): void {
    document.removeEventListener(
      "touchmove",
      this.blockBackgroundTouchMove,
      ModalShellComponent.TOUCH_GUARD_OPTIONS
    );
    this.unlockBackgroundScroll();
    this.unbindVisualViewport();
  }

  onBackdropClick(event: MouseEvent): void {
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
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    });
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

  private lockBackgroundScroll(): void {
    this.bodyPreviousOverflow = document.body.style.overflow;
    this.htmlPreviousOverflow = document.documentElement.style.overflow;

    const scroller = this.findPageScrollContainer();
    if (scroller !== document.documentElement && scroller !== document.body) {
      this.scrollLockEl = scroller;
      this.scrollLockPreviousOverflow = scroller.style.overflow;
      this.scrollLockPreviousTouchAction = scroller.style.touchAction;
      scroller.style.overflow = "hidden";
      scroller.style.touchAction = "none";
    } else {
      this.scrollLockEl = null;
      this.scrollLockPreviousOverflow = "";
      this.scrollLockPreviousTouchAction = "";
    }

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  private unlockBackgroundScroll(): void {
    if (this.scrollLockEl) {
      this.scrollLockEl.style.overflow = this.scrollLockPreviousOverflow;
      this.scrollLockEl.style.touchAction = this.scrollLockPreviousTouchAction;
      this.scrollLockEl = null;
    }
    document.body.style.overflow = this.bodyPreviousOverflow;
    document.documentElement.style.overflow = this.htmlPreviousOverflow;
  }

  private findPageScrollContainer(): HTMLElement {
    const viewport = document.querySelector(".safe-area-viewport");
    if (viewport instanceof HTMLElement) return viewport;
    return document.documentElement;
  }
}
