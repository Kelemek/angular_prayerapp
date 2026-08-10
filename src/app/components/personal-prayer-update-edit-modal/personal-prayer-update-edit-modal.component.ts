import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectorRef,
  OnChanges,
  ViewChild,
  DestroyRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PrayerService, PrayerUpdate } from "../../services/prayer.service";
import { ToastService } from "../../services/toast.service";
import { RichTextEditorsSettingsService } from "../../services/rich-text-editors-settings.service";
import { RichTextEditorComponent } from "../rich-text-editor/rich-text-editor.component";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";
import { resolvePrayerUpdateContent } from "../../lib/prayer-update-content";

@Component({
  selector: "app-personal-prayer-update-edit-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, RichTextEditorComponent, ModalShellComponent],
  template: `
    @if (isOpen && update) {
    <app-modal-shell
      title="Edit Prayer Update"
      titleId="edit-update-title"
      closeAriaLabel="Close edit dialog"
      (close)="onModalClose()"
    >
        <form
          #editForm="ngForm"
          (ngSubmit)="canSave() && handleSubmit()"
          class="p-6 space-y-4"
        >
          <!-- Content -->
          <div>
            <label
              for="content"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Update Content
              @if (!markAsAnswered) {
              <span aria-label="required">*</span>
              }
            </label>
            @if (richTextEditorsEnabled) {
            <app-rich-text-editor
              #contentEditor
              [(ngModel)]="formData.content"
              name="content"
              ngDefaultControl
              ariaLabel="Prayer update content"
              placeholder="Update details…"
              minHeight="8rem"
            ></app-rich-text-editor>
            } @else {
            <textarea
              id="content"
              name="content"
              [(ngModel)]="formData.content"
              [required]="!markAsAnswered"
              rows="10"
              aria-label="Prayer update content"
              placeholder="Update details…"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-inset-surface text-gray-900 dark:text-gray-100 min-h-[8rem] whitespace-pre-wrap"
            ></textarea>
            }
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="editUpdateMarkAsAnswered"
              [(ngModel)]="markAsAnswered"
              name="markAsAnswered"
              class="rounded border-gray-900 dark:border-white focus:ring-2 focus:ring-[#39704D]"
            />
            <label
              for="editUpdateMarkAsAnswered"
              class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Mark this prayer as answered
            </label>
          </div>

          <div class="flex justify-end pt-4">
            <button
              type="submit"
              [disabled]="!canSave()"
              class="min-h-12 px-8 py-3 text-base font-medium btn-chip btn-chip-green disabled:opacity-50 disabled:cursor-not-allowed"
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
export class PersonalPrayerUpdateEditModalComponent
  implements OnInit, OnChanges
{
  @ViewChild("contentEditor") contentEditor?: RichTextEditorComponent;

  @Input() isOpen = false;
  @Input() update: PrayerUpdate | null = null;
  @Input() prayerId: string = "";
  @Input() isMemberUpdate = false;
  @Input() planningCenterListId: string | null = null; // For cache invalidation on member updates
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Partial<PrayerUpdate>>();

  formData = {
    content: "",
  };

  markAsAnswered = false;
  isSubmitting = false;
  richTextEditorsEnabled = true;

  constructor(
    private prayerService: PrayerService,
    private toast: ToastService,
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

  ngOnInit(): void {}

  ngOnChanges(): void {
    if (this.isOpen && this.update) {
      this.formData = {
        content: this.update.content,
      };
      if (this.isMemberUpdate) {
        this.markAsAnswered = !!this.update.is_answered;
      } else {
        // Prayer category is source of truth. Do not pre-check from a stale
        // update.mark_as_answered after the prayer was unmarked via header/edit.
        this.markAsAnswered = this.getPersonalPrayerCategory() === "Answered";
      }
    }
  }

  private getPersonalPrayerCategory(): string | null {
    return (
      this.prayerService
        .getPersonalPrayersSnapshot()
        .find((p) => p.id === this.prayerId)?.category ?? null
    );
  }

  canSave(): boolean {
    if (this.isSubmitting) {
      return false;
    }
    if (this.markAsAnswered) {
      return true;
    }
    return !!resolvePrayerUpdateContent(this.readContentForValidation(), false);
  }

  private readContentForValidation(): string {
    if (this.contentEditor) {
      const plain = this.contentEditor.getPlainText().trim();
      if (plain) {
        return plain;
      }
      const markdown = this.contentEditor.peekMarkdown().trim();
      if (markdown) {
        return markdown;
      }
    }
    return this.formData.content;
  }

  async handleSubmit(): Promise<void> {
    if (this.isSubmitting || !this.update) return;

    try {
      this.isSubmitting = true;
      this.cdr.markForCheck();

      const flushed = this.contentEditor?.flushMarkdownToForm();
      const rawContent =
        flushed !== undefined ? flushed : this.formData.content;
      const content = resolvePrayerUpdateContent(
        rawContent,
        this.markAsAnswered
      );
      if (!content) {
        this.toast.error("Please enter update content");
        return;
      }

      let success: boolean;

      if (this.isMemberUpdate) {
        const personId = this.prayerId.substring("pc-member-".length);
        const updates: Partial<PrayerUpdate> = {
          content,
          is_answered: this.markAsAnswered,
        };
        success = await this.prayerService.updateMemberPrayerUpdate(
          this.update.id,
          personId,
          updates,
          this.planningCenterListId ?? undefined
        );
        if (success) {
          this.save.emit(updates);
          this.close.emit();
        }
      } else {
        const previousCategory = this.getPersonalPrayerCategory();
        // Sync category to match the checkbox: set Answered when checked, clear when
        // unchecked even if only the prayer (not this update) was marked answered.
        const needsCategoryChange = this.markAsAnswered
          ? previousCategory !== "Answered"
          : previousCategory === "Answered";
        const silentCategory = { silentSuccess: true as const };

        if (needsCategoryChange) {
          const categoryOk = await this.prayerService.updatePersonalPrayer(
            this.prayerId,
            { category: this.markAsAnswered ? "Answered" : null },
            silentCategory
          );
          if (!categoryOk) {
            return;
          }
        }

        const updates: Partial<PrayerUpdate> = {
          content,
          mark_as_answered: this.markAsAnswered,
        };
        success = await this.prayerService.updatePersonalPrayerUpdate(
          this.update.id,
          this.prayerId,
          updates
        );
        if (!success) {
          if (needsCategoryChange) {
            const rolledBack = await this.prayerService.updatePersonalPrayer(
              this.prayerId,
              { category: previousCategory },
              silentCategory
            );
            if (!rolledBack) {
              this.toast.error(
                "Update was not saved, and the prayer category could not be restored. Please refresh and try again."
              );
            }
          }
          return;
        }
        this.save.emit(updates);
        this.close.emit();
      }
    } catch (error) {
      console.error("Error updating prayer update:", error);
      this.toast.error("Failed to save prayer update. Please try again.");
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  cancel(): void {
    this.formData = {
      content: "",
    };
    this.markAsAnswered = false;
    this.close.emit();
  }

  onModalClose(): void {
    if (this.isSubmitting) return;
    this.cancel();
  }
}
