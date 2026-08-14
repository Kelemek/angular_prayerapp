import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-presentation-settings-section-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./presentation-settings-section-card.component.html",
})
export class PresentationSettingsSectionCardComponent {
  @Input() title = "";
  @Input() subtitle = "";
  @Input() tourAnchorId = "";
  @Input() bodyClass = "";
  @Input() headerClass = "mb-3";
  @Input() titleClass = "text-sm sm:text-base";
  @Input() subtitleClass = "mt-1";
}
