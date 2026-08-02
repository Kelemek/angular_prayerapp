import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';

@Component({
  selector: 'app-personal-category-rename-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
    <app-modal-shell
      title="Rename category"
      titleId="personal-category-rename-title"
      closeAriaLabel="Close rename category dialog"
      (close)="close.emit()"
    >
      <form
        #renameForm="ngForm"
        (ngSubmit)="renameForm.valid && !saving && onSubmit()"
        class="p-6 space-y-4"
      >
        <div>
          <label
            for="personal-category-rename-input"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Category name
          </label>
          <input
            id="personal-category-rename-input"
            type="text"
            name="categoryName"
            [(ngModel)]="draftName"
            maxlength="50"
            required
            autocomplete="off"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-inset-surface text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Category name"
          />
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="!renameForm.valid || saving"
            class="btn-chip btn-chip-blue min-h-11 px-6 py-2.5 text-base rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </app-modal-shell>
    }
  `,
})
export class PersonalCategoryRenameModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() categoryName = '';
  @Input() saving = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  draftName = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue || changes['categoryName']) {
      this.draftName = this.categoryName;
    }
  }

  onSubmit(): void {
    const trimmed = this.draftName.trim();
    if (!trimmed) {
      return;
    }
    this.save.emit(trimmed);
  }
}
