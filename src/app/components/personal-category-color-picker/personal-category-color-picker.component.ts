import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PERSONAL_CATEGORY_COLOR_PRESETS,
  normalizePersonalCategoryHexColor,
  personalCategoryPillStyles,
} from '../../../utils/personalCategoryColor';

@Component({
  selector: 'app-personal-category-color-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex gap-1 items-center"
      [class.flex-col]="layout === 'stack'"
      [class.w-max]="layout === 'stack'"
      [class.flex-row]="layout === 'inline'"
      [class.flex-wrap]="layout === 'inline'"
      role="listbox"
      aria-label="Category color"
    >
      @for (preset of presets; track preset) {
        <button
          type="button"
          role="option"
          class="flex justify-center rounded-md p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800"
          [class.ring-2]="preset === normalizedColor"
          [class.ring-blue-500]="preset === normalizedColor"
          [attr.aria-label]="'Use color ' + preset"
          [attr.aria-selected]="preset === normalizedColor"
          (click)="selectColor(preset)"
        >
          <span
            class="inline-block px-2 py-1 text-xs font-medium rounded-full border whitespace-nowrap"
            [ngStyle]="pillStyles(preset)"
          >
            {{ displayLabel }}
          </span>
        </button>
      }
      <button
        type="button"
        class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline text-center px-0.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        [class.mt-1]="layout === 'stack'"
        aria-label="Choose custom color"
        (click)="openNativePicker()"
      >
        Custom
      </button>
      <input
        #nativeColorInput
        type="color"
        class="sr-only"
        [value]="nativeInputValue"
        (input)="onNativeInput($event)"
      />
    </div>
  `,
})
export class PersonalCategoryColorPickerComponent {
  readonly presets = PERSONAL_CATEGORY_COLOR_PRESETS;

  @Input() color = '#2563EB';
  @Input() categoryLabel = '';
  /** `stack` — vertical list (card popover). `inline` — horizontal row with wrap (forms). */
  @Input() layout: 'stack' | 'inline' = 'stack';
  @Output() colorChange = new EventEmitter<string>();

  @ViewChild('nativeColorInput') nativeColorInputRef?: ElementRef<HTMLInputElement>;

  get normalizedColor(): string {
    return normalizePersonalCategoryHexColor(this.color) ?? '#2563EB';
  }

  get displayLabel(): string {
    const trimmed = this.categoryLabel.trim();
    return trimmed.length > 0 ? trimmed : 'Category';
  }

  /** Native color input expects #RRGGBB without relying on hsl defaults. */
  get nativeInputValue(): string {
    const normalized = normalizePersonalCategoryHexColor(this.color);
    return normalized ?? '#2563EB';
  }

  pillStyles(hex: string): Record<string, string> {
    return personalCategoryPillStyles(hex);
  }

  selectColor(hex: string): void {
    const normalized = normalizePersonalCategoryHexColor(hex);
    if (normalized) {
      this.colorChange.emit(normalized);
    }
  }

  openNativePicker(): void {
    this.nativeColorInputRef?.nativeElement.click();
  }

  onNativeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const normalized = normalizePersonalCategoryHexColor(value);
    if (normalized) {
      this.colorChange.emit(normalized);
    }
  }
}
