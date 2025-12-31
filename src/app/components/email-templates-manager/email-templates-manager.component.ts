import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface EmailTemplate {
  id: string;
  name: string;
  template_key: string;
  subject: string;
  html_body: string;
  text_body: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-email-templates-manager',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <svg class="text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Email Templates</h3>
        </div>
        <button
          (click)="loadTemplates()"
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh templates"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600 dark:text-gray-400">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      <!-- Error Message (when templates load but there's an issue) -->
      @if (error && templates.length > 0) {
      <div class="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-3">
        <p class="text-yellow-800 dark:text-yellow-200 text-sm">{{ error }}</p>
      </div>
      }

      <!-- Loading State -->
      @if (loading) {
      <div class="text-center py-8">
        <p class="text-gray-600 dark:text-gray-400">Loading templates...</p>
      </div>
      }

      <!-- Error State (no templates loaded) -->
      @if (!loading && error && templates.length === 0) {
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-4">
        <p class="text-red-800 dark:text-red-200"><strong>Error:</strong> {{ error }}</p>
        <p class="mt-2 text-sm text-red-700 dark:text-red-300">Please execute the database migration in Supabase SQL Editor to enable email templates.</p>
      </div>
      }

      <!-- Templates List -->
      @if (!loading && templates.length > 0) {
      <div>
        <label class="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Available Templates</label>
        <div class="space-y-3">
          @for (template of templates; track template.id) {
          <div>
            <!-- Template Card -->
            <button
              (click)="handleSelectTemplate(template)"
              [class]="'w-full text-left p-3 rounded-lg border transition-colors ' + 
                (selectedTemplate?.id === template.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')"
            >
              <div class="font-semibold text-gray-900 dark:text-gray-100">{{ template.name }}</div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ template.template_key }}</div>
            </button>

            <!-- Editor - appears under selected template -->
            @if (selectedTemplate?.id === template.id && editedTemplate) {
            <div class="mt-3 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <!-- Preview/Edit Toggle -->
              <div class="flex justify-between items-center">
                <label class="text-sm font-semibold text-gray-900 dark:text-gray-100">Edit Template</label>
                <button
                  (click)="showPreview = !showPreview"
                  class="flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  @if (showPreview) {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                  }
                  @if (!showPreview) {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  }
                  {{ showPreview ? 'Edit' : 'Preview' }}
                </button>
              </div>

              <!-- Preview Mode -->
              @if (showPreview) {
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Subject:</label>
                  <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                    {{ editedTemplate.subject }}
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">HTML Preview:</label>
                  <div 
                    class="p-4 bg-white rounded-lg border border-gray-200 dark:border-gray-600 overflow-auto max-h-64 text-sm text-gray-900 [&_*]:!text-inherit"
                    style="color-scheme: light"
                    [innerHTML]="getSafeHtml(editedTemplate.html_body)">
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Text Preview:</label>
                  <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg whitespace-pre-wrap font-mono text-xs text-gray-600 dark:text-gray-300 max-h-64 overflow-auto">
                    {{ editedTemplate.text_body }}
                  </div>
                </div>

                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <p class="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2"><strong>Available variables:</strong></p>
                  <p class="text-xs text-blue-800 dark:text-blue-300 break-words">
                    {{'{{name}}'}}, {{'{{email}}'}}, {{'{{code}}'}}, {{'{{prayerTitle}}'}}, {{'{{prayerDescription}}'}}, {{'{{updateContent}}'}}, {{'{{requesterName}}'}}, {{'{{authorName}}'}}, {{'{{prayerFor}}'}}, {{'{{status}}'}}, {{'{{actionDescription}}'}}, {{'{{denialReason}}'}}, {{'{{adminLink}}'}}, {{'{{appLink}}'}}
                  </p>
                </div>
              </div>
              }

              <!-- Edit Mode -->
              @if (!showPreview) {
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Human-readable title for this email template (for admin reference only)</p>
                  <input
                    type="text"
                    [(ngModel)]="editedTemplate.name"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Template Key <span class="text-gray-500">(read-only)</span>
                  </label>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Unique identifier used to reference this template in the system</p>
                  <div class="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {{ editedTemplate.template_key }}
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">The subject line users see in their email inbox. Include variables like name, code, or title for dynamic content</p>
                  <input
                    type="text"
                    [(ngModel)]="editedTemplate.subject"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder="Subject with {{'{{'}}variables{{'}}'}}"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">HTML Body</label>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">The formatted email content with styling, colors, and layout. What most users see when opening the email</p>
                  <textarea
                    [(ngModel)]="editedTemplate.html_body"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                    rows="8"
                    placeholder="HTML content with {{'{{'}}variables{{'}}'}}"
                  ></textarea>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Text Body</label>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Plain text version without formatting. Used for basic email clients and accessibility. Should match the HTML version</p>
                  <textarea
                    [(ngModel)]="editedTemplate.text_body"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                    rows="6"
                    placeholder="Plain text content with {{'{{'}}variables{{'}}'}}"
                  ></textarea>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Internal note explaining when and why this email is sent. For admin reference only</p>
                  <input
                    type="text"
                    [(ngModel)]="editedTemplate.description"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder="Template description"
                  />
                </div>

                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <p class="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2"><strong>Available variables:</strong></p>
                  <ul class="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• {{'{{name}}'}} - User or admin name</li>
                    <li>• {{'{{email}}'}} - Email address</li>
                    <li>• {{'{{code}}'}} - Verification code</li>
                    <li>• {{'{{prayerTitle}}'}} - Prayer title (used in all prayer-related emails)</li>
                    <li>• {{'{{prayerDescription}}'}} - Original prayer description/content</li>
                    <li>• {{'{{updateContent}}'}} - New update or change content</li>
                    <li>• {{'{{requesterName}}'}} - Name of prayer requester</li>
                    <li>• {{'{{authorName}}'}} - Name of update author</li>
                    <li>• {{'{{prayerFor}}'}} - Who/what prayer is for</li>
                    <li>• {{'{{status}}'}} - Prayer status (current/answered)</li>
                    <li>• {{'{{actionDescription}}'}} - Description of action taken</li>
                    <li>• {{'{{denialReason}}'}} - Reason for denial/rejection</li>
                    <li>• {{'{{adminLink}}'}} - Link to admin portal</li>
                    <li>• {{'{{appLink}}'}} - Link to main app</li>
                  </ul>
                </div>
              </div>
              }

              <!-- Error & Success Messages -->
              @if (error && selectedTemplate?.id === template.id) {
              <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-200 text-sm">
                {{ error }}
              </div>
              }
              @if (success && selectedTemplate?.id === template.id) {
              <div class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-green-700 dark:text-green-200 text-sm">
                {{ success }}
              </div>
              }

              <!-- Actions -->
              <div class="flex gap-2">
                <button
                  (click)="handleSave()"
                  [disabled]="saving"
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
                <button
                  (click)="handleRevert()"
                  class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Revert
                </button>
              </div>
            </div>
            }
          </div>
          }
        </div>
      </div>
      }

      <!-- Empty State -->
      @if (!loading && templates.length === 0 && !error) {
      <div class="text-center py-8">
        <p class="text-gray-600 dark:text-gray-400 text-sm">No templates available</p>
      </div>
      }
    </div>
  `,
  styles: []
})
export class EmailTemplatesManagerComponent implements OnInit {
  templates: EmailTemplate[] = [];
  selectedTemplate: EmailTemplate | null = null;
  editedTemplate: EmailTemplate | null = null;
  loading = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;
  showPreview = false;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadTemplates();
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  async loadTemplates() {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    try {
      const { data, error } = await this.supabase.client
        .from('email_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      this.templates = data || [];
      if (this.templates.length === 0) {
        this.error = 'No templates found. Please run the database migration.';
      }
      // Don't auto-select a template - let user choose one
      this.selectedTemplate = null;
      this.editedTemplate = null;
      this.cdr.markForCheck();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : String(err);
      console.error('Failed to load templates:', err);
      this.error = `Failed to load templates: ${errorMsg}`;
      this.cdr.markForCheck();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  handleSelectTemplate(template: EmailTemplate) {
    // If clicking the same template, toggle the editor off
    if (this.selectedTemplate?.id === template.id) {
      this.selectedTemplate = null;
      this.editedTemplate = null;
      this.showPreview = false;
    } else {
      // Open editor for the clicked template
      this.selectedTemplate = template;
      this.editedTemplate = { ...template };
      this.showPreview = false;
    }
    this.success = null;
    this.error = null;
  }

  async handleSave() {
    if (!this.editedTemplate) return;

    this.saving = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    try {
      const { data, error } = await this.supabase.client
        .from('email_templates')
        .update({
          name: this.editedTemplate.name,
          subject: this.editedTemplate.subject,
          html_body: this.editedTemplate.html_body,
          text_body: this.editedTemplate.text_body,
          description: this.editedTemplate.description
        })
        .eq('id', this.editedTemplate.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        this.selectedTemplate = data;
        this.editedTemplate = { ...data };
        this.templates = this.templates.map(t => t.id === data.id ? data : t);
        this.success = 'Template saved successfully!';
        this.toast.success('Template saved!');
        this.cdr.markForCheck();
      }
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = 'Failed to save template';
      this.toast.error('Failed to save template');
      console.error(err);
      this.cdr.markForCheck();
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  handleRevert() {
    if (this.selectedTemplate) {
      this.editedTemplate = { ...this.selectedTemplate };
      this.success = null;
      this.error = null;
    }
  }
}
