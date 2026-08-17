import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { EmailTemplateRow } from '../../lib/admin-email-templates';

@Component({
  selector: 'app-admin-email-templates-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-templates-editor.component.html',
})
export class AdminEmailTemplatesEditorComponent {
  @Input({ required: true }) editedTemplate!: EmailTemplateRow;
  @Input() showPreview = false;
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() success: string | null = null;

  @Output() togglePreview = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() revert = new EventEmitter<void>();

  constructor(private readonly sanitizer: DomSanitizer) {}

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
