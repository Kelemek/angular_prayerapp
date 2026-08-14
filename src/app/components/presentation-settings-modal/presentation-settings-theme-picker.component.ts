import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { PresentationSettingsThemeOption } from "./presentation-settings-theme-section.component";

@Component({
  selector: "app-presentation-settings-theme-picker",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./presentation-settings-theme-picker.component.html",
})
export class PresentationSettingsThemePickerComponent {
  @Input() theme: PresentationSettingsThemeOption = "system";

  @Output() themeChange = new EventEmitter<PresentationSettingsThemeOption>();
}
