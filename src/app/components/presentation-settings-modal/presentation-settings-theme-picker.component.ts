import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { ThemeSelectDropdownComponent } from "../theme-select-dropdown/theme-select-dropdown.component";
import {
  PRESENTATION_THEME_FAMILY_OPTIONS,
  PRESENTATION_THEME_MODE_OPTIONS,
} from "../../lib/theme-options";
import type { ThemeSelection } from "../../services/theme.service";
import { closedFamilyTriggerLabel } from "../../lib/theme-options";
import { ThemeService } from "../../services/theme.service";

@Component({
  selector: "app-presentation-settings-theme-picker",
  standalone: true,
  imports: [ThemeSelectDropdownComponent],
  templateUrl: "./presentation-settings-theme-picker.component.html",
})
export class PresentationSettingsThemePickerComponent {
  @Input() theme: ThemeSelection = { family: "default", mode: "system" };

  @Output() themeChange = new EventEmitter<ThemeSelection>();

  private readonly themeService = inject(ThemeService);

  readonly familyOptions = PRESENTATION_THEME_FAMILY_OPTIONS;
  readonly modeOptions = PRESENTATION_THEME_MODE_OPTIONS;

  get familyTriggerLabel(): string {
    return closedFamilyTriggerLabel(
      this.theme.family,
      this.themeService.getResolvedTheme()
    );
  }

  onFamily(family: ThemeSelection["family"]): void {
    this.themeChange.emit({ ...this.theme, family });
  }

  onMode(mode: ThemeSelection["mode"]): void {
    this.themeChange.emit({ ...this.theme, mode });
  }
}
