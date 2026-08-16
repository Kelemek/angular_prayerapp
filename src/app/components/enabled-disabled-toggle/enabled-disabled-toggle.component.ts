import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-enabled-disabled-toggle',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loaded) {
      <div class="grid grid-cols-2 gap-1.5 sm:gap-2">
        <button
          type="button"
          (click)="onSelect(true)"
          [disabled]="saving"
          [ngClass]="{
            'border-blue-500 bg-blue-200 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-200 dark:hover:bg-blue-900/30':
              value === true,
            'border-church-surface-inactive-border dark:border-gray-700 bg-church-surface-inactive dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20':
              value !== true
          }"
          [title]="enabledTitle"
          class="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">{{
            enabledLabel
          }}</span>
        </button>
        <button
          type="button"
          (click)="onSelect(false)"
          [disabled]="saving"
          [ngClass]="{
            'border-blue-500 bg-blue-200 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-200 dark:hover:bg-blue-900/30':
              value === false,
            'border-church-surface-inactive-border dark:border-gray-700 bg-church-surface-inactive dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20':
              value !== false
          }"
          [title]="disabledTitle"
          class="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">{{
            disabledLabel
          }}</span>
        </button>
      </div>
    } @else {
      <div class="grid grid-cols-2 gap-1.5 sm:gap-2">
        <div class="h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
        <div class="h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
      </div>
    }
  `,
})
export class EnabledDisabledToggleComponent {
  @Input() loaded = false;
  @Input() saving = false;
  @Input() value: boolean | null = null;
  @Input() enabledLabel = 'Enabled';
  @Input() disabledLabel = 'Disabled';
  @Input() enabledTitle = '';
  @Input() disabledTitle = '';

  @Output() valueChange = new EventEmitter<boolean>();

  onSelect(next: boolean): void {
    if (this.saving || this.value === next) {
      return;
    }
    this.valueChange.emit(next);
  }
}
