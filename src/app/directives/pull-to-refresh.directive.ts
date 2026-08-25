import { Directive, ElementRef, EventEmitter, HostListener, Input, NgZone, Output } from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective {
  /**
   * When true, pull-to-refresh gestures are ignored.
   */
  @Input() appPullToRefreshDisabled = false;

  /**
   * Indicates whether a refresh is currently in progress.
   * Used to avoid triggering multiple refreshes while one is active.
   */
  @Input() refreshing = false;

  /**
   * Emitted when the user has pulled down far enough to trigger a refresh.
   */
  @Output() refresh = new EventEmitter<void>();

  private startY: number | null = null;
  private pulling = false;
  private readonly threshold = 140; // pixels of downward pull required to trigger refresh (more intentional gesture)

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {}

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (this.appPullToRefreshDisabled || this.refreshing) {
      return;
    }

    // Only start tracking pull when at top of scroll container or page
    const el = this.elementRef.nativeElement;
    const elementScrollTop = el.scrollTop ?? 0;
    const pageScrollTop =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const scrollTop = Math.max(elementScrollTop, pageScrollTop);

    // Small tolerance for sub-pixel scroll restoration on iOS WebView
    if (scrollTop > 2) {
      this.startY = null;
      this.pulling = false;
      return;
    }

    if (event.touches.length !== 1) {
      return;
    }

    this.startY = event.touches[0].clientY;
    this.pulling = true;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.pulling || this.startY === null || this.refreshing) {
      return;
    }

    if (event.touches.length !== 1) {
      return;
    }

    const currentY = event.touches[0].clientY;
    const diff = currentY - this.startY;

    // Stop tracking if user scrolls up instead of pulling down
    if (diff < 0) {
      this.reset();
      return;
    }

    // Trigger refresh once threshold is exceeded
    if (diff >= this.threshold) {
      this.reset();
      // Run inside Angular zone so change detection picks up any state changes
      this.zone.run(() => {
        this.refresh.emit();
      });
    }
  }

  @HostListener('touchend')
  @HostListener('touchcancel')
  onTouchEnd(): void {
    this.reset();
  }

  private reset(): void {
    this.startY = null;
    this.pulling = false;
  }
}

