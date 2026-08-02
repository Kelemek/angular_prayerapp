import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
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
      class="flex gap-2 sm:gap-1 items-center"
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
          @if (colorDisplay === 'text') {
          <span
            class="personal-category-header-band px-2 py-2 sm:py-1 text-sm font-bold whitespace-nowrap"
            [ngStyle]="pillStyles(preset)"
          >
            {{ displayLabel }}
          </span>
          } @else {
          <span
            class="personal-category-pill inline-block px-2 py-1 text-xs font-medium rounded-full border whitespace-nowrap"
            [ngStyle]="pillStyles(preset)"
          >
            {{ displayLabel }}
          </span>
          }
        </button>
      }
      <label
        class="relative inline-flex items-center font-medium text-blue-600 dark:text-blue-400 hover:underline text-center px-0.5 py-2 sm:py-1 cursor-pointer rounded focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500"
        [ngClass]="{
          'text-sm font-semibold': layout === 'stack',
          'text-xs': layout !== 'stack',
          'mt-2 sm:mt-1': layout === 'stack'
        }"
        aria-label="Choose custom color"
      >
        Custom
        <input
          type="color"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          [value]="nativeInputValue"
          (input)="onNativeInput($event)"
        />
      </label>
    </div>
  `,
})
export class PersonalCategoryColorPickerComponent {
  readonly presets = PERSONAL_CATEGORY_COLOR_PRESETS;

  @Input() color = '#2563EB';
  @Input() categoryLabel = '';
  /** `stack` — vertical list (card popover). `inline` — horizontal row with wrap (forms). */
  @Input() layout: 'stack' | 'inline' = 'stack';
  /** `pill` — tinted badge previews. `text` — category label in each preset color only. */
  @Input() colorDisplay: 'pill' | 'text' = 'text';
  @Output() colorChange = new EventEmitter<string>();

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

  onNativeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const normalized = normalizePersonalCategoryHexColor(value);
    if (normalized) {
      this.colorChange.emit(normalized);
    }
  }
}
