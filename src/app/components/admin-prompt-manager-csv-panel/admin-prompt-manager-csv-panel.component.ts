import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import type { PrayerTypeRecord } from '../../types/prayer';
import {
  countInvalidPromptCsvRows,
  countValidPromptCsvRows,
  formatPromptTypeNames,
  parsePromptCsvText,
  type PromptCsvRow,
} from '../../lib/admin-prompt-manager';

@Component({
  selector: 'app-admin-prompt-manager-csv-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prompt-manager-csv-panel.component.html',
})
export class AdminPromptManagerCsvPanelComponent {
  @Input({ required: true }) prayerTypes!: PrayerTypeRecord[];
  @Output() closePanel = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<{ successMessage: string }>();
  @Output() reportError = new EventEmitter<string>();

  csvData: PromptCsvRow[] = [];
  uploadingCSV = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  reset(): void {
    this.csvData = [];
    this.uploadingCSV = false;
    this.cdr.markForCheck();
  }

  getValidTypeNames(): string {
    return formatPromptTypeNames(this.prayerTypes);
  }

  getValidRowCount(): number {
    return countValidPromptCsvRows(this.csvData);
  }

  getInvalidRowCount(): number {
    return countInvalidPromptCsvRows(this.csvData);
  }

  handleCSVUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const validTypes = this.prayerTypes.map((t) => t.name);
        const { rows, error } = parsePromptCsvText(text, validTypes);

        if (error) {
          this.reportError.emit(error);
          return;
        }

        this.csvData = rows;
        this.cdr.markForCheck();
      } catch (err) {
        console.error('Error parsing CSV:', err);
        this.reportError.emit('Failed to parse CSV file');
      }
    };

    reader.readAsText(file);
  }

  clearCsvData(): void {
    this.csvData = [];
    this.cdr.markForCheck();
  }

  async uploadCSVData(): Promise<void> {
    const validRows = this.csvData.filter((r) => r.valid);
    if (validRows.length === 0) return;

    try {
      this.uploadingCSV = true;
      this.cdr.markForCheck();

      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .insert(
          validRows.map((r) => ({
            title: r.title.trim(),
            type: r.type,
            description: r.description.trim(),
          })),
        );

      if (error) throw error;

      this.uploaded.emit({
        successMessage: `Successfully uploaded ${validRows.length} prompt(s)!`,
      });
      this.reset();
    } catch (err: unknown) {
      console.error('Error uploading CSV:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.reportError.emit(`Failed to upload CSV: ${message}`);
    } finally {
      this.uploadingCSV = false;
      this.cdr.markForCheck();
    }
  }
}
