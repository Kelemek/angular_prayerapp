import { Component, Input } from "@angular/core";
import {
  PresentationSettingsMultiSelectDropdownComponent,
  type PresentationSettingsDropdownOption,
} from "./presentation-settings-multi-select-dropdown.component";

export interface PresentationSettingsMultiSelectRowField<
  T extends string = string,
> {
  showDropdown: boolean;
  getDisplay(): string;
  bindIsOptionSelected: (value: T) => boolean;
  isAllPendingSelected(): boolean;
  toggleDropdown(): void;
  togglePending(value: T): void;
  selectAllPending(): void;
}

@Component({
  selector: "app-presentation-settings-multi-select-filter-row",
  standalone: true,
  imports: [PresentationSettingsMultiSelectDropdownComponent],
  templateUrl: "./presentation-settings-multi-select-filter-row.component.html",
})
export class PresentationSettingsMultiSelectFilterRowComponent<
  T extends string = string,
> {
  @Input({ required: true }) field!: PresentationSettingsMultiSelectRowField<T>;
  @Input() label = "";
  @Input() tourAnchorId = "";
  @Input() dropdownKey = "";
  @Input() allSelectedLabel = "All";
  @Input() options: PresentationSettingsDropdownOption<T>[] = [];
}
