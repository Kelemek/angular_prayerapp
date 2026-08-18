import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminPromptManagerCsvPanelComponent } from '../admin-prompt-manager-csv-panel/admin-prompt-manager-csv-panel.component';
import {
  AdminPromptManagerCreateFormComponent,
  type PromptManagerCreateSavedEvent,
} from '../admin-prompt-manager-create-form/admin-prompt-manager-create-form.component';
import {
  AdminPromptManagerEditInlineComponent,
  type PromptManagerEditSavedEvent,
} from '../admin-prompt-manager-edit-inline/admin-prompt-manager-edit-inline.component';
import { AdminPromptManagerCardComponent } from '../admin-prompt-manager-card/admin-prompt-manager-card.component';
import type { PrayerPrompt, PrayerTypeRecord } from '../../types/prayer';

@Component({
  selector: 'app-admin-prompt-manager-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminPromptManagerCsvPanelComponent,
    AdminPromptManagerCreateFormComponent,
    AdminPromptManagerEditInlineComponent,
    AdminPromptManagerCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prompt-manager-panel.component.html',
})
export class AdminPromptManagerPanelComponent {
  @Input() showCSVUpload = false;
  @Input() showAddForm = false;
  @Input() error: string | null = null;
  @Input() success: string | null = null;
  @Input() searchQuery = '';
  @Input() searching = false;
  @Input() hasSearched = false;
  @Input() promptSearchMinChars = 0;
  @Input() promptSearchDebounceMs = 0;
  @Input() prompts: PrayerPrompt[] = [];
  @Input() prayerTypes: PrayerTypeRecord[] = [];
  @Input() editingId: string | null = null;

  @Output() toggleCsv = new EventEmitter<void>();
  @Output() toggleAdd = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchKeydown = new EventEmitter<KeyboardEvent>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() closeCsv = new EventEmitter<void>();
  @Output() csvUploaded = new EventEmitter<{ successMessage: string }>();
  @Output() csvError = new EventEmitter<string>();
  @Output() promptCreated = new EventEmitter<PromptManagerCreateSavedEvent>();
  @Output() closeAddForm = new EventEmitter<void>();
  @Output() addFormError = new EventEmitter<string>();
  @Output() promptEdited = new EventEmitter<PromptManagerEditSavedEvent>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() editPrompt = new EventEmitter<PrayerPrompt>();
  @Output() deletePrompt = new EventEmitter<{ id: string; title: string }>();

  @ViewChild('createFormRef')
  createFormRef?: AdminPromptManagerCreateFormComponent;

  @ViewChild('csvPanelRef')
  csvPanelRef?: AdminPromptManagerCsvPanelComponent;

  resetCreateForm(): void {
    this.createFormRef?.resetForm();
  }

  resetCsvPanel(): void {
    this.csvPanelRef?.reset();
  }

  setCreateFormDefaultType(typeName: string): void {
    if (this.createFormRef) {
      this.createFormRef.type = typeName;
    }
  }
}
