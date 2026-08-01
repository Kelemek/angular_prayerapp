import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  ElementRef,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PersonalCategoryColorPickerComponent } from './personal-category-color-picker.component';
import { PersonalCategoryColorService } from '../../services/personal-category-color.service';
import {
  getPersonalCategoryColor,
  personalCategoryPillStyles,
} from '../../../utils/personalCategoryColor';
import {
  getPersonalCategoryColorPickerViewportBounds,
  PERSONAL_CATEGORY_COLOR_PICKER_ESTIMATED_HEIGHT,
  shouldOpenPersonalCategoryColorPickerUp,
} from './personal-category-picker-placement';

@Component({
  selector: 'app-personal-category-pill',
  standalone: true,
  imports: [CommonModule, PersonalCategoryColorPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-block" data-personal-category-pill>
      <button
        type="button"
        class="px-2 py-1 text-xs font-medium rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        [ngStyle]="pillStyles"
        aria-label="Change category color"
        (click)="onPillClick($event)"
      >
        {{ category }}
      </button>
      @if (showPicker) {
        <div
          #pickerDropdown
          class="absolute left-1/2 z-20 -translate-x-1/2 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
          [class.top-full]="!pickerOpenUp"
          [class.mt-1]="!pickerOpenUp"
          [class.bottom-full]="pickerOpenUp"
          [class.mb-1]="pickerOpenUp"
          (click)="$event.stopPropagation()"
        >
          <app-personal-category-color-picker
            [color]="pickerColor"
            [categoryLabel]="category"
            (colorChange)="onColorPick($event)"
          />
        </div>
      }
    </div>
  `,
})
export class PersonalCategoryPillComponent implements OnInit {
  @Input({ required: true }) category!: string;

  @ViewChild('pickerDropdown') pickerDropdownRef?: ElementRef<HTMLElement>;

  private readonly colorService = inject(PersonalCategoryColorService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  showPicker = false;
  pickerOpenUp = false;
  pickerColor = '#2563EB';

  ngOnInit(): void {
    void this.colorService.loadColors();
    this.colorService.colors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncPickerColor();
        this.cdr.markForCheck();
      });
    this.syncPickerColor();
  }

  get pillStyles(): Record<string, string> {
    const hex = this.colorService.getColor(this.category);
    return personalCategoryPillStyles(hex);
  }

  onPillClick(event: Event): void {
    event.stopPropagation();
    this.syncPickerColor();

    const pillButton = event.currentTarget;
    if (pillButton instanceof HTMLElement) {
      const pillRect = pillButton.getBoundingClientRect();
      const viewport = getPersonalCategoryColorPickerViewportBounds(pillButton);
      this.pickerOpenUp = shouldOpenPersonalCategoryColorPickerUp(
        pillRect.top,
        pillRect.bottom,
        PERSONAL_CATEGORY_COLOR_PICKER_ESTIMATED_HEIGHT,
        viewport.bottom,
        viewport.top
      );
    } else {
      this.pickerOpenUp = false;
    }

    this.showPicker = true;
    this.cdr.markForCheck();

    setTimeout(() => this.refinePickerPlacement(pillButton), 0);
  }

  private refinePickerPlacement(pillButton: EventTarget | null): void {
    if (!this.showPicker || !(pillButton instanceof HTMLElement)) {
      return;
    }
    const dropdown = this.pickerDropdownRef?.nativeElement;
    if (!dropdown) {
      return;
    }
    const pillRect = pillButton.getBoundingClientRect();
    const dropdownHeight = dropdown.getBoundingClientRect().height;
    const viewport = getPersonalCategoryColorPickerViewportBounds(pillButton);
    this.pickerOpenUp = shouldOpenPersonalCategoryColorPickerUp(
      pillRect.top,
      pillRect.bottom,
      dropdownHeight,
      viewport.bottom,
      viewport.top
    );
    this.cdr.markForCheck();
  }

  async onColorPick(color: string): Promise<void> {
    this.pickerColor = color;
    const success = await this.colorService.setColor(this.category, color);
    if (success) {
      this.closePicker();
    }
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showPicker) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('[data-personal-category-pill]')) {
      return;
    }
    this.closePicker();
  }

  private closePicker(): void {
    this.showPicker = false;
    this.pickerOpenUp = false;
    this.cdr.markForCheck();
  }

  private syncPickerColor(): void {
    this.pickerColor = getPersonalCategoryColor(
      this.category,
      this.colorService.getColorsSnapshot()
    );
  }
}
