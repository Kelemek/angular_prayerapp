import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PersonalCategoryColorPickerComponent } from './personal-category-color-picker.component';
import {
  computePersonalCategoryHeaderPickerPosition,
  isNodeInsidePersonalCategoryPickerDropdown,
  PERSONAL_CATEGORY_COLOR_PICKER_ESTIMATED_HEIGHT,
  shouldDismissPersonalCategoryPickerOnScroll,
} from './personal-category-picker-placement';
import { getSafeAreaViewportBounds } from '../../lib/fixed-popover-placement';
import {
  DEFAULT_PRAYER_GROUP_COLOR,
  normalizePrayerGroupColor,
} from '../../lib/prayer-group-color';
import { personalCategoryHeaderBandStyles } from '../../../utils/personalCategoryColor';
import {
  PRAYER_CARD_PERSONAL_CATEGORY_HEADER_INSET_CLASSES,
  PRAYER_CARD_PERSONAL_CATEGORY_HEADER_TEXT_CLASSES,
  getMetaHeaderBandLayoutClasses,
  type MetaHeaderBandSize,
} from '../../lib/prayer-card-layout';
import { PrayerGroupService } from '../../services/prayer-group.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-group-prayer-header-pill',
  standalone: true,
  imports: [CommonModule, PersonalCategoryColorPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0 max-w-full h-full overflow-hidden',
  },
  template: `
    <div
      class="relative h-full min-w-0 max-w-full w-full overflow-hidden"
      data-group-prayer-header-pill
    >
      <button
        type="button"
        [class]="
          'personal-category-header-band block h-full w-full min-w-0 max-w-full ' +
          layoutClasses.minHeightClasses +
          ' ' +
          headerInsetClasses +
          ' text-left font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden ' +
          headerTextClasses
        "
        [title]="groupName"
        [ngStyle]="headerStyles"
        aria-label="Change group color"
        (click)="onHeaderClick($event)"
      >
        <span class="block truncate">{{ groupName }}</span>
      </button>
      @if (showPicker) {
      <div
        #pickerDropdown
        class="fixed z-50 p-3 sm:p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg isolate"
        [ngStyle]="pickerDropdownStyle"
        (click)="$event.stopPropagation()"
      >
        <app-personal-category-color-picker
          [color]="pickerColor"
          [categoryLabel]="groupName"
          colorDisplay="text"
          layout="stack"
          (colorChange)="onColorPick($event)"
        />
      </div>
      }
    </div>
  `,
})
export class GroupPrayerHeaderPillComponent implements OnChanges {
  readonly headerInsetClasses = PRAYER_CARD_PERSONAL_CATEGORY_HEADER_INSET_CLASSES;
  readonly headerTextClasses = PRAYER_CARD_PERSONAL_CATEGORY_HEADER_TEXT_CLASSES;

  @Input({ required: true }) groupId!: string;
  @Input({ required: true }) groupName!: string;
  @Input() groupColor: string | null = null;
  @Input() bandSize: MetaHeaderBandSize = 'sm';

  @Output() pickerOpenChange = new EventEmitter<boolean>();

  @ViewChild('pickerDropdown') pickerDropdownRef?: ElementRef<HTMLElement>;

  private readonly groupsApi = inject(PrayerGroupService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  showPicker = false;
  pickerOpenUp = false;
  pickerColor = DEFAULT_PRAYER_GROUP_COLOR;
  pickerDropdownPosition: { top: string; left: string } | null = null;
  private pickerAnchorButton: HTMLElement | null = null;
  private scrollDismissRoot: HTMLElement | null = null;
  private saving = false;

  private readonly onScrollDismiss = (event: Event): void => {
    if (!this.showPicker) {
      return;
    }
    const dropdown = this.pickerDropdownRef?.nativeElement ?? null;
    if (isNodeInsidePersonalCategoryPickerDropdown(event.target, dropdown)) {
      return;
    }
    this.repositionPickerOrDismiss();
  };

  private readonly onVisualViewportChange = (): void => {
    if (!this.showPicker) {
      return;
    }
    const anchor = this.pickerAnchorButton;
    if (anchor) {
      this.updateDropdownPosition(anchor);
    }
  };

  constructor() {
    this.groupsApi.groups$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((groups) => {
        const match = groups.find((group) => group.id === this.groupId);
        if (match?.color) {
          this.pickerColor = normalizePrayerGroupColor(match.color);
          this.cdr.markForCheck();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['groupColor'] || changes['groupId']) {
      this.syncPickerColor();
    }
  }

  get layoutClasses() {
    return getMetaHeaderBandLayoutClasses(this.bandSize);
  }

  get headerStyles(): Record<string, string> {
    return personalCategoryHeaderBandStyles(
      normalizePrayerGroupColor(this.pickerColor),
    );
  }

  get pickerDropdownStyle(): Record<string, string> | null {
    if (!this.pickerDropdownPosition) {
      return null;
    }
    return {
      top: this.pickerDropdownPosition.top,
      left: this.pickerDropdownPosition.left,
    };
  }

  onHeaderClick(event: Event): void {
    event.stopPropagation();
    this.syncPickerColor();
    const button = event.currentTarget;
    this.pickerAnchorButton = button instanceof HTMLElement ? button : null;
    if (button instanceof HTMLElement) {
      this.applyHeaderDropdownPosition(
        button,
        PERSONAL_CATEGORY_COLOR_PICKER_ESTIMATED_HEIGHT,
      );
    } else {
      this.pickerOpenUp = false;
      this.pickerDropdownPosition = null;
    }
    this.setPickerOpen(true);
    this.cdr.markForCheck();
    setTimeout(() => {
      if (button instanceof HTMLElement) {
        this.updateDropdownPosition(button);
      }
    }, 0);
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.onVisualViewportChange();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showPicker) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('[data-group-prayer-header-pill]')) {
      return;
    }
    this.closePicker();
  }

  async onColorPick(color: string): Promise<void> {
    if (this.saving) {
      return;
    }
    const normalized = normalizePrayerGroupColor(color);
    this.saving = true;
    this.cdr.markForCheck();
    try {
      await this.groupsApi.updateGroupColor(this.groupId, normalized);
      this.pickerColor = normalized;
      this.closePicker();
    } catch (err: unknown) {
      this.syncPickerColor();
      this.toast.error(
        err instanceof Error ? err.message : 'Could not save group color',
      );
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
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
      this.onVisualViewportChange,
    );
    window.visualViewport?.addEventListener(
      'scroll',
      this.onVisualViewportChange,
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
      this.onVisualViewportChange,
    );
    window.visualViewport?.removeEventListener(
      'scroll',
      this.onVisualViewportChange,
    );
  }

  private applyHeaderDropdownPosition(
    pillButton: HTMLElement,
    dropdownHeight: number,
  ): void {
    const pillRect = pillButton.getBoundingClientRect();
    const viewport = getSafeAreaViewportBounds(pillButton);
    const position = computePersonalCategoryHeaderPickerPosition(
      pillRect,
      dropdownHeight,
      viewport,
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
      dropdown.getBoundingClientRect().height,
    );
    this.cdr.markForCheck();
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
    } else {
      this.bindScrollDismiss();
    }
    this.pickerOpenChange.emit(open);
    this.cdr.markForCheck();
  }

  private syncPickerColor(): void {
    const catalog = this.groupsApi
      .getGroupsSnapshot()
      .find((group) => group.id === this.groupId);
    if (catalog) {
      this.pickerColor = normalizePrayerGroupColor(catalog.color);
      return;
    }
    this.pickerColor = normalizePrayerGroupColor(this.groupColor);
  }
}
