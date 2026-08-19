import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

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
        <div class="fixed inset-0 z-10" (click)="closeDropdown()"></div>
        <div
          role="listbox"
          [attr.aria-label]="ariaLabel"
          class="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
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
export class AdminFilterSelectComponent {
  @Input() value = '';
  @Input() placeholder = 'Select...';
  @Input() options: readonly AdminFilterSelectOption[] = [];
  @Input() ariaLabel = 'Filter';
  @Input() triggerId?: string;

  @Output() valueChange = new EventEmitter<string>();

  showDropdown = false;

  get selectedLabel(): string {
    const match = this.options.find((option) => option.value === this.value);
    return match?.label ?? this.placeholder;
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  selectOption(nextValue: string): void {
    this.valueChange.emit(nextValue);
    this.closeDropdown();
  }
}
