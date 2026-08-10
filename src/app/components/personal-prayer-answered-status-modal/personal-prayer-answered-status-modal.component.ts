import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrayerService } from '../../services/prayer.service';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';

export type PersonalPrayerAnsweredStatusMode = 'mark' | 'unmark';

@Component({
  selector: 'app-personal-prayer-answered-status-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
    <app-modal-shell
      [title]="mode === 'mark' ? 'Mark as answered?' : 'Mark as unanswered?'"
      titleId="personal-prayer-answered-status-title"
      panelId="personal-prayer-answered-status-modal"
      closeAriaLabel="Close answered status dialog"
      (close)="onCancel()"
    >
      <div class="space-y-4 p-6">
        @if (mode === 'mark') {
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Move this prayer to the <strong>Answered</strong> category? You can tap the
          checkmark again later to move it back and choose a different category.
        </p>
        } @else {
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Move this prayer out of <strong>Answered</strong>. Choose a category below,
          or leave it blank to keep it uncategorized.
        </p>
        <div class="personal-answered-category-field space-y-2">
          <label
            for="unmarkCategory"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Category
            <span class="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            id="unmarkCategory"
            [(ngModel)]="category"
            name="unmarkCategory"
            autocomplete="off"
            maxlength="50"
            aria-label="Prayer category"
            placeholder="e.g., Health, Family, Work"
            (focus)="onCategoryFocus()"
            (input)="onCategoryInput()"
            (keydown)="onCategoryKeyDown($event)"
            class="w-full rounded-md border border-gray-300 bg-inset-surface px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-100"
          />
          @if (showCategoryDropdown && filteredCategories.length > 0) {
          <div
            role="listbox"
            aria-label="Category suggestions"
            class="max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
          >
            @for (option of filteredCategories; track option; let i = $index) {
            <button
              type="button"
              role="option"
              (click)="selectCategory(option)"
              [class.bg-blue-100]="i === selectedCategoryIndex"
              [class.dark:bg-gray-600]="i === selectedCategoryIndex"
              class="w-full px-3 py-2 text-left text-gray-900 transition-colors hover:bg-blue-50 focus:bg-blue-100 focus:outline-none dark:text-gray-100 dark:hover:bg-gray-600 dark:focus:bg-gray-600"
            >
              {{ option }}
            </button>
            }
          </div>
          }
        </div>
        }

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            (click)="onCancel()"
            class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="onConfirm()"
            [disabled]="!canConfirm"
            class="btn-chip btn-chip-blue cursor-pointer rounded-md px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ mode === 'mark' ? 'Mark as answered' : 'Move out of Answered' }}
          </button>
        </div>
      </div>
    </app-modal-shell>
    }
  `,
})
export class PersonalPrayerAnsweredStatusModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() mode: PersonalPrayerAnsweredStatusMode = 'mark';

  @Output() close = new EventEmitter<void>();
  @Output() confirmMark = new EventEmitter<void>();
  @Output() confirmUnmark = new EventEmitter<string | null>();

  category = '';
  availableCategories: string[] = [];
  filteredCategories: string[] = [];
  showCategoryDropdown = false;
  selectedCategoryIndex = -1;

  constructor(
    private prayerService: PrayerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue || changes['mode']?.currentValue) {
      if (this.isOpen && this.mode === 'unmark') {
        this.resetCategoryState();
        void this.loadAvailableCategories();
      }
    }
  }

  get canConfirm(): boolean {
    if (this.mode === 'mark') {
      return true;
    }
    return this.category.trim().toLowerCase() !== 'answered';
  }

  onConfirm(): void {
    if (!this.canConfirm) {
      return;
    }
    if (this.mode === 'mark') {
      this.confirmMark.emit();
      return;
    }
    const trimmed = this.category.trim();
    this.confirmUnmark.emit(trimmed ? trimmed : null);
  }

  onCancel(): void {
    this.close.emit();
  }

  onCategoryFocus(): void {
    this.updateFilteredCategories();
    this.showCategoryDropdown = this.filteredCategories.length > 0;
    this.cdr.markForCheck();
  }

  onCategoryInput(): void {
    this.updateFilteredCategories();
    this.showCategoryDropdown = this.filteredCategories.length > 0;
    this.cdr.markForCheck();
  }

  onCategoryKeyDown(event: KeyboardEvent): void {
    if (!this.showCategoryDropdown || this.filteredCategories.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedCategoryIndex = Math.min(
          this.selectedCategoryIndex + 1,
          this.filteredCategories.length - 1
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedCategoryIndex = Math.max(this.selectedCategoryIndex - 1, 0);
        break;
      case 'Enter':
        if (this.selectedCategoryIndex >= 0) {
          event.preventDefault();
          this.selectCategory(this.filteredCategories[this.selectedCategoryIndex]);
        }
        break;
      case 'Escape':
        this.showCategoryDropdown = false;
        break;
      default:
        break;
    }
    this.cdr.markForCheck();
  }

  selectCategory(option: string): void {
    this.category = option;
    this.showCategoryDropdown = false;
    this.selectedCategoryIndex = -1;
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showCategoryDropdown) {
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest('.personal-answered-category-field')) {
      this.showCategoryDropdown = false;
      this.cdr.markForCheck();
    }
  }

  private resetCategoryState(): void {
    this.category = '';
    this.showCategoryDropdown = false;
    this.selectedCategoryIndex = -1;
    this.filteredCategories = [];
  }

  private async loadAvailableCategories(): Promise<void> {
    const categories = await this.prayerService.getUniqueCategoriesForUser();
    this.availableCategories = categories.filter(
      (category) => category.trim().toLowerCase() !== 'answered'
    );
    this.updateFilteredCategories();
    this.cdr.markForCheck();
  }

  private updateFilteredCategories(): void {
    const searchTerm = this.category.toLowerCase().trim();
    if (searchTerm === '') {
      this.filteredCategories = [...this.availableCategories];
    } else {
      this.filteredCategories = this.availableCategories.filter((cat) =>
        cat.toLowerCase().includes(searchTerm)
      );
    }
    this.selectedCategoryIndex = -1;
  }
}
