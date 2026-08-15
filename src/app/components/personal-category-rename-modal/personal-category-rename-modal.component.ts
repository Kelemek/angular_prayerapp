import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { clearBrowserTextSelection } from '../../lib/personal-category-long-press';

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
        class="p-6 space-y-4 select-none [-webkit-touch-callout:none]"
      >
        <div>
          <label
            for="personal-category-rename-input"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 select-none [-webkit-touch-callout:none]"
          >
            Category name
          </label>
          <input
            #categoryNameInput
            id="personal-category-rename-input"
            type="text"
            name="categoryName"
            [(ngModel)]="draftName"
            maxlength="50"
            required
            autocomplete="off"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-inset-surface text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
            aria-label="Category name"
          />
        </div>

        <div class="flex justify-end gap-3 pt-2 select-none [-webkit-touch-callout:none]">
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium cursor-pointer select-none [-webkit-touch-callout:none]"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="!renameForm.valid || saving"
            class="btn-chip btn-chip-blue min-h-11 px-6 py-2.5 text-base rounded-md disabled:opacity-50 disabled:cursor-not-allowed select-none [-webkit-touch-callout:none]"
          >
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </app-modal-shell>
    }
  `,
})
export class PersonalCategoryRenameModalComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  @Input() isOpen = false;
  @Input() categoryName = '';
  @Input() saving = false;
  /** Wait for the long-press finger to lift before focusing the input. */
  @Input() deferInputFocus = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  @ViewChild('categoryNameInput')
  private categoryNameInput?: ElementRef<HTMLInputElement>;

  draftName = '';
  private shouldFocusInput = false;
  private selectInputTextOnFocus = true;
  private clearDeferredInputFocus: (() => void) | null = null;

  ngAfterViewInit(): void {
    this.focusCategoryNameInputIfNeeded();
  }

  ngOnDestroy(): void {
    this.clearDeferredInputFocusListener();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === false) {
      this.clearDeferredInputFocusListener();
      this.selectInputTextOnFocus = true;
    }
    if (changes['isOpen']?.currentValue || changes['categoryName']) {
      this.draftName = this.categoryName;
    }
    if (changes['isOpen']?.currentValue) {
      clearBrowserTextSelection();
      if (this.deferInputFocus) {
        this.selectInputTextOnFocus = false;
        this.scheduleInputFocusAfterPointerRelease();
        return;
      }
      this.selectInputTextOnFocus = true;
      this.shouldFocusInput = true;
      this.focusCategoryNameInputIfNeeded();
    }
  }

  private scheduleInputFocusAfterPointerRelease(): void {
    this.clearDeferredInputFocusListener();

    const focusInput = () => {
      this.clearDeferredInputFocusListener();
      clearBrowserTextSelection();
      // Run after the long-press release guard so the touch gesture fully ends.
      window.setTimeout(() => {
        clearBrowserTextSelection();
        this.shouldFocusInput = true;
        this.focusCategoryNameInputIfNeeded();
      }, 0);
    };
    const options: AddEventListenerOptions = { capture: true, passive: true };
    document.addEventListener('pointerup', focusInput, options);
    document.addEventListener('touchend', focusInput, options);
    this.clearDeferredInputFocus = () => {
      document.removeEventListener('pointerup', focusInput, options);
      document.removeEventListener('touchend', focusInput, options);
    };
  }

  private clearDeferredInputFocusListener(): void {
    this.clearDeferredInputFocus?.();
    this.clearDeferredInputFocus = null;
  }

  private focusCategoryNameInputIfNeeded(): void {
    if (!this.isOpen || !this.shouldFocusInput) {
      return;
    }
    const input = this.categoryNameInput?.nativeElement;
    if (!input) {
      return;
    }
    this.shouldFocusInput = false;
    requestAnimationFrame(() => {
      clearBrowserTextSelection();
      input.focus({ preventScroll: true });
      if (this.selectInputTextOnFocus) {
        input.select();
        return;
      }
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }

  onSubmit(): void {
    const trimmed = this.draftName.trim();
    if (!trimmed) {
      return;
    }
    this.save.emit(trimmed);
  }
}
