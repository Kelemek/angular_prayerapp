import type { ChangeDetectorRef } from "@angular/core";
import { isPresentationPrayer } from "../lib/presentation-slide-item";
import type { PresentationSlideItem } from "./presentation-catalog.store";
import type { PresentationPlaybackHost } from "./presentation-playback.controller";
import type { PrayerRequest } from "./prayer.service";

export interface PresentationPlaybackPageState {
  currentIndex: number;
  loop: boolean;
  smartMode: boolean;
  displayDuration: number;
  showSettings: boolean;
  showTimerNotification: boolean;
  presentationScrollRef?: { nativeElement: HTMLElement };
  items: PresentationSlideItem[];
  currentItem: PresentationSlideItem | undefined;
}

export class PresentationPlaybackHostAdapter implements PresentationPlaybackHost {
  constructor(
    private readonly page: PresentationPlaybackPageState,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get currentIndex(): number {
    return this.page.currentIndex;
  }

  set currentIndex(value: number) {
    this.page.currentIndex = value;
  }

  get loop(): boolean {
    return this.page.loop;
  }

  get smartMode(): boolean {
    return this.page.smartMode;
  }

  get displayDuration(): number {
    return this.page.displayDuration;
  }

  get showSettings(): boolean {
    return this.page.showSettings;
  }

  set showSettings(value: boolean) {
    this.page.showSettings = value;
  }

  get showTimerNotification(): boolean {
    return this.page.showTimerNotification;
  }

  set showTimerNotification(value: boolean) {
    this.page.showTimerNotification = value;
  }

  getSlideCount(): number {
    return this.page.items.length;
  }

  getCurrentItem(): PresentationSlideItem | undefined {
    return this.page.currentItem;
  }

  isPrayerItem(item: PresentationSlideItem): item is PrayerRequest {
    return isPresentationPrayer(item);
  }

  getScrollRoot(): HTMLElement | null {
    return this.page.presentationScrollRef?.nativeElement ?? null;
  }

  markForCheck(): void {
    this.cdr.markForCheck();
  }

  detectChanges(): void {
    this.cdr.detectChanges();
  }
}
