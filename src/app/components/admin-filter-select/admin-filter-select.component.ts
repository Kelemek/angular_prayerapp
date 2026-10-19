import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { buildFixedDropdownPanelStyle } from '../../lib/fixed-dropdown-panel-style';

export interface AdminFilterSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-admin-filter-select',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <div
        [ngClass]="{
          'border-blue-500 ring-2 ring-blue-500 bg-white dark:bg-gray-800': showDropdown,
          'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600':
            !showDropdown
        }"
        class="flex w-full rounded-lg border-2 transition-all overflow-hidden"
      >
        <button
          #triggerButton
          type="button"
          [id]="triggerId"
          (click)="toggleDropdown()"
          [attr.aria-expanded]="showDropdown"
          aria-haspopup="listbox"
          [attr.aria-label]="ariaLabel"
          class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-all cursor-pointer text-left focus:outline-none"
        >
          <span
            class="font-medium truncate"
            [class.text-gray-500]="!value"
            [class.dark:text-gray-400]="!value"
            [class.text-gray-800]="!!value"
            [class.dark:text-gray-100]="!!value"
          >
            {{ selectedLabel }}
          </span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-gray-600 dark:text-gray-400 transition-transform shrink-0"
            [class.rotate-180]="showDropdown"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      @if (showDropdown) {
        <div
          class="fixed inset-0 z-modal-dropdown-backdrop"
          (click)="closeDropdown()"
        ></div>
        <div
          role="listbox"
          [attr.aria-label]="ariaLabel"
          class="fixed z-modal-dropdown-panel max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          [ngStyle]="dropdownPanelStyle"
        >
          @for (option of options; track option.value) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="value === option.value"
              (click)="selectOption(option.value)"
              class="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              [class.bg-blue-50]="value === option.value"
              [class.dark:bg-blue-900/30]="value === option.value"
            >
              <span>{{ option.label }}</span>
              @if (value === option.value) {
                <span class="ml-2 shrink-0 text-blue-600 dark:text-blue-400">✓</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class AdminFilterSelectComponent implements OnDestroy {
  @Input() value = '';
  @Input() placeholder = 'Select...';
  @Input() options: readonly AdminFilterSelectOption[] = [];
  @Input() ariaLabel = 'Filter';
  @Input() triggerId?: string;

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('triggerButton') triggerButton?: ElementRef<HTMLButtonElement>;

  showDropdown = false;
  dropdownPanelStyle: Record<string, string> = {};

  private readonly cdr = inject(ChangeDetectorRef);

  get selectedLabel(): string {
    const match = this.options.find((option) => option.value === this.value);
    return match?.label ?? this.placeholder;
  }

  private readonly boundReposition = (): void => {
    this.updateDropdownPosition();
  };

  toggleDropdown(): void {
    if (this.showDropdown) {
      this.closeDropdown();
      return;
    }
    this.showDropdown = true;
    this.updateDropdownPosition();
    this.attachRepositionListeners();
    this.cdr.markForCheck();
  }

  closeDropdown(): void {
    if (!this.showDropdown) {
      return;
    }
    this.showDropdown = false;
    this.detachRepositionListeners();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.detachRepositionListeners();
  }

  selectOption(nextValue: string): void {
    this.valueChange.emit(nextValue);
    this.closeDropdown();
  }

  private attachRepositionListeners(): void {
    document.addEventListener('scroll', this.boundReposition, true);
    window.addEventListener('resize', this.boundReposition);
  }

  private detachRepositionListeners(): void {
    document.removeEventListener('scroll', this.boundReposition, true);
    window.removeEventListener('resize', this.boundReposition);
  }

  private updateDropdownPosition(): void {
    const trigger = this.triggerButton?.nativeElement;
    if (!trigger) {
      return;
    }
    this.dropdownPanelStyle = buildFixedDropdownPanelStyle(trigger);
  }
}
