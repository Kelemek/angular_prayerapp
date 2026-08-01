import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";

export type PrayerDeleteRequestType = "prayer" | "update";

export interface PrayerDeleteRequestPayload {
  reason: string;
}

@Component({
  selector: "app-prayer-delete-request-modal",
  standalone: true,
  imports: [FormsModule, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
    <app-modal-shell
      [title]="modalTitle"
      titleId="delete-request-modal-title"
      closeAriaLabel="Close deletion request dialog"
      (close)="closeModal()"
    >
      <form
        #deleteForm="ngForm"
        (ngSubmit)="deleteForm.valid && handleSubmit()"
        class="p-6 space-y-4"
      >
        <div>
          <label
            [for]="reasonFieldId"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Reason for deletion <span aria-label="required">*</span>
          </label>
          <textarea
            [id]="reasonFieldId"
            placeholder="Reason for deletion request..."
            [(ngModel)]="deleteReason"
            name="deleteReason"
            aria-label="Reason for deletion"
            rows="5"
            class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-inset-surface text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[5rem] whitespace-pre-wrap"
            required
          ></textarea>
        </div>

        <div class="flex justify-end pt-4">
          <button
            type="submit"
            [disabled]="!deleteForm.valid"
            class="btn-chip btn-chip-red min-h-12 px-8 py-3 text-base rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Submit deletion request"
          >
            Submit Request
          </button>
        </div>
      </form>
    </app-modal-shell>
    }
  `,
  styles: [],
})
export class PrayerDeleteRequestModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() prayerId = "";
  @Input() requestType: PrayerDeleteRequestType = "prayer";
  @Input() updateId = "";

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<PrayerDeleteRequestPayload>();

  deleteReason = "";

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isOpen"]?.currentValue === false) {
      this.resetForm();
      return;
    }

    if (!this.isOpen) {
      return;
    }

    const requestTypeChanged =
      !!changes["requestType"] && !changes["requestType"].firstChange;
    const updateIdChanged =
      !!changes["updateId"] && !changes["updateId"].firstChange;

    if (requestTypeChanged || updateIdChanged) {
      this.resetForm();
    }
  }

  get modalTitle(): string {
    return this.requestType === "update"
      ? "Request Update Deletion"
      : "Request Prayer Deletion";
  }

  get reasonFieldId(): string {
    if (this.requestType === "update" && this.updateId) {
      return `updateDeleteReason-${this.updateId}`;
    }
    return `deleteReason-${this.prayerId}`;
  }

  handleSubmit(): void {
    this.submit.emit({ reason: this.deleteReason });
    this.resetForm();
  }

  closeModal(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.deleteReason = "";
  }
}
