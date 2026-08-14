import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-presentation-settings-toggle-row",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./presentation-settings-toggle-row.component.html",
})
export class PresentationSettingsToggleRowComponent {
  @Input() label = "";
  @Input() hint = "";
  @Input() checked = false;

  @Output() checkedChange = new EventEmitter<boolean>();
}
