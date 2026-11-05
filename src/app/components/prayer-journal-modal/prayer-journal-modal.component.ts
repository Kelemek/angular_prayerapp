import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PrayerJournalKind } from '../../lib/prayer-journal-note';
import { PrayerJournalService } from '../../services/prayer-journal.service';
import { ToastService } from '../../services/toast.service';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { TOUR_PRAYER_JOURNAL_MODAL_ID } from '../../lib/help-tour-ids';

@Component({
  selector: 'app-prayer-journal-modal',
  standalone: true,
  imports: [FormsModule, ModalShellComponent, RichTextEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal-shell
      [attr.id]="TOUR_PRAYER_JOURNAL_MODAL_ID"
      title="Journal"
      titleId="prayer-journal-modal-title"
      closeAriaLabel="Close journal"
      (close)="close.emit()"
    >
      <form class="space-y-4 p-6" (ngSubmit)="save()">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Only you can read this note.
        </p>
        @if (richTextEditorsEnabled) {
          <app-rich-text-editor
            #journalEditor
            [(ngModel)]="draft"
            name="journalDraft"
            ngDefaultControl
            ariaLabel="Private journal note"
            placeholder="Write a private note…"
            minHeight="12rem"
            [disabled]="loading || saving"
          ></app-rich-text-editor>
        } @else {
          <textarea
            [(ngModel)]="draft"
            name="journalDraft"
            rows="8"
            aria-label="Private journal note"
            placeholder="Write a private note…"
            [disabled]="loading || saving"
            class="min-h-[12rem] w-full whitespace-pre-wrap rounded-md border border-[#39704D]/40 bg-inset-surface px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#39704D] dark:border-[#5FB876]/40 dark:text-gray-100"
          ></textarea>
        }
        <div class="flex items-center justify-between gap-3 pt-2">
          @if (hadNote) {
            <button
              type="button"
              class="btn-chip btn-chip-red min-h-11 rounded-md px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="loading || saving"
              (click)="clear()"
            >
              Delete
            </button>
          } @else {
            <span></span>
          }
          <button
            type="submit"
            class="btn-chip btn-chip-green min-h-11 rounded-md px-6 py-2.5 text-base disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="loading || saving"
          >
            Save
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
})
export class PrayerJournalModalComponent implements OnInit, OnDestroy {
  protected readonly TOUR_PRAYER_JOURNAL_MODAL_ID = TOUR_PRAYER_JOURNAL_MODAL_ID;

  private readonly journal = inject(PrayerJournalService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private loadGeneration = 0;
  private destroyed = false;

  @ViewChild('journalEditor') journalEditor?: RichTextEditorComponent;

  @Input({ required: true }) kind!: PrayerJournalKind;
  @Input({ required: true }) prayerId!: string;
  @Input() richTextEditorsEnabled = true;

  @Output() close = new EventEmitter<void>();

  draft = '';
  loading = true;
  saving = false;
  hadNote = false;

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.loadGeneration += 1;
  }

  async save(): Promise<void> {
    if (this.loading || this.saving) {
      return;
    }
    const raw = this.journalEditor ? this.journalEditor.flushMarkdownToForm() : this.draft;
    this.saving = true;
    this.cdr.markForCheck();
    const ok = await this.journal.save(this.kind, this.prayerId, raw);
    if (this.destroyed) {
      return;
    }
    this.saving = false;
    if (!ok) {
      this.toast.error('Could not save your journal note.');
      this.cdr.markForCheck();
      return;
    }
    this.close.emit();
  }

  async clear(): Promise<void> {
    if (this.loading || this.saving) {
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    const ok = await this.journal.clear(this.kind, this.prayerId);
    if (this.destroyed) {
      return;
    }
    this.saving = false;
    if (!ok) {
      this.toast.error('Could not delete your journal note.');
      this.cdr.markForCheck();
      return;
    }
    this.close.emit();
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    const note = await this.journal.getNote(this.kind, this.prayerId);
    if (this.destroyed || generation !== this.loadGeneration) {
      return;
    }
    this.draft = note;
    this.hadNote = note.length > 0;
    this.loading = false;
    this.cdr.markForCheck();
  }
}
