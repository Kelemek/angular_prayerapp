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
import {
  PrayerGroupService,
  type PrayerGroupSummary,
} from "../../services/prayer-group.service";
import {
  AdminFilterSelectComponent,
  type AdminFilterSelectOption,
} from "../admin-filter-select/admin-filter-select.component";
import type { PrayerFormLock } from "../../lib/prayer-form-lock";

@Component({
  selector: "app-prayer-form",
  standalone: true,
  imports: [
    FormsModule,
    NgClass,
    RichTextEditorComponent,
    ModalShellComponent,
    PersonalCategoryColorPickerComponent,
    AdminFilterSelectComponent,
  ],
  templateUrl: "./prayer-form.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class PrayerFormComponent implements OnInit, OnChanges {
  @ViewChild("descriptionEditor") descriptionEditor?: RichTextEditorComponent;

  @Input() isOpen = false;
  /** When true and the modal opens, default to Personal Prayer (matches Request while Personal filter is active). */
  @Input() defaultPersonalPrayer = false;
  /** When true and the modal opens, default to Group Prayer if the person has a group. */
  @Input() defaultGroupPrayer = false;
  /** When set, Church/Group/Personal cannot be changed. Null is the header Request picker. */
  @Input() lock: PrayerFormLock | null = null;
  @Output() close = new EventEmitter<{ isPersonal?: boolean }>();

  visibility: "public" | "group" | "personal" = "public";
  private userPickedVisibility = false;
  private groupLoadToken = 0;
  groupChoices: PrayerGroupSummary[] = [];
  groupsLoaded = false;
  selectedGroupId: string | null = null;
  isChurchMember = true;

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
    richTextEditorsSettings: RichTextEditorsSettingsService,
    private prayerGroupService: PrayerGroupService
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
    const opened = changes["isOpen"]?.currentValue === true;
    const lockChanged = changes["lock"] != null;
    if (opened) {
      this.userPickedVisibility = false;
      this.syncSessionFlags();
      this.applyDefaultVisibility();
      void this.loadGroupsForForm();
    } else if (this.isOpen && lockChanged) {
      this.userPickedVisibility = false;
      this.applyDefaultVisibility();
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

  private syncSessionFlags(): void {
    const session = this.userSessionService.getCurrentSession();
    if (session?.email) {
      this.currentUserEmail = session.email;
    }
    if (session) {
      this.isChurchMember = session.isChurchMember !== false;
    }
  }

  private loadUserInfo(): void {
    this.syncSessionFlags();
  }

  private saveUserInfo(): void {
    // Names are no longer saved - they come from localStorage managed by home component
  }

  private getCurrentUserName(): string {
    const firstName = localStorage.getItem("prayerapp_user_first_name") || "";
    const lastName = localStorage.getItem("prayerapp_user_last_name") || "";
    return `${firstName} ${lastName}`.trim();
  }

  get showChurchOption(): boolean {
    return this.isChurchMember;
  }

  get groupSelectOptions(): AdminFilterSelectOption[] {
    return this.groupChoices.map((group) => ({
      value: group.id,
      label: group.name,
    }));
  }

  onGroupIdChange(groupId: string): void {
    this.selectedGroupId = groupId;
  }

  get showGroupOption(): boolean {
    return this.groupChoices.length > 0;
  }

  get visibilityGridClass(): string {
    const count =
      (this.showChurchOption ? 1 : 0) + (this.showGroupOption ? 1 : 0) + 1;
    return count >= 3 ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3";
  }

  pickVisibility(visibility: "public" | "group" | "personal"): void {
    if (this.lock) return;
    this.userPickedVisibility = true;
    this.setVisibility(visibility);
  }

  setVisibility(visibility: "public" | "group" | "personal"): void {
    this.visibility = visibility;
    this.formData.is_personal = visibility === "personal";
    if (visibility === "group" && !this.selectedGroupId) {
      this.selectedGroupId = this.defaultGroupId();
    }
    if (visibility !== "public") {
      this.formData.is_anonymous = false;
    }
  }

  async loadGroupsForForm(): Promise<void> {
    const token = ++this.groupLoadToken;
    this.groupsLoaded = false;
    let choices: PrayerGroupSummary[] = [];
    try {
      choices = await this.prayerGroupService.listGroups();
    } catch {
      choices = [];
    }
    if (token !== this.groupLoadToken) return;
    this.groupChoices = choices;
    this.groupsLoaded = true;
    if (this.lock) {
      this.applyLock();
      this.cdr.markForCheck();
      return;
    }
    if (
      this.isOpen &&
      this.defaultGroupPrayer &&
      this.showGroupOption &&
      !this.userPickedVisibility
    ) {
      this.setVisibility("group");
    } else if (this.visibility === "group" && !this.showGroupOption) {
      this.applyDefaultVisibility();
    } else if (this.visibility === "group") {
      this.selectedGroupId = this.selectedGroupId ?? this.defaultGroupId();
    } else if (this.isOpen && !this.userPickedVisibility) {
      this.applyDefaultVisibility();
    }
    this.cdr.markForCheck();
  }

  private defaultGroupId(): string | null {
    const preferred = this.prayerGroupService.preferredGroupId;
    if (preferred && this.groupChoices.some((group) => group.id === preferred)) {
      return preferred;
    }
    return this.groupChoices[0]?.id ?? null;
  }

  private applyLock(): void {
    const lock = this.lock;
    if (!lock) return;
    switch (lock.scope) {
      case "personal":
        this.setVisibility("personal");
        return;
      case "group":
        this.setVisibility("group");
        this.selectLockedGroup();
        return;
      case "church":
        this.setVisibility("public");
        return;
      default: {
        const _exhaustive: never = lock;
        return _exhaustive;
      }
    }
  }

  private selectLockedGroup(): void {
    const lock = this.lock;
    if (lock?.scope !== "group") return;
    const requested = lock.groupId;
    if (
      requested &&
      this.groupChoices.some((group) => group.id === requested)
    ) {
      this.selectedGroupId = requested;
      return;
    }
    this.selectedGroupId = this.defaultGroupId();
  }

  private applyDefaultVisibility(): void {
    if (this.lock) {
      this.applyLock();
      return;
    }
    if (this.defaultPersonalPrayer) {
      this.setVisibility("personal");
      return;
    }
    if (this.defaultGroupPrayer && this.showGroupOption) {
      this.setVisibility("group");
      return;
    }
    if (this.showChurchOption) {
      this.setVisibility("public");
      return;
    }
    if (this.showGroupOption) {
      this.setVisibility("group");
      return;
    }
    this.setVisibility("personal");
  }

  isFormValid(): boolean {
    const filled = !!(
      this.currentUserEmail.trim() &&
      this.formData.prayer_for.trim() &&
      this.formData.description.trim()
    );
    if (!filled) return false;
    if (this.visibility === "group") return !!this.selectedGroupId;
    return true;
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

      if (this.visibility === "group") {
        await this.submitGroupPrayer(fullName);
        return;
      }

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

  private async submitGroupPrayer(fullName: string): Promise<void> {
    const groupId = this.selectedGroupId;
    if (!groupId) return;
    try {
      await this.prayerGroupService.addPrayer({
        groupId,
        title: `Prayer for ${this.formData.prayer_for.trim()}`,
        prayerFor: this.formData.prayer_for.trim(),
        description: this.formData.description,
        requester: fullName || "Group member",
        email: this.currentUserEmail,
      });
      this.showSuccessMessage = true;
      this.cdr.markForCheck();
      this.close.emit({ isPersonal: false });
      this.formData = { ...EMPTY_PRAYER_FORM_FIELDS };
      this.visibility = "public";
      this.selectedGroupId = null;
      setTimeout(() => {
        this.showSuccessMessage = false;
        this.cdr.markForCheck();
      }, 5000);
    } catch (error) {
      console.error("Failed to add group prayer:", error);
      this.toast.error("Failed to submit prayer request. Please try again.");
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
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
    this.setVisibility("personal");
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
    this.visibility = "public";
    this.selectedGroupId = null;
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
