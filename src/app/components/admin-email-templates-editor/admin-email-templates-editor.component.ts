import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
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
  host: {
    '(mousedown)': '$event.stopPropagation()',
    '(mouseup)': '$event.stopPropagation()',
    '(click)': '$event.stopPropagation()',
    '(pointerdown)': '$event.stopPropagation()',
    '(pointerup)': '$event.stopPropagation()',
  },
})
export class AdminEmailTemplatesEditorComponent {
  @Input({ required: true }) editedTemplate!: EmailTemplateRow;
  @Input() showPreview = false;
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() success: string | null = null;

  @Output() editInteraction = new EventEmitter<void>();
  @Output() togglePreview = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() revert = new EventEmitter<void>();

  constructor(private readonly sanitizer: DomSanitizer) {}

  @HostListener('pointerdown', ['$event'])
  onHostPointerDown(event: PointerEvent): void {
    this.editInteraction.emit();
    event.stopPropagation();
  }

  @HostListener('mousedown', ['$event'])
  onHostMouseDown(event: MouseEvent): void {
    this.editInteraction.emit();
    event.stopPropagation();
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
