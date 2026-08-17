import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { batchLookupPlanningCenter } from '../../../lib/planning-center';
import { environment } from '../../../environments/environment';
import type { EmailSubscriberCsvRow } from '../../lib/admin-email-subscribers';

export interface EmailSubscribersCsvUploadResult {
  successMessage: string;
  warnings: string[];
}

@Component({
  selector: 'app-admin-email-subscribers-csv-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscribers-csv-panel.component.html',
})
export class AdminEmailSubscribersCsvPanelComponent {
  @Output() uploaded = new EventEmitter<EmailSubscribersCsvUploadResult>();
  @Output() error = new EventEmitter<string>();

  csvData: EmailSubscriberCsvRow[] = [];
  uploadingCSV = false;
  csvImportProgress = 0;
  csvImportTotal = 0;

  readonly Math = Math;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  reset(): void {
    this.csvData = [];
    this.uploadingCSV = false;
    this.csvImportProgress = 0;
    this.csvImportTotal = 0;
    this.cdr.markForCheck();
  }

  handleCSVUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map((line) => line.trim()).filter((line) => line);

        const parsed: EmailSubscriberCsvRow[] = rows.map((row) => {
          const [name, email] = row.split(',').map((s) => s.trim());

          if (!name || !email) {
            return {
              name: name || '',
              email: email || '',
              valid: false,
              error: 'Missing name or email',
            };
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return { name, email, valid: false, error: 'Invalid email format' };
          }

          return { name, email, valid: true };
        });

        this.csvData = parsed;
        this.cdr.markForCheck();
      } catch (err: unknown) {
        console.error('Error parsing CSV:', err);
        this.error.emit('Failed to parse CSV file');
      }
    };

    reader.readAsText(file);
  }

  getValidRowsCount(): number {
    return this.csvData.filter((r) => r.valid).length;
  }

  getInvalidRowsCount(): number {
    return this.csvData.filter((r) => !r.valid).length;
  }

  async uploadCSVData(): Promise<void> {
    const validRows = this.csvData.filter((r) => r.valid);

    if (validRows.length === 0) {
      this.error.emit('No valid rows to upload');
      return;
    }

    try {
      this.uploadingCSV = true;
      this.csvImportProgress = 0;
      this.csvImportTotal = validRows.length;
      const warnings: string[] = [];
      this.cdr.markForCheck();

      const emails = validRows.map((r) => r.email.toLowerCase());
      const { data: existing } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .in('email', emails);

      const existingEmails = new Set((existing || []).map((e: { email: string }) => e.email));
      const newRows = validRows.filter((r) => !existingEmails.has(r.email.toLowerCase()));

      if (newRows.length === 0) {
        this.error.emit('All email addresses are already subscribed');
        this.uploadingCSV = false;
        this.cdr.markForCheck();
        return;
      }

      const newEmails = newRows.map((r) => r.email.toLowerCase());

      const batchResults = await batchLookupPlanningCenter(
        newEmails,
        environment.supabaseUrl,
        environment.supabaseAnonKey,
        {
          concurrency: 5,
          maxRetries: 3,
          retryDelayMs: 500,
          onProgress: (completed, total) => {
            this.csvImportProgress = completed;
            this.csvImportTotal = total;
            this.cdr.markForCheck();
          },
        },
      );

      const resultMap = new Map(batchResults.map((r) => [r.email, r]));
      let failedLookups = 0;

      const subscribersToInsert = newRows.map((r) => {
        const result = resultMap.get(r.email.toLowerCase());
        let inPlanningCenter: boolean | null = null;
        let planningCenterCheckedAt: string | null = null;

        if (result) {
          if (result.failed) {
            failedLookups++;
            const warning = `Planning Center check failed for ${r.email} (retried ${result.retries} times)`;
            warnings.push(warning);
            console.warn(`[CSV Import] ${warning}`);
          } else {
            inPlanningCenter = result.result.count > 0;
            planningCenterCheckedAt = new Date().toISOString();
          }
        }

        return {
          name: r.name,
          email: r.email.toLowerCase(),
          is_active: true,
          is_admin: false,
          receive_admin_emails: false,
          in_planning_center: inPlanningCenter,
          planning_center_checked_at: planningCenterCheckedAt,
        };
      });

      const { error: insertError } = await this.supabase.client
        .from('email_subscribers')
        .insert(subscribersToInsert);

      if (insertError) throw insertError;

      const skipped = validRows.length - newRows.length;
      let successMessage = `Successfully added ${newRows.length} subscriber(s)`;

      if (skipped > 0) {
        successMessage += `. Skipped ${skipped} duplicate(s)`;
      }

      if (failedLookups > 0) {
        successMessage += `. ⚠️ Planning Center checks failed for ${failedLookups} email(s) (see details below)`;
      } else {
        successMessage += '!';
      }

      this.reset();
      this.uploaded.emit({ successMessage, warnings });
    } catch (err: unknown) {
      console.error('Error uploading CSV:', err);
      const message = err instanceof Error ? err.message : 'An error occurred';
      this.error.emit(message);
    } finally {
      this.uploadingCSV = false;
      this.csvImportProgress = 0;
      this.csvImportTotal = 0;
      this.cdr.markForCheck();
    }
  }
}
