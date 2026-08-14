import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PresentationSettingsRangeFieldComponent } from "./presentation-settings-range-field.component";

@Component({
  selector: "app-presentation-settings-duration-controls",
  standalone: true,
  imports: [CommonModule, PresentationSettingsRangeFieldComponent],
  templateUrl: "./presentation-settings-duration-controls.component.html",
})
export class PresentationSettingsDurationControlsComponent {
  @Input() durationSeconds = 10;

  @Output() durationChange = new EventEmitter<number>();

  readonly presetDurations = [10, 20, 30];

  setDuration(seconds: number): void {
    this.durationChange.emit(seconds);
  }
}
