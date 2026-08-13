import { Injectable, NgZone } from "@angular/core";
import { interval, Subscription } from "rxjs";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { PresentationSlideItem } from "./presentation-catalog.store";
import type { PrayerRequest } from "./prayer.service";
import { markdownToPlainText } from "../../utils/markdown";
import {
  computePlayModeScrollTop,
  findPresentationSlideScrollElement,
  PRESENTATION_PLAY_SLIDE_FADE_MS,
} from "../../utils/presentationUtils";

export interface PresentationPlaybackHost {
  currentIndex: number;
  loop: boolean;
  smartMode: boolean;
  displayDuration: number;
  showSettings: boolean;
  showTimerNotification: boolean;
  getSlideCount(): number;
  getCurrentItem(): PresentationSlideItem | undefined;
  isPrayerItem(item: PresentationSlideItem): item is PrayerRequest;
  getScrollRoot(): HTMLElement | null;
  markForCheck(): void;
  detectChanges(): void;
}

@Injectable()
export class PresentationPlaybackController {
  isPlaying = false;
  slideCardFaded = false;
  countdownRemaining = 0;
  currentDuration = 10;
  showPresentationCompleteNotification = false;

  autoAdvanceInterval: ReturnType<typeof setTimeout> | null = null;
  countdownSubscription: Subscription | null = null;
  loopOffPlaySessionActive = false;
  playScrollRafId: number | null = null;

  private host: PresentationPlaybackHost | null = null;
  private playScrollLayoutTimeout: ReturnType<typeof setTimeout> | null = null;
  private playScrollStartTime: number | null = null;
  private playScrollDurationMs = 0;
  private playScrollMax = 0;
  private playScrollElement: HTMLElement | null = null;
  private slideFadeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ngZone: NgZone) {}

  bindHost(host: PresentationPlaybackHost): void {
    this.host = host;
  }

  destroy(): void {
    this.clearIntervals();
  }

  togglePlay(): void {
    const host = this.requireHost();
    if (this.showPresentationCompleteNotification) {
      this.dismissPresentationComplete(true);
      return;
    }

    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      if (host.getSlideCount() === 0) {
        this.isPlaying = false;
        return;
      }
      if (!host.loop && !this.loopOffPlaySessionActive) {
        host.currentIndex = 0;
        this.loopOffPlaySessionActive = true;
      }
      this.startAutoAdvance();
    } else {
      this.clearIntervals();
    }
  }

  startAutoAdvance(): void {
    const host = this.requireHost();
    if (host.getSlideCount() === 0) {
      return;
    }

    this.clearIntervals();

    const duration = this.calculateCurrentDuration();
    this.currentDuration = duration;
    this.countdownRemaining = duration;

    this.autoAdvanceInterval = setTimeout(() => {
      if (!this.isPlaying) {
        return;
      }
      this.advanceWithPlayFade(() => this.tryAdvanceSlide());
    }, duration * 1000);

    this.countdownSubscription = interval(1000).subscribe(() => {
      this.ngZone.run(() => {
        if (this.countdownRemaining > 0) {
          this.countdownRemaining--;
          host.detectChanges();
        }
      });
    });

    this.startPlayModeScroll(duration);
  }

  calculateCurrentDuration(): number {
    const host = this.requireHost();
    if (!host.smartMode) {
      return host.displayDuration;
    }

    const item = host.getCurrentItem();
    if (!item) {
      return host.displayDuration;
    }

    if (host.isPrayerItem(item)) {
      let totalChars = markdownToPlainText(item.description).length;

      const updates = item.updates ?? [];
      if (updates.length > 0) {
        const recentUpdates = [...updates]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 3);

        recentUpdates.forEach((update) => {
          totalChars += markdownToPlainText(update.content).length;
        });
      }

      return Math.max(10, Math.min(120, Math.ceil(totalChars / 12)));
    }

    const prompt = item as PrayerPrompt;
    const totalChars = markdownToPlainText(prompt.description).length;
    return Math.max(10, Math.min(120, Math.ceil(totalChars / 12)));
  }

  clearIntervals(): void {
    if (this.autoAdvanceInterval) {
      clearTimeout(this.autoAdvanceInterval);
      this.autoAdvanceInterval = null;
    }
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
      this.countdownSubscription = null;
    }
    this.clearPlayModeScroll();
    this.clearSlideFadeTimeout();
    this.slideCardFaded = false;
  }

  nextSlide(): void {
    const host = this.requireHost();
    if (this.showPresentationCompleteNotification || host.getSlideCount() === 0) {
      return;
    }

    if (this.isPlaying) {
      this.clearIntervals();
      this.advanceWithPlayFade(() => this.tryAdvanceSlide());
      return;
    }

    const advanced = this.tryAdvanceSlide();
    if (!advanced && !host.loop && host.getSlideCount() > 0) {
      this.completePresentationCycle();
    }
  }

  previousSlide(): void {
    const host = this.requireHost();
    if (this.showPresentationCompleteNotification || host.getSlideCount() === 0) {
      return;
    }

    if (!host.loop && host.currentIndex === 0) {
      return;
    }

    host.currentIndex = host.loop
      ? host.currentIndex === 0
        ? host.getSlideCount() - 1
        : host.currentIndex - 1
      : host.currentIndex - 1;
    host.markForCheck();

    if (this.isPlaying) {
      this.startAutoAdvance();
    }
  }

  completePresentationCycle(): void {
    const host = this.requireHost();
    if (host.getSlideCount() === 0) {
      return;
    }

    this.isPlaying = false;
    this.loopOffPlaySessionActive = false;
    this.clearIntervals();
    this.showPresentationCompleteNotification = true;
    host.markForCheck();
  }

  dismissPresentationComplete(startPlayback = false): void {
    const host = this.requireHost();
    this.showPresentationCompleteNotification = false;
    host.showSettings = false;
    host.showTimerNotification = false;

    if (host.getSlideCount() === 0) {
      this.loopOffPlaySessionActive = false;
      this.isPlaying = false;
      host.markForCheck();
      return;
    }

    host.currentIndex = 0;
    this.loopOffPlaySessionActive = true;
    this.clearIntervals();

    if (startPlayback) {
      this.isPlaying = true;
      this.startAutoAdvance();
    } else {
      this.isPlaying = false;
    }
    host.markForCheck();
  }

  private requireHost(): PresentationPlaybackHost {
    if (!this.host) {
      throw new Error("PresentationPlaybackController host is not bound");
    }
    return this.host;
  }

  private clearSlideFadeTimeout(): void {
    if (this.slideFadeTimeout !== null) {
      clearTimeout(this.slideFadeTimeout);
      this.slideFadeTimeout = null;
    }
  }

  private advanceWithPlayFade(advance: () => boolean): void {
    const host = this.requireHost();
    this.clearSlideFadeTimeout();
    this.slideCardFaded = true;
    host.markForCheck();

    this.slideFadeTimeout = setTimeout(() => {
      this.slideFadeTimeout = null;
      const advanced = advance();
      if (!advanced && !host.loop && host.getSlideCount() > 0) {
        this.slideCardFaded = false;
        this.completePresentationCycle();
        return;
      }
      this.slideCardFaded = false;
      host.markForCheck();
      if (this.isPlaying) {
        this.startAutoAdvance();
      }
    }, PRESENTATION_PLAY_SLIDE_FADE_MS);
  }

  private clearPlayModeScroll(): void {
    if (this.playScrollLayoutTimeout !== null) {
      clearTimeout(this.playScrollLayoutTimeout);
      this.playScrollLayoutTimeout = null;
    }
    if (this.playScrollRafId !== null) {
      cancelAnimationFrame(this.playScrollRafId);
      this.playScrollRafId = null;
    }
    this.playScrollStartTime = null;
    this.playScrollElement = null;
    this.playScrollMax = 0;
    this.playScrollDurationMs = 0;
  }

  private startPlayModeScroll(durationSeconds: number): void {
    const host = this.requireHost();
    this.clearPlayModeScroll();
    if (!this.isPlaying || durationSeconds <= 0) {
      return;
    }

    this.playScrollLayoutTimeout = setTimeout(() => {
      this.playScrollLayoutTimeout = null;
      if (!this.isPlaying) {
        return;
      }

      const root = host.getScrollRoot();
      if (root) {
        root.scrollTop = 0;
      }

      const scrollEl = findPresentationSlideScrollElement(root);
      if (!scrollEl) {
        return;
      }

      scrollEl.scrollTop = 0;
      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (maxScroll <= 1) {
        return;
      }

      this.playScrollElement = scrollEl;
      this.playScrollMax = maxScroll;
      this.playScrollDurationMs = durationSeconds * 1000;
      this.playScrollStartTime = performance.now();
      this.runPlayModeScrollFrame();
    }, 50);
  }

  private runPlayModeScrollFrame(): void {
    if (
      !this.isPlaying ||
      !this.playScrollElement ||
      this.playScrollStartTime === null
    ) {
      this.clearPlayModeScroll();
      return;
    }

    const elapsed = performance.now() - this.playScrollStartTime;
    this.playScrollElement.scrollTop = computePlayModeScrollTop(
      this.playScrollMax,
      elapsed,
      this.playScrollDurationMs
    );

    if (elapsed < this.playScrollDurationMs) {
      this.playScrollRafId = requestAnimationFrame(() =>
        this.runPlayModeScrollFrame()
      );
    } else {
      this.playScrollElement.scrollTop = this.playScrollMax;
      this.clearPlayModeScroll();
    }
  }

  private tryAdvanceSlide(): boolean {
    const host = this.requireHost();
    if (host.getSlideCount() === 0) {
      return false;
    }

    if (host.loop) {
      host.currentIndex = (host.currentIndex + 1) % host.getSlideCount();
      host.markForCheck();
      return true;
    }

    if (host.currentIndex < host.getSlideCount() - 1) {
      host.currentIndex++;
      host.markForCheck();
      return true;
    }

    return false;
  }
}
