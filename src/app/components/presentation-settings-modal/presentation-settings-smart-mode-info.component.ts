import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-presentation-settings-smart-mode-info",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./presentation-settings-smart-mode-info.component.html",
})
export class PresentationSettingsSmartModeInfoComponent {
  showDetails = false;
}
