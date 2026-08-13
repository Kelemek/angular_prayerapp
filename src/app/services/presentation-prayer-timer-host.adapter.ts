import type { ChangeDetectorRef } from "@angular/core";
import type { PresentationPrayerTimerHost } from "./presentation-prayer-timer.controller";

export interface PresentationPrayerTimerPageState {
  showSettings: boolean;
  showTimerNotification: boolean;
}

export class PresentationPrayerTimerHostAdapter implements PresentationPrayerTimerHost {
  constructor(
    private readonly page: PresentationPrayerTimerPageState,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get showTimerNotification(): boolean {
    return this.page.showTimerNotification;
  }

  set showTimerNotification(value: boolean) {
    this.page.showTimerNotification = value;
  }

  closeSettings(): void {
    this.page.showSettings = false;
  }

  detectChanges(): void {
    this.cdr.detectChanges();
  }
}
