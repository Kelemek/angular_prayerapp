import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { EmailTemplateRow } from '../../lib/admin-email-templates';
import { AdminEmailTemplatesEditorComponent } from '../admin-email-templates-editor/admin-email-templates-editor.component';

@Component({
  selector: 'app-admin-email-templates-list',
  standalone: true,
  imports: [CommonModule, AdminEmailTemplatesEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-templates-list.component.html',
})
export class AdminEmailTemplatesListComponent {
  @Input() templates: EmailTemplateRow[] = [];
  @Input() selectedId: string | null = null;
  @Input() editedTemplate: EmailTemplateRow | null = null;
  @Input() showPreview = false;
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() success: string | null = null;

  @Output() select = new EventEmitter<EmailTemplateRow>();
  @Output() togglePreview = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() revert = new EventEmitter<void>();
}
