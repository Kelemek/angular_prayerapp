import {
  Component,
  Input,
  Output,
  EventEmitter,
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
  personalCategoryHeaderBandStyles,
  personalCategoryPillStyles,
} from '../../../utils/personalCategoryColor';
import {
  getSafeAreaViewportBounds,
  shouldOpenFixedPopoverUp,
} from '../../lib/fixed-popover-placement';
import {
  computePersonalCategoryHeaderPickerPosition,
  isNodeInsidePersonalCategoryPickerDropdown,
  PERSONAL_CATEGORY_COLOR_PICKER_ESTIMATED_HEIGHT,
  shouldDismissPersonalCategoryPickerOnScroll,
} from './personal-category-picker-placement';
import {
  PRAYER_CARD_PERSONAL_CATEGORY_HEADER_INSET_CLASSES,
  PRAYER_CARD_PERSONAL_CATEGORY_HEADER_TEXT_CLASSES,
  getMetaHeaderBandLayoutClasses,
  type MetaHeaderBandSize,
} from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-personal-category-pill',
  standalone: true,
  imports: [CommonModule, PersonalCategoryColorPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.block]': 'variant === "header"',
    '[class.min-w-0]': 'variant === "header"',
    '[class.max-w-full]': 'variant === "header"',
    '[class.h-full]': 'variant === "header"',
    '[class.overflow-hidden]': 'variant === "header"',
  },
  template: `
    <div
      [class]="variant === 'header' ? 'relative h-full min-w-0 max-w-full w-full overflow-hidden ' + layoutClasses.minHeightClasses : 'relative inline-block'"
      data-personal-category-pill
    >
      <button
        type="button"
        [class]="
          variant === 'header'
            ? 'personal-category-header-band block h-full w-full min-w-0 max-w-full ' + layoutClasses.minHeightClasses + ' ' + headerInsetClasses + ' text-left font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden ' + headerTextClasses
            : 'personal-category-pill px-2 py-1 text-xs font-medium rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500'
        "
        [title]="variant === 'header' ? category : null"
        [ngStyle]="pillStyles"
        aria-label="Change category color"
        (click)="onPillClick($event)"
      >
        @if (variant === 'header') {
        <span class="block truncate">{{ category }}</span>
        } @else {
        {{ category }}
        }
      </button>
      @if (showPicker) {
        <div
          #pickerDropdown
          [class]="
            variant === 'header'
              ? 'fixed z-50 p-3 sm:p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg isolate'
              : 'absolute left-1/2 z-20 -translate-x-1/2 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg ' +
                (pickerOpenUp ? 'bottom-full mb-1' : 'top-full mt-1')
          "
          [ngStyle]="pickerDropdownStyle"
          (click)="$event.stopPropagation()"
        >
          <app-personal-category-color-picker
            [color]="pickerColor"
            [categoryLabel]="category"
            [colorDisplay]="variant === 'header' ? 'text' : 'pill'"
            (colorChange)="onColorPick($event)"
          />
        </div>
      }
    </div>
  `,
})
export class PersonalCategoryPillComponent implements OnInit {
  /** Same left inset as other card headers; compact right edge (no unread badge). */
  readonly headerInsetClasses = PRAYER_CARD_PERSONAL_CATEGORY_HEADER_INSET_CLASSES;
  readonly headerTextClasses = PRAYER_CARD_PERSONAL_CATEGORY_HEADER_TEXT_CLASSES;

  @Input({ required: true }) category!: string;
  @Input() variant: 'pill' | 'header' = 'pill';
  @Input() bandSize: MetaHeaderBandSize = 'sm';
  @Output() pickerOpenChange = new EventEmitter<boolean>();

  @ViewChild('pickerDropdown') pickerDropdownRef?: ElementRef<HTMLElement>;

  private readonly colorService = inject(PersonalCategoryColorService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  showPicker = false;
  pickerOpenUp = false;
  pickerColor = '#2563EB';
  pickerDropdownPosition: { top: string; left: string } | null = null;
  private pickerAnchorButton: HTMLElement | null = null;
  private scrollDismissRoot: HTMLElement | null = null;
  private readonly onScrollDismiss = (event: Event): void => {
    if (!this.showPicker || this.variant !== 'header') {
      return;
    }
    const dropdown = this.pickerDropdownRef?.nativeElement ?? null;
    if (isNodeInsidePersonalCategoryPickerDropdown(event.target, dropdown)) {
      return;
    }
    this.repositionPickerOrDismiss();
  };
  private readonly onVisualViewportChange = (): void => {
    if (!this.showPicker || this.variant !== 'header') {
      return;
    }
    const anchor = this.pickerAnchorButton;
    if (anchor) {
      this.updateDropdownPosition(anchor);
    }
  };

  get pickerDropdownStyle(): Record<string, string> | null {
    if (this.variant !== 'header' || !this.pickerDropdownPosition) {
      return null;
    }
    return {
      top: this.pickerDropdownPosition.top,
      left: this.pickerDropdownPosition.left,
    };
  }

  ngOnInit(): void {
    void this.colorService.loadColors();
    this.colorService.colors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncPickerColor();
        this.cdr.markForCheck();
      });
    this.syncPickerColor();
    this.destroyRef.onDestroy(() => this.unbindScrollDismiss());
  }

  get layoutClasses() {
    return getMetaHeaderBandLayoutClasses(this.bandSize);
  }

  get pillStyles(): Record<string, string> {
    const hex = this.colorService.getColor(this.category);
    return this.variant === 'header'
      ? personalCategoryHeaderBandStyles(hex)
      : personalCategoryPillStyles(hex);
  }

  onPillClick(event: Event): void {
    event.stopPropagation();
    this.syncPickerColor();

    const pillButton = event.currentTarget;
    this.pickerAnchorButton =
      pillButton instanceof HTMLElement ? pillButton : null;
    if (pillButton instanceof HTMLElement) {
      this.applyHeaderDropdownPosition(
        pillButton,
        PERSONAL_CATEGORY_COLOR_PICKER_ESTIMATED_HEIGHT
      );
    } else {
      this.pickerOpenUp = false;
      this.pickerDropdownPosition = null;
    }

    this.setPickerOpen(true);
    this.cdr.markForCheck();

    setTimeout(() => {
      if (!(pillButton instanceof HTMLElement)) {
        return;
      }
      if (this.variant === 'header') {
        this.updateDropdownPosition(pillButton);
      } else {
        this.refinePickerPlacement(pillButton);
      }
    }, 0);
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.onVisualViewportChange();
  }

  private repositionPickerOrDismiss(): void {
    const anchor = this.pickerAnchorButton;
    if (!anchor) {
      this.closePicker();
      return;
    }
    const pillRect = anchor.getBoundingClientRect();
    const viewport = getSafeAreaViewportBounds(anchor);
    if (shouldDismissPersonalCategoryPickerOnScroll(pillRect, viewport)) {
      this.closePicker();
      return;
    }
    this.updateDropdownPosition(anchor);
  }

  private bindScrollDismiss(): void {
    this.unbindScrollDismiss();
    const root = document.querySelector('.safe-area-viewport');
    if (root instanceof HTMLElement) {
      this.scrollDismissRoot = root;
      root.addEventListener('scroll', this.onScrollDismiss, { passive: true });
    }
    window.addEventListener('scroll', this.onScrollDismiss, {
      passive: true,
      capture: true,
    });
    window.visualViewport?.addEventListener(
      'resize',
      this.onVisualViewportChange
    );
    window.visualViewport?.addEventListener(
      'scroll',
      this.onVisualViewportChange
    );
  }

  private unbindScrollDismiss(): void {
    if (this.scrollDismissRoot) {
      this.scrollDismissRoot.removeEventListener('scroll', this.onScrollDismiss);
      this.scrollDismissRoot = null;
    }
    window.removeEventListener('scroll', this.onScrollDismiss, { capture: true });
    window.visualViewport?.removeEventListener(
      'resize',
      this.onVisualViewportChange
    );
    window.visualViewport?.removeEventListener(
      'scroll',
      this.onVisualViewportChange
    );
  }

  private applyHeaderDropdownPosition(
    pillButton: HTMLElement,
    dropdownHeight: number
  ): void {
    const pillRect = pillButton.getBoundingClientRect();
    const viewport = getSafeAreaViewportBounds(pillButton);
    const position = computePersonalCategoryHeaderPickerPosition(
      pillRect,
      dropdownHeight,
      viewport
    );
    this.pickerOpenUp = position.openUp;
    this.pickerDropdownPosition = {
      top: `${position.topPx}px`,
      left: `${position.leftPx}px`,
    };
  }

  private updateDropdownPosition(pillButton: HTMLElement): void {
    const dropdown = this.pickerDropdownRef?.nativeElement;
    if (!dropdown) {
      return;
    }
    this.applyHeaderDropdownPosition(
      pillButton,
      dropdown.getBoundingClientRect().height
    );
    this.cdr.markForCheck();
  }

  private refinePickerPlacement(pillButton: EventTarget | null): void {
    if (!this.showPicker || !(pillButton instanceof HTMLElement)) {
      return;
    }
    if (this.variant === 'header') {
      this.updateDropdownPosition(pillButton);
      return;
    }
    const dropdown = this.pickerDropdownRef?.nativeElement;
    if (!dropdown) {
      return;
    }
    const pillRect = pillButton.getBoundingClientRect();
    const dropdownHeight = dropdown.getBoundingClientRect().height;
    const viewport = getSafeAreaViewportBounds(pillButton);
    this.pickerOpenUp = shouldOpenFixedPopoverUp(
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
    this.setPickerOpen(false);
  }

  private setPickerOpen(open: boolean): void {
    this.showPicker = open;
    if (!open) {
      this.pickerOpenUp = false;
      this.pickerDropdownPosition = null;
      this.pickerAnchorButton = null;
      this.unbindScrollDismiss();
    } else if (this.variant === 'header') {
      this.bindScrollDismiss();
    }
    if (this.variant === 'header') {
      this.pickerOpenChange.emit(open);
    }
    this.cdr.markForCheck();
  }

  private syncPickerColor(): void {
    this.pickerColor = getPersonalCategoryColor(
      this.category,
      this.colorService.getColorsSnapshot()
    );
  }
}
