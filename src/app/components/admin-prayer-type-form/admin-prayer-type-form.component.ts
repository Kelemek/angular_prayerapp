import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PromptService } from '../../services/prompt.service';
import type { PrayerTypeRecord } from '../../types/prayer';

export interface PrayerTypeFormSavedEvent {
  successMessage: string;
}

@Component({
  selector: 'app-admin-prayer-type-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-type-form.component.html',
})
export class AdminPrayerTypeFormComponent implements OnChanges {
  @Input() editingType: PrayerTypeRecord | null = null;
  @Output() saved = new EventEmitter<PrayerTypeFormSavedEvent>();
  @Output() cancel = new EventEmitter<void>();
  @Output() reportError = new EventEmitter<string>();

  name = '';
  displayOrder = 0;
  isActive = true;
  includeInBooklet = false;
  submitting = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toast: ToastService,
    private readonly promptService: PromptService,
    private readonly cdr: ChangeDetectorRef,
    private readonly appRef: ApplicationRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingType']) {
      this.applyEditingType(this.editingType);
    }
  }

  resetForAdd(): void {
    this.name = '';
    this.displayOrder = 0;
    this.isActive = true;
    this.includeInBooklet = false;
    this.submitting = false;
    this.cdr.markForCheck();
  }

  private applyEditingType(type: PrayerTypeRecord | null): void {
    if (type) {
      this.name = type.name;
      this.displayOrder = type.display_order;
      this.isActive = type.is_active;
      this.includeInBooklet = type.include_in_booklet ?? false;
    } else {
      this.resetForAdd();
    }
  }

  onTypeNameEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.key !== 'Enter') return;
    ke.preventDefault();
    void this.saveType();
  }

  async saveType(event?: Event): Promise<void> {
    event?.preventDefault();

    if (!this.name.trim()) {
      this.reportError.emit('Please enter a type name');
      this.toast.warning('Please enter a type name.');
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

      const payload = {
        name: this.name.trim(),
        display_order: this.displayOrder,
        is_active: this.isActive,
        include_in_booklet: this.includeInBooklet,
      };

      if (this.editingType) {
        const { error } = await this.supabase.client
          .from('prayer_types')
          .update(payload)
          .eq('id', this.editingType.id);

        if (error) throw error;
        this.saved.emit({ successMessage: 'Prayer type updated successfully!' });
        this.toast.success('Prayer type updated.');
      } else {
        const { error } = await this.supabase.client.from('prayer_types').insert(payload);

        if (error) throw error;
        this.saved.emit({ successMessage: 'Prayer type added successfully!' });
        this.toast.success('Prayer type added.');
      }

      this.resetForAdd();
      await this.promptService.loadPrompts();
    } catch (err: unknown) {
      console.error('Error saving prayer type:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.reportError.emit(`Failed to save prayer type: ${message}`);
      this.toast.error(`Could not save prayer type: ${message}`);
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
    }
  }
}
