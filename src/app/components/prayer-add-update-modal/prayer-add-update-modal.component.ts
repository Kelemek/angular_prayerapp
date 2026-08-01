import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RichTextEditorComponent } from "../rich-text-editor/rich-text-editor.component";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";
import { ToastService } from "../../services/toast.service";
import {
  MARK_AS_ANSWERED_DEFAULT_UPDATE_CONTENT,
  resolvePrayerUpdateContent,
} from "../../lib/prayer-update-content";

export { MARK_AS_ANSWERED_DEFAULT_UPDATE_CONTENT };

export interface PrayerAddUpdatePayload {
  content: string;
  is_anonymous: boolean;
  mark_as_answered: boolean;
}

/** Rejects native DOM `SubmitEvent` objects that collide with the old `submit` output name. */
export function isPrayerAddUpdatePayload(
  value: unknown
): value is PrayerAddUpdatePayload {
  if (typeof value !== "object" || value === null) return false;
  const p = value as PrayerAddUpdatePayload;
  return (
    typeof p.content === "string" &&
    typeof p.is_anonymous === "boolean" &&
    typeof p.mark_as_answered === "boolean"
  );
}

@Component({
  selector: "app-prayer-add-update-modal",
  standalone: true,
  imports: [FormsModule, RichTextEditorComponent, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
    <app-modal-shell
      title="Add Prayer Update"
      titleId="add-update-modal-title"
      closeAriaLabel="Close add update dialog"
      (close)="closeModal()"
    >
      <form
        #updateForm="ngForm"
        (ngSubmit)="canSubmit() && handleSubmit()"
        class="p-6 space-y-4"
      >
        <div [attr.id]="updateContentElementId">
          @if (richTextEditorsEnabled) {
          <app-rich-text-editor
            #addUpdateRichText
            [(ngModel)]="updateContent"
            name="updateContent"
            ngDefaultControl
            ariaLabel="Prayer update details"
            placeholder="Prayer update..."
            minHeight="5rem"
          ></app-rich-text-editor>
          } @else {
          <textarea
            [(ngModel)]="updateContent"
            name="updateContent"
            rows="6"
            aria-label="Prayer update details"
            placeholder="Prayer update..."
            class="w-full px-3 py-2 border border-[#39704D]/40 dark:border-[#5FB876]/40 rounded-md focus:outline-none focus:ring-2 focus:ring-[#39704D] bg-inset-surface text-gray-900 dark:text-gray-100 min-h-[5rem] whitespace-pre-wrap"
          ></textarea>
          }
        </div>

        @if (showAnonymousOption()) {
        <div
          class="flex items-center gap-2"
          [attr.id]="anonymousCheckboxWrapId"
        >
          <input
            type="checkbox"
            [attr.id]="anonymousCheckboxInputId"
            [(ngModel)]="updateIsAnonymous"
            name="updateIsAnonymous"
            class="rounded border-gray-900 dark:border-white focus:ring-2 focus:ring-[#39704D]"
          />
          <label
            [for]="anonymousCheckboxInputId"
            class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Post update anonymously
          </label>
        </div>
        }

        <div
          class="flex items-center gap-2"
          [attr.id]="markAnsweredCheckboxWrapId"
        >
          <input
            type="checkbox"
            [attr.id]="markAnsweredCheckboxInputId"
            [(ngModel)]="updateMarkAsAnswered"
            name="updateMarkAsAnswered"
            class="rounded border-gray-900 dark:border-white focus:ring-2 focus:ring-[#39704D]"
          />
          <label
            [for]="markAnsweredCheckboxInputId"
            class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Mark this prayer as answered
          </label>
        </div>

        <div class="flex justify-end pt-4">
          <button
            type="submit"
            [attr.id]="submitButtonId"
            [disabled]="!canSubmit()"
            class="btn-chip btn-chip-green min-h-11 px-6 py-2.5 text-base rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Submit prayer update"
          >
            Add Update
          </button>
        </div>
      </form>
    </app-modal-shell>
    }
  `,
  styles: [],
})
export class PrayerAddUpdateModalComponent implements OnChanges {
  @ViewChild("addUpdateRichText") addUpdateRichText?: RichTextEditorComponent;

  @Input() isOpen = false;
  @Input() prayerId = "";
  @Input() isPersonal = false;
  @Input() richTextEditorsEnabled = true;
  /** Optional tour/help anchor element ids (omit for default per-prayer ids). */
  @Input() tourElementIds: {
    content?: string;
    anonymousWrap?: string;
    anonymousInput?: string;
    markAnsweredWrap?: string;
    markAnsweredInput?: string;
    submit?: string;
  } | null = null;

  @Output() close = new EventEmitter<void>();
  /** Named `updateSubmit` to avoid collision with the native form `submit` event. */
  @Output() updateSubmit = new EventEmitter<PrayerAddUpdatePayload>();

  updateContent = "";
  updateIsAnonymous = false;
  updateMarkAsAnswered = false;
  private isSubmitting = false;

  constructor(private toast: ToastService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isOpen"]?.currentValue === false) {
      this.resetForm();
    }
  }

  get updateContentElementId(): string {
    return this.tourElementIds?.content ?? `updateContent-${this.prayerId}`;
  }

  get anonymousCheckboxWrapId(): string | null {
    return this.tourElementIds?.anonymousWrap ?? null;
  }

  get anonymousCheckboxInputId(): string {
    return (
      this.tourElementIds?.anonymousInput ?? `updateIsAnonymous-${this.prayerId}`
    );
  }

  get markAnsweredCheckboxWrapId(): string | null {
    return this.tourElementIds?.markAnsweredWrap ?? null;
  }

  get markAnsweredCheckboxInputId(): string {
    return (
      this.tourElementIds?.markAnsweredInput ??
      `updateMarkAsAnswered-${this.prayerId}`
    );
  }

  get submitButtonId(): string | null {
    return this.tourElementIds?.submit ?? null;
  }

  showAnonymousOption(): boolean {
    return !this.isPersonal && !this.prayerId.startsWith("pc-member-");
  }

  canSubmit(): boolean {
    if (this.isSubmitting) {
      return false;
    }
    if (this.updateMarkAsAnswered) {
      return true;
    }
    return !!resolvePrayerUpdateContent(this.readContentForValidation(), false);
  }

  handleSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    const rawContent = this.readRawContent();
    const content = resolvePrayerUpdateContent(
      rawContent,
      this.updateMarkAsAnswered
    );
    if (!content) {
      this.toast.error("Please enter update content");
      return;
    }

    this.isSubmitting = true;
    this.updateSubmit.emit({
      content,
      is_anonymous: this.updateIsAnonymous,
      mark_as_answered: this.updateMarkAsAnswered,
    });
  }

  private readRawContent(): string {
    if (this.addUpdateRichText) {
      return this.addUpdateRichText.flushMarkdownToForm();
    }
    return this.updateContent;
  }

  private readContentForValidation(): string {
    if (this.addUpdateRichText) {
      const plain = this.addUpdateRichText.getPlainText().trim();
      if (plain) {
        return plain;
      }
      const markdown = this.addUpdateRichText.peekMarkdown().trim();
      if (markdown) {
        return markdown;
      }
    }
    return this.updateContent;
  }

  closeModal(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.isSubmitting = false;
    this.updateContent = "";
    this.updateIsAnonymous = false;
    this.updateMarkAsAnswered = false;
  }
}
