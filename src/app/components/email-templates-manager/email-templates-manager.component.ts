import {
  Component,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { AdminEmailTemplatesSectionComponent } from '../admin-email-templates-section/admin-email-templates-section.component';
import { AdminEmailTemplatesPanelComponent } from '../admin-email-templates-panel/admin-email-templates-panel.component';
import type { EmailTemplateRow } from '../../lib/admin-email-templates';
import {
  emailTemplateErrorMessage,
  patchEmailTemplateInList,
} from '../../lib/admin-email-templates';
import { fetchEmailTemplates } from '../../lib/admin-email-templates-fetch';
import { saveEmailTemplate } from '../../lib/admin-email-templates-save';

@Component({
  selector: 'app-email-templates-manager',
  standalone: true,
  imports: [
    CommonModule,
    AdminEmailTemplatesSectionComponent,
    AdminEmailTemplatesPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-templates-manager.component.html',
  styles: [`:host { display: block; }`],
})
export class EmailTemplatesManagerComponent {
  sectionExpanded = false;
  private sectionInitialLoadDone = false;

  templates: EmailTemplateRow[] = [];
  selectedTemplate: EmailTemplateRow | null = null;
  editedTemplate: EmailTemplateRow | null = null;
  loading = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;
  showPreview = false;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.loadTemplates();
    }
    this.cdr.markForCheck();
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  async loadTemplates(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    try {
      this.templates = await fetchEmailTemplates(this.supabase.client);

      if (this.templates.length === 0) {
        this.error = 'No templates found. Please run the database migration.';
        this.sectionExpanded = true;
      }
      this.selectedTemplate = null;
      this.editedTemplate = null;
      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error('Failed to load templates:', err);
      this.error = `Failed to load templates: ${emailTemplateErrorMessage(err)}`;
      this.sectionExpanded = true;
      this.cdr.markForCheck();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  handleSelectTemplate(template: EmailTemplateRow): void {
    if (this.selectedTemplate?.id === template.id) {
      this.selectedTemplate = null;
      this.editedTemplate = null;
      this.showPreview = false;
    } else {
      this.selectedTemplate = template;
      this.editedTemplate = { ...template };
      this.showPreview = false;
    }
    this.success = null;
    this.error = null;
    this.cdr.markForCheck();
  }

  onTogglePreview(): void {
    this.showPreview = !this.showPreview;
    this.cdr.markForCheck();
  }

  async handleSave(): Promise<void> {
    if (!this.editedTemplate) return;

    this.saving = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    try {
      const data = await saveEmailTemplate(
        this.supabase.client,
        this.editedTemplate,
      );

      this.selectedTemplate = data;
      this.editedTemplate = { ...data };
      this.templates = patchEmailTemplateInList(this.templates, data);
      this.success = 'Template saved successfully!';
      this.toast.success('Template saved!');
      this.cdr.markForCheck();
    } catch (err: unknown) {
      this.error = 'Failed to save template';
      this.sectionExpanded = true;
      this.toast.error('Failed to save template');
      console.error(err);
      this.cdr.markForCheck();
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  handleRevert(): void {
    if (this.selectedTemplate) {
      this.editedTemplate = { ...this.selectedTemplate };
      this.success = null;
      this.error = null;
      this.cdr.markForCheck();
    }
  }
}
