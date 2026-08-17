import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import type { PrayerTypeRecord } from '../../types/prayer';

export interface PromptManagerCreateSavedEvent {
  successMessage: string;
}

@Component({
  selector: 'app-admin-prompt-manager-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prompt-manager-create-form.component.html',
})
export class AdminPromptManagerCreateFormComponent {
  @Input({ required: true }) prayerTypes!: PrayerTypeRecord[];
  @Output() saved = new EventEmitter<PromptManagerCreateSavedEvent>();
  @Output() cancel = new EventEmitter<void>();
  @Output() reportError = new EventEmitter<string>();

  title = '';
  type = '';
  description = '';
  submitting = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly appRef: ApplicationRef,
  ) {}

  resetForm(): void {
    this.title = '';
    this.description = '';
    this.type = this.prayerTypes.length > 0 ? this.prayerTypes[0].name : '';
    this.submitting = false;
    this.cdr.markForCheck();
  }

  onPromptTitleEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.key !== 'Enter') return;
    ke.preventDefault();
    void this.savePrompt();
  }

  async savePrompt(event?: Event): Promise<void> {
    event?.preventDefault();

    if (!this.title.trim() || !this.type || !this.description.trim()) {
      this.reportError.emit('All fields are required');
      this.toast.warning('All fields are required.');
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
      return;
    }

    try {
      this.submitting = true;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
      await Promise.resolve();

      const { error } = await this.supabase.client.from('prayer_prompts').insert({
        title: this.title.trim(),
        type: this.type,
        description: this.description.trim(),
      });

      if (error) throw error;

      this.saved.emit({ successMessage: 'Prayer prompt added successfully!' });
      this.toast.success('Prompt added.');
      this.resetForm();
    } catch (err: unknown) {
      console.error('Error saving prompt:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.reportError.emit(`Failed to save prayer prompt: ${message}`);
      this.toast.error(`Could not save prompt: ${message}`);
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
    }
  }
}
