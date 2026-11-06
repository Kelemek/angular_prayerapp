import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ThemeSelectDropdownComponent } from "../theme-select-dropdown/theme-select-dropdown.component";
import {
  PRESENTATION_THEME_SELECT_OPTIONS,
  type ThemeSelectOption,
} from "../../lib/theme-options";
import type { PresentationSettingsThemeOption } from "./presentation-settings-theme-section.component";

@Component({
  selector: "app-presentation-settings-theme-picker",
  standalone: true,
  imports: [ThemeSelectDropdownComponent],
  templateUrl: "./presentation-settings-theme-picker.component.html",
})
export class PresentationSettingsThemePickerComponent {
  @Input() theme: PresentationSettingsThemeOption = "system";

  @Output() themeChange = new EventEmitter<PresentationSettingsThemeOption>();

  readonly options: readonly ThemeSelectOption[] =
    PRESENTATION_THEME_SELECT_OPTIONS;
}
