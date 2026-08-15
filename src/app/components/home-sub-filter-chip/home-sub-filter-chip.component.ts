import { Component, EventEmitter, Input, Output } from "@angular/core";
import { HOME_SUB_FILTER_CHIP_BASE_CLASS } from "../../lib/home-sub-filter-chip-classes";

@Component({
  selector: "app-home-sub-filter-chip",
  standalone: true,
  host: {
    class: "flex min-w-0",
    "[class.flex-1]": "stretch",
  },
  template: `
    <button
      type="button"
      [attr.id]="chipId || null"
      [attr.aria-busy]="busy || null"
      [disabled]="disabled"
      (click)="chipClick.emit($event)"
      [class]="
        layoutClass +
        (stretch ? ' w-full' : '') +
        (active ? ' ' + activeClass : ' ' + inactiveClass) +
        (disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer') +
        (badgeOverlay ? ' relative' : '')
      "
    >
      <ng-content />
    </button>
  `,
})
export class HomeSubFilterChipComponent {
  @Input() chipId = "";
  @Input() active = false;
  @Input() disabled = false;
  @Input() busy = false;
  /** When true, the host grows with flex-1 so chips share the row equally. */
  @Input() stretch = true;
  /** When true, adds {@code relative} for absolutely positioned badge pills. */
  @Input() badgeOverlay = false;
  @Input() layoutClass = HOME_SUB_FILTER_CHIP_BASE_CLASS;
  @Input({ required: true }) activeClass!: string;
  @Input({ required: true }) inactiveClass!: string;

  @Output() chipClick = new EventEmitter<MouseEvent>();
}
