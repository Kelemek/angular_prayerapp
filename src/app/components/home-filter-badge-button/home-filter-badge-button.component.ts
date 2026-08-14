import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-home-filter-badge-button",
  standalone: true,
  template: `
    <button
      type="button"
      (click)="onMarkRead($event)"
      [class]="buttonClass"
      [title]="title"
      [attr.aria-label]="ariaLabel"
    >
      {{ count }}
    </button>
  `,
})
export class HomeFilterBadgeButtonComponent {
  @Input({ required: true }) count!: number;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) ariaLabel!: string;
  /** Compact pill allows wider counts on main Public tab aggregate badge. */
  @Input() compact = false;

  @Output() markRead = new EventEmitter<void>();

  get buttonClass(): string {
    const size = this.compact
      ? "min-w-5 h-5 px-1"
      : "w-5 h-5 sm:w-6 sm:h-6";
    return `absolute -top-2 -right-2 z-10 inline-flex items-center justify-center ${size} bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors`;
  }

  onMarkRead(event: Event): void {
    event.stopPropagation();
    this.markRead.emit();
  }
}
