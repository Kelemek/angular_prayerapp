import { Injectable, NgZone } from "@angular/core";
import { interval, Subscription } from "rxjs";

export interface PresentationPrayerTimerHost {
  showTimerNotification: boolean;
  closeSettings(): void;
  detectChanges(): void;
}

@Injectable()
export class PresentationPrayerTimerController {
  active = false;
  remainingSeconds = 0;

  private subscription: Subscription | null = null;

  constructor(private readonly ngZone: NgZone) {}

  start(minutes: number, host: PresentationPrayerTimerHost): void {
    this.stop();
    host.closeSettings();
    this.active = true;
    this.remainingSeconds = minutes * 60;

    this.subscription = interval(1000).subscribe(() => {
      this.ngZone.run(() => {
        this.remainingSeconds--;
        host.detectChanges();

        if (this.remainingSeconds <= 0) {
          this.stop();
          this.active = false;
          host.showTimerNotification = true;
          host.detectChanges();
        }
      });
    });
  }

  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  destroy(): void {
    this.stop();
    this.active = false;
  }
}
