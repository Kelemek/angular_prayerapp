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

import { PresentationSettingsToggleRowComponent } from "./presentation-settings-toggle-row.component";
import { PresentationSettingsDurationControlsComponent } from "./presentation-settings-duration-controls.component";
import { PresentationSettingsSmartModeInfoComponent } from "./presentation-settings-smart-mode-info.component";
import { PresentationSettingsSectionCardComponent } from "./presentation-settings-section-card.component";

@Component({
  selector: "app-presentation-settings-display-section",
  standalone: true,
  host: { class: "block" },
  imports: [
    CommonModule,
    PresentationSettingsSectionCardComponent,
    PresentationSettingsToggleRowComponent,
    PresentationSettingsDurationControlsComponent,
    PresentationSettingsSmartModeInfoComponent,
  ],
  templateUrl: "./presentation-settings-display-section.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PresentationSettingsDisplaySectionComponent implements OnChanges {
  @Input() smartMode = true;
  @Input() displayDuration = 10;
  @Input() randomize = false;
  @Input() loop = true;
  @Input() modalVisible = false;

  @Output() smartModeChange = new EventEmitter<boolean>();
  @Output() displayDurationChange = new EventEmitter<number>();
  @Output() randomizeChange = new EventEmitter<boolean>();
  @Output() loopChange = new EventEmitter<boolean>();

  localSmartMode = true;
  localDisplayDuration = 10;
  localRandomize = false;
  localLoop = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes["smartMode"] ||
      changes["displayDuration"] ||
      changes["randomize"] ||
      changes["loop"] ||
      changes["modalVisible"]?.currentValue
    ) {
      this.syncFromInputs();
    }
  }

  syncFromInputs(): void {
    this.localSmartMode = this.smartMode;
    this.localDisplayDuration = this.displayDuration;
    this.localRandomize = this.randomize;
    this.localLoop = this.loop;
  }

  setDuration(seconds: number): void {
    this.localDisplayDuration = seconds;
    this.displayDurationChange.emit(seconds);
  }

  setSmartMode(value: boolean): void {
    this.localSmartMode = value;
    this.smartModeChange.emit(value);
  }

  setRandomize(value: boolean): void {
    this.localRandomize = value;
    this.randomizeChange.emit(value);
  }

  setLoop(value: boolean): void {
    this.localLoop = value;
    this.loopChange.emit(value);
  }
}
