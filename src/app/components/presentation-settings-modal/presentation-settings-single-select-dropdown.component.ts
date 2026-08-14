import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { PresentationSettingsDropdownOption } from "./presentation-settings-multi-select-dropdown.component";

@Component({
  selector: "app-presentation-settings-single-select-dropdown",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./presentation-settings-single-select-dropdown.component.html",
})
export class PresentationSettingsSingleSelectDropdownComponent<
  T extends string = string,
> {
  @Input() label = "";
  @Input() displayText = "";
  @Input() open = false;
  @Input() dropdownKey = "";
  @Input() tourAnchorId = "";
  @Input() options: PresentationSettingsDropdownOption<T>[] = [];
  @Input() selectedValue: T | null = null;

  @Output() toggleOpen = new EventEmitter<void>();
  @Output() selectOption = new EventEmitter<T>();
}
