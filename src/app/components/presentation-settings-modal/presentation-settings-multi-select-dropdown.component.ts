import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface PresentationSettingsDropdownOption<T extends string = string> {
  value: T;
  label: string;
  hidden?: boolean;
}

@Component({
  selector: "app-presentation-settings-multi-select-dropdown",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./presentation-settings-multi-select-dropdown.component.html",
})
export class PresentationSettingsMultiSelectDropdownComponent<
  T extends string = string,
> {
  @Input() label = "";
  @Input() displayText = "";
  @Input() open = false;
  @Input() dropdownKey = "";
  @Input() tourAnchorId = "";
  @Input() options: PresentationSettingsDropdownOption<T>[] = [];
  @Input() allSelectedLabel = "All";
  @Input() isOptionSelected: (value: T) => boolean = () => false;
  @Input() isAllSelected = false;

  @Output() toggleOpen = new EventEmitter<void>();
  @Output() toggleOption = new EventEmitter<T>();
  @Output() selectAll = new EventEmitter<void>();
}
