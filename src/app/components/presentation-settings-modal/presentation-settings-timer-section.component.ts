import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { PresentationSettingsRangeFieldComponent } from "./presentation-settings-range-field.component";
import { PresentationSettingsSectionCardComponent } from "./presentation-settings-section-card.component";

@Component({
  selector: "app-presentation-settings-timer-section",
  standalone: true,
  imports: [
    CommonModule,
    PresentationSettingsRangeFieldComponent,
    PresentationSettingsSectionCardComponent,
  ],
  templateUrl: "./presentation-settings-timer-section.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PresentationSettingsTimerSectionComponent implements OnChanges {
  @Input() prayerTimerMinutes = 10;
  @Input() modalVisible = false;
  @Output() prayerTimerMinutesChange = new EventEmitter<number>();
  @Output() startPrayerTimer = new EventEmitter<void>();

  localPrayerTimerMinutes = 10;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["prayerTimerMinutes"] || changes["modalVisible"]?.currentValue) {
      this.localPrayerTimerMinutes = this.prayerTimerMinutes;
    }
  }
}
