import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-presentation-settings-range-field",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./presentation-settings-range-field.component.html",
  styleUrl: "./presentation-settings-range.component.css",
})
export class PresentationSettingsRangeFieldComponent {
  @Input() label = "";
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() value = 0;
  @Input() valueSuffix = "";

  @Output() valueChange = new EventEmitter<number>();

  get valuePercent(): string {
    if (this.max === this.min) {
      return "0%";
    }
    return `${((this.value - this.min) / (this.max - this.min)) * 100}%`;
  }
}
