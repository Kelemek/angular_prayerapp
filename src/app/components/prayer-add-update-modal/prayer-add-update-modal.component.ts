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

export interface PrayerAddUpdatePayload {
  content: string;
  is_anonymous: boolean;
  mark_as_answered: boolean;
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
        (ngSubmit)="updateForm.valid && handleSubmit()"
        class="p-6 space-y-4"
      >
        <div [attr.id]="updateContentElementId">
          @if (richTextEditorsEnabled) {
          <app-rich-text-editor
            #addUpdateRichText
            [(ngModel)]="updateContent"
            name="updateContent"
            ngDefaultControl
            required
            ariaLabel="Prayer update details"
            placeholder="Prayer update..."
            minHeight="5rem"
          ></app-rich-text-editor>
          } @else {
          <textarea
            [(ngModel)]="updateContent"
            name="updateContent"
            required
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
            [disabled]="!updateForm.valid"
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
  @Output() submit = new EventEmitter<PrayerAddUpdatePayload>();

  updateContent = "";
  updateIsAnonymous = false;
  updateMarkAsAnswered = false;

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

  handleSubmit(): void {
    this.addUpdateRichText?.flushMarkdownToForm();
    this.submit.emit({
      content: this.updateContent,
      is_anonymous: this.updateIsAnonymous,
      mark_as_answered: this.updateMarkAsAnswered,
    });
    this.resetForm();
  }

  closeModal(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.updateContent = "";
    this.updateIsAnonymous = false;
    this.updateMarkAsAnswered = false;
  }
}
