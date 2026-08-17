import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { EmailTemplateRow } from '../../lib/admin-email-templates';
import { AdminEmailTemplatesListComponent } from '../admin-email-templates-list/admin-email-templates-list.component';

@Component({
  selector: 'app-admin-email-templates-panel',
  standalone: true,
  imports: [CommonModule, AdminEmailTemplatesListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-templates-panel.component.html',
})
export class AdminEmailTemplatesPanelComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() templates: EmailTemplateRow[] = [];
  @Input() selectedTemplate: EmailTemplateRow | null = null;
  @Input() editedTemplate: EmailTemplateRow | null = null;
  @Input() showPreview = false;
  @Input() saving = false;
  @Input() success: string | null = null;

  @Output() selectTemplate = new EventEmitter<EmailTemplateRow>();
  @Output() togglePreview = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() revert = new EventEmitter<void>();
}
