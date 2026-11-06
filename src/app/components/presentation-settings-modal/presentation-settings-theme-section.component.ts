import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { PresentationSettingsSectionCardComponent } from "./presentation-settings-section-card.component";
import { PresentationSettingsThemePickerComponent } from "./presentation-settings-theme-picker.component";

import type { ThemeSelection } from "../../services/theme.service";

export type PresentationSettingsThemeOption = ThemeSelection;

@Component({
  selector: "app-presentation-settings-theme-section",
  standalone: true,
  host: { class: "block" },
  imports: [
    CommonModule,
    PresentationSettingsSectionCardComponent,
    PresentationSettingsThemePickerComponent,
  ],
  templateUrl: "./presentation-settings-theme-section.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PresentationSettingsThemeSectionComponent {
  @Input() theme: PresentationSettingsThemeOption = { family: "default", mode: "system" };
  @Output() themeChange = new EventEmitter<PresentationSettingsThemeOption>();
}
