import { Component, EventEmitter, Input, Output } from "@angular/core";
import { PresentationSettingsSingleSelectDropdownComponent } from "./presentation-settings-single-select-dropdown.component";
import type { PresentationSettingsDropdownOption } from "./presentation-settings-multi-select-dropdown.component";

@Component({
  selector: "app-presentation-settings-single-select-filter-row",
  standalone: true,
  imports: [PresentationSettingsSingleSelectDropdownComponent],
  templateUrl: "./presentation-settings-single-select-filter-row.component.html",
})
export class PresentationSettingsSingleSelectFilterRowComponent<
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
