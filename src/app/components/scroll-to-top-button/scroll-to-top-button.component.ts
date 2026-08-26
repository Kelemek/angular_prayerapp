import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  scrollAppContainerToTop,
} from "../../lib/app-scroll-container";

const SCROLL_TO_TOP_THRESHOLD_PX = 320;

@Component({
  selector: "app-scroll-to-top-button",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible) {
      <button
        type="button"
        data-testid="scroll-to-top-button"
        class="app-scroll-to-top-button flex h-11 w-11 items-center justify-center rounded-full border border-gray-200/80 bg-white/95 text-gray-700 shadow-lg shadow-black/10 backdrop-blur-md transition-[opacity,transform] duration-200 hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-church-green focus:ring-offset-2 dark:border-gray-600/80 dark:bg-gray-800/95 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white dark:focus:ring-offset-gray-900"
        (click)="scrollToTop()"
        aria-label="Scroll to top"
        title="Back to top"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 15l7-7 7 7"
          ></path>
        </svg>
      </button>
    }
  `,
})
export class ScrollToTopButtonComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) scrollElement!: HTMLElement;

  visible = false;

  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  private boundScrollElement: HTMLElement | null = null;
  private readonly onScroll = () => this.updateVisibility();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["scrollElement"]) {
      this.bindScrollListener();
    }
  }

  ngOnDestroy(): void {
    this.unbindScrollListener();
  }

  scrollToTop(): void {
    scrollAppContainerToTop(this.scrollElement);
  }

  private bindScrollListener(): void {
    this.unbindScrollListener();
    if (!this.scrollElement) {
      return;
    }
    this.boundScrollElement = this.scrollElement;
    this.ngZone.runOutsideAngular(() => {
      this.boundScrollElement?.addEventListener("scroll", this.onScroll, {
        passive: true,
      });
    });
    this.updateVisibility();
  }

  private unbindScrollListener(): void {
    this.boundScrollElement?.removeEventListener("scroll", this.onScroll);
    this.boundScrollElement = null;
  }

  private updateVisibility(): void {
    const nextVisible =
      this.scrollElement.scrollTop > SCROLL_TO_TOP_THRESHOLD_PX;
    if (nextVisible === this.visible) {
      return;
    }
    this.ngZone.run(() => {
      this.visible = nextVisible;
      this.cdr.markForCheck();
    });
  }
}
