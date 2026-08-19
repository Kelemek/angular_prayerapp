import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  DestroyRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { NgClass } from "@angular/common";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";
import { RichTextEditorComponent } from "../rich-text-editor/rich-text-editor.component";
import { Observable } from "rxjs";
import type { User } from "@supabase/supabase-js";
import { PrayerService } from "../../services/prayer.service";
import { AdminAuthService } from "../../services/admin-auth.service";
import { UserSessionService } from "../../services/user-session.service";
import { SupabaseService } from "../../services/supabase.service";
import { ToastService } from "../../services/toast.service";
import { RichTextEditorsSettingsService } from "../../services/rich-text-editors-settings.service";
import { PersonalCategoryColorService } from "../../services/personal-category-color.service";
import { PersonalCategoryColorPickerComponent } from "../personal-category-color-picker/personal-category-color-picker.component";
import {
  PERSONAL_PRAYER_WALKTHROUGH_CATEGORY,
  PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION,
  PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR,
} from "../../services/help-driver-tour.service";
import {
  filterPersonalPrayerCategories,
  nextCategorySelectionIndex,
  prayerFormCategoryKeyAction,
} from "../../lib/prayer-form-category";
import {
  buildPrayerFormSubmitPayload,
  EMPTY_PRAYER_FORM_FIELDS,
  submitPrayerFormRequest,
} from "../../lib/prayer-form-submit";

@Component({
  selector: "app-prayer-form",
  standalone: true,
  imports: [FormsModule, NgClass, RichTextEditorComponent, ModalShellComponent, PersonalCategoryColorPickerComponent],
  templateUrl: "./prayer-form.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class PrayerFormComponent implements OnInit, OnChanges {
  @ViewChild("descriptionEditor") descriptionEditor?: RichTextEditorComponent;

  @Input() isOpen = false;
  /** When true and the modal opens, default to Personal Prayer (matches Request while Personal filter is active). */
  @Input() defaultPersonalPrayer = false;
  @Output() close = new EventEmitter<{ isPersonal?: boolean }>();

  formData: {
    title: string;
    description: string;
    prayer_for: string;
    is_anonymous: boolean;
    is_personal: boolean;
    category: string;
  } = {
    title: "",
    description: "",
    prayer_for: "",
    is_anonymous: false,
    is_personal: false,
    category: "",
  };

  richTextEditorsEnabled = true;

  isSubmitting = false;
  showSuccessMessage = false;
  isAdmin = false;
  currentUserEmail = "";
  availableCategories: string[] = [];
  filteredCategories: string[] = [];
  selectedCategoryIndex = -1;
  showCategoryDropdown = false;
  categoryColor = '#2563EB';
  private categoryColorDirty = false;
  user$!: Observable<User | null>;

  constructor(
    private prayerService: PrayerService,
    private adminAuthService: AdminAuthService,
    private userSessionService: UserSessionService,
    private supabase: SupabaseService,
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
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.user$ = this.adminAuthService.user$;
    this.adminAuthService.isAdmin$.subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });
    // Load available categories for personal prayers
    this.prayerService.getUniqueCategoriesForUser().then((cats) => {
      this.availableCategories = cats;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isOpen"]?.currentValue === true) {
      this.formData.is_personal = this.defaultPersonalPrayer;
    }
    if (this.isOpen) {
      this.loadUserInfo();
      this.categoryColorDirty = false;
      this.prayerService.getUniqueCategoriesForUser().then((cats) => {
        this.availableCategories = cats;
      });
      void this.personalCategoryColorService.loadColors();
    }
  }

  private loadUserInfo(): void {
    try {
      // Get current user's email from UserSessionService (cached from database)
      this.userSessionService.userSession$.subscribe((session) => {
        if (session?.email) {
          this.currentUserEmail = session.email;
        }
      });
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  }

  private saveUserInfo(): void {
    // Names are no longer saved - they come from localStorage managed by home component
  }

  private getCurrentUserName(): string {
    const firstName = localStorage.getItem("prayerapp_user_first_name") || "";
    const lastName = localStorage.getItem("prayerapp_user_last_name") || "";
    return `${firstName} ${lastName}`.trim();
  }

  isFormValid(): boolean {
    return !!(
      this.currentUserEmail.trim() &&
      this.formData.prayer_for.trim() &&
      this.formData.description.trim()
    );
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
    this.filteredCategories = filterPersonalPrayerCategories(
      this.availableCategories,
      this.formData.category
    );
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
    if (event.key === "Enter" && (!this.showCategoryDropdown || this.filteredCategories.length === 0)) {
      event.preventDefault();
      return;
    }

    const action = prayerFormCategoryKeyAction(
      event.key,
      this.showCategoryDropdown,
      this.filteredCategories,
      this.selectedCategoryIndex
    );

    if (action.type === "noop") {
      return;
    }

    event.preventDefault();

    if (action.type === "select") {
      this.selectCategory(action.category);
      return;
    }

    if (action.type === "close") {
      this.showCategoryDropdown = false;
      this.selectedCategoryIndex = -1;
      this.cdr.markForCheck();
      return;
    }

    this.selectedCategoryIndex = nextCategorySelectionIndex(
      action,
      this.selectedCategoryIndex,
      this.filteredCategories.length
    );
    this.cdr.markForCheck();
  }

  async handleSubmit(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      this.cdr.markForCheck();

      this.descriptionEditor?.flushMarkdownToForm();

      // Get user name from UserSessionService cache
      const userSession = this.userSessionService.getCurrentSession();
      const fullName = userSession?.fullName || this.getCurrentUserName();

      const prayerData = buildPrayerFormSubmitPayload(
        this.formData,
        this.currentUserEmail,
        fullName
      );

      await this.submitPrayer(prayerData);
    } catch (error) {
      console.error("Failed to initiate prayer submission:", error);
      this.isSubmitting = false;
      this.cdr.markForCheck();
      this.toast.error("Failed to submit prayer request. Please try again.");
    }
  }

  private async submitPrayer(
    prayerData: ReturnType<typeof buildPrayerFormSubmitPayload>
  ): Promise<void> {
    try {
      const result = await submitPrayerFormRequest(
        this.prayerService,
        this.personalCategoryColorService,
        this.formData,
        prayerData,
        this.categoryColor,
        this.categoryColorDirty
      );

      if (!result.ok) {
        return;
      }

      this.showSuccessMessage = true;
      this.cdr.markForCheck();

      this.close.emit({ isPersonal: result.isPersonal });

      this.formData = { ...EMPTY_PRAYER_FORM_FIELDS };
      this.categoryColor = '#2563EB';
      this.categoryColorDirty = false;

      setTimeout(() => {
        this.showSuccessMessage = false;
        this.cdr.markForCheck();
      }, 5000);
    } catch (error) {
      console.error("Failed to add prayer:", error);
      throw error;
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  /** Hands-on Personal Prayers help tour — fills “Prayer for”. */
  fillWalkthroughPrayerFor(): void {
    this.formData.prayer_for = PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR;
    this.cdr.markForCheck();
  }

  /** Hands-on tour — fills description. */
  fillWalkthroughDescription(): void {
    this.formData.description = PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION;
    this.cdr.markForCheck();
  }

  /** Hands-on tour — selects Personal visibility (shows category field). */
  ensureWalkthroughPersonalSelected(): void {
    this.formData.is_personal = true;
    this.cdr.markForCheck();
  }

  /** Hands-on tour — category sample value. */
  fillWalkthroughCategory(): void {
    this.formData.category = PERSONAL_PRAYER_WALKTHROUGH_CATEGORY;
    this.categoryColor = this.personalCategoryColorService.getColor(
      PERSONAL_PRAYER_WALKTHROUGH_CATEGORY
    );
    this.showCategoryDropdown = false;
    this.filteredCategories = [];
    this.cdr.markForCheck();
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

  /** Hands-on tour — submit when valid (personal prayer). */
  submitWalkthroughPrayerForm(): void {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }
    void this.handleSubmit();
  }

  cancel(): void {
    this.formData = { ...EMPTY_PRAYER_FORM_FIELDS };
    this.showSuccessMessage = false;
    this.isSubmitting = false;
    this.showCategoryDropdown = false;
    this.categoryColor = '#2563EB';
    this.categoryColorDirty = false;
    this.close.emit();
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
