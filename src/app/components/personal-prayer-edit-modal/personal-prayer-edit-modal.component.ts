import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  DestroyRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PrayerRequest } from "../../services/prayer.service";
import { PrayerService } from "../../services/prayer.service";
import { ToastService } from "../../services/toast.service";
import { RichTextEditorsSettingsService } from "../../services/rich-text-editors-settings.service";
import { PersonalCategoryColorService } from "../../services/personal-category-color.service";
import { PersonalCategoryColorPickerComponent } from "../personal-category-color-picker/personal-category-color-picker.component";
import { RichTextEditorComponent } from "../rich-text-editor/rich-text-editor.component";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";

@Component({
  selector: "app-personal-prayer-edit-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, RichTextEditorComponent, ModalShellComponent, PersonalCategoryColorPickerComponent],
  template: `
    @if (isOpen && prayer) {
    <app-modal-shell
      title="Edit Prayer"
      titleId="edit-prayer-title"
      panelId="tour-personal-prayer-edit-modal"
      closeAriaLabel="Close edit dialog"
      (close)="onModalClose()"
    >
        <form
          #editForm="ngForm"
          (ngSubmit)="editForm.valid && handleSubmit()"
          class="p-6 space-y-4"
        >
          <!-- Title -->
          <div>
            <label
              for="prayer_title"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Prayer For <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="prayer_title"
              [(ngModel)]="formData.prayer_for"
              name="prayer_for"
              required
              aria-required="true"
              aria-label="Prayer For"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-inset-surface text-gray-900 dark:text-gray-100"
            />
          </div>

          <!-- Description -->
          <div>
            <label
              for="description"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Prayer Request Details
              <span class="text-gray-500 dark:text-gray-400">(optional)</span>
            </label>
            @if (richTextEditorsEnabled) {
            <app-rich-text-editor
              #descriptionEditor
              [(ngModel)]="formData.description"
              name="description"
              ngDefaultControl
              ariaLabel="Prayer Request Details"
              placeholder="Describe the prayer request"
              minHeight="6rem"
            ></app-rich-text-editor>
            } @else {
            <textarea
              id="description"
              name="description"
              [(ngModel)]="formData.description"
              rows="8"
              aria-label="Prayer Request Details"
              placeholder="Describe the prayer request"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-inset-surface text-gray-900 dark:text-gray-100 min-h-[6rem] whitespace-pre-wrap"
            ></textarea>
            }
          </div>

          <!-- Category -->
          <div class="relative">
            <label
              for="category"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Category
              <span class="text-gray-500 dark:text-gray-400"
                >(optional, {{ formData.category.length }}/50 characters
                max)</span
              >
            </label>
            <div class="space-y-2">
              <div class="relative min-w-0">
            <input
              type="text"
              id="category"
              [(ngModel)]="formData.category"
              name="category"
              autocomplete="off"
              maxlength="50"
              aria-label="Prayer category"
              (focus)="showCategoryDropdown = true"
              (input)="onCategoryInput($event)"
              (keydown)="onCategoryKeyDown($event)"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-inset-surface text-gray-900 dark:text-gray-100"
              placeholder="e.g., Health, Family, Work"
            />
            <!-- Category Dropdown -->
            @if (showCategoryDropdown && filteredCategories.length > 0) {
            <div
              class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto"
            >
              @for (category of filteredCategories; track category; let i =
              $index) {
              <button
                type="button"
                (click)="selectCategory(category)"
                [class.bg-blue-100]="i === selectedCategoryIndex"
                [class.dark:bg-gray-600]="i === selectedCategoryIndex"
                class="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:bg-blue-100 dark:focus:bg-gray-600 transition-colors"
              >
                {{ category }}
              </button>
              }
            </div>
            }
              </div>
              @if (formData.category.trim()) {
              <app-personal-category-color-picker
                layout="inline"
                colorDisplay="text"
                [color]="categoryColor"
                [categoryLabel]="formData.category"
                (colorChange)="onCategoryColorChange($event)"
              />
              }
            </div>
          </div>

          <div class="flex justify-end pt-4">
            <button
              type="submit"
              [disabled]="!editForm.valid || isSubmitting"
              class="min-h-12 px-8 py-3 text-base font-medium btn-chip btn-chip-blue disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Save changes"
            >
              {{ isSubmitting ? "Saving..." : "Save Changes" }}
            </button>
          </div>
        </form>
    </app-modal-shell>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class PersonalPrayerEditModalComponent implements OnInit, OnChanges {
  @ViewChild("descriptionEditor") descriptionEditor?: RichTextEditorComponent;

  @Input() isOpen = false;
  @Input() prayer: PrayerRequest | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Partial<PrayerRequest>>();

  formData = {
    prayer_for: "",
    description: "",
    category: "",
  };

  availableCategories: string[] = [];
  filteredCategories: string[] = [];
  showCategoryDropdown = false;
  selectedCategoryIndex = -1;
  categoryColor = '#2563EB';
  private categoryColorDirty = false;
  isSubmitting = false;
  richTextEditorsEnabled = true;

  constructor(
    private prayerService: PrayerService,
    private toast: ToastService,
    private personalCategoryColorService: PersonalCategoryColorService,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    richTextEditorsSettings: RichTextEditorsSettingsService
  ) {
    richTextEditorsSettings
      .getRichTextEditorsEnabled$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.richTextEditorsEnabled = v;
        this.cdr.markForCheck();
      });

    this.personalCategoryColorService.colors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.isOpen && this.prayer && !this.categoryColorDirty) {
          this.refreshCategoryColorFromService();
        }
        this.cdr.markForCheck();
      });
  }

  ngOnInit(): void {
    this.loadAvailableCategories();
    void this.personalCategoryColorService.loadColors();
  }

  ngOnChanges(): void {
    if (this.isOpen && this.prayer) {
      this.formData = {
        prayer_for: this.prayer.prayer_for,
        description: this.prayer.description,
        category: this.prayer.category || "",
      };
      this.categoryColorDirty = false;
      this.refreshCategoryColorFromService();
      void this.personalCategoryColorService.loadColors();
      this.loadAvailableCategories();
    }
  }

  private refreshCategoryColorFromService(): void {
    const category = this.formData.category.trim();
    if (!category) {
      return;
    }
    this.categoryColor = this.personalCategoryColorService.getColor(category);
  }

  private loadAvailableCategories(): void {
    this.prayerService.getUniqueCategoriesForUser().then((cats) => {
      this.availableCategories = cats;
      this.updateFilteredCategories();
    });
  }

  onCategoryInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    this.formData.category = input;
    this.syncCategoryColorForInput(input);
    this.updateFilteredCategories();
    // Show dropdown if there are filtered results
    if (this.filteredCategories.length > 0) {
      this.showCategoryDropdown = true;
    }
  }

  private updateFilteredCategories(): void {
    const searchTerm = this.formData.category.toLowerCase().trim();
    if (searchTerm === "") {
      this.filteredCategories = [];
    } else {
      this.filteredCategories = this.availableCategories.filter((cat) =>
        cat.toLowerCase().includes(searchTerm)
      );
    }
    this.selectedCategoryIndex = -1;
  }

  selectCategory(category: string): void {
    this.formData.category = category;
    this.categoryColor = this.personalCategoryColorService.getColor(category);
    this.categoryColorDirty = false;
    this.showCategoryDropdown = false;
    this.filteredCategories = [];
    this.selectedCategoryIndex = -1;
    this.cdr.markForCheck();
  }

  onCategoryKeyDown(event: KeyboardEvent): void {
    if (!this.showCategoryDropdown || this.filteredCategories.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.selectedCategoryIndex = Math.min(
          this.selectedCategoryIndex + 1,
          this.filteredCategories.length - 1
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        this.selectedCategoryIndex = Math.max(
          this.selectedCategoryIndex - 1,
          -1
        );
        break;
      case "Enter":
        event.preventDefault();
        if (this.selectedCategoryIndex >= 0) {
          this.selectCategory(
            this.filteredCategories[this.selectedCategoryIndex]
          );
        }
        break;
      case "Escape":
        event.preventDefault();
        this.showCategoryDropdown = false;
        this.selectedCategoryIndex = -1;
        break;
    }
    this.cdr.markForCheck();
  }

  async handleSubmit(): Promise<void> {
    if (this.isSubmitting || !this.prayer) return;

    try {
      this.isSubmitting = true;
      this.cdr.markForCheck();

      this.descriptionEditor?.flushMarkdownToForm();

      const updates: Partial<PrayerRequest> = {
        prayer_for: this.formData.prayer_for,
        description: this.formData.description,
        category:
          this.formData.category.trim() === "" ? null : this.formData.category,
      };

      const success = await this.prayerService.updatePersonalPrayer(
        this.prayer.id,
        updates
      );

      if (success) {
        if (this.formData.category.trim() && this.categoryColorDirty) {
          const colorSaved = await this.personalCategoryColorService.setColor(
            this.formData.category,
            this.categoryColor
          );
          this.save.emit(updates);
          if (!colorSaved) {
            return;
          }
        } else {
          this.save.emit(updates);
        }
        this.close.emit();
      }
    } catch (error) {
      console.error("Error updating prayer:", error);
      this.toast.error("Failed to update prayer. Please try again.");
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  onCategoryColorChange(color: string): void {
    this.categoryColor = color;
    this.categoryColorDirty = true;
    this.cdr.markForCheck();
  }

  private syncCategoryColorForInput(category: string): void {
    const trimmed = category.trim();
    if (!trimmed) {
      return;
    }
    this.categoryColor = this.personalCategoryColorService.getColor(trimmed);
    this.categoryColorDirty = false;
    this.cdr.markForCheck();
  }

  cancel(): void {
    this.formData = {
      prayer_for: "",
      description: "",
      category: "",
    };
    this.showCategoryDropdown = false;
    this.categoryColor = '#2563EB';
    this.categoryColorDirty = false;
    this.close.emit();
  }

  onModalClose(): void {
    if (this.isSubmitting) return;
    this.cancel();
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (this.showCategoryDropdown) {
      const target = event.target as HTMLElement;
      // Close dropdown if click is outside the category input area
      if (
        !target.closest("#category") &&
        !target.closest('[class*="dropdown"]')
      ) {
        this.showCategoryDropdown = false;
        this.cdr.markForCheck();
      }
    }
  }
}
