import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

export interface HourlyReminderTemplateOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-hourly-reminder-template-section',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors dark:hover:bg-gray-700/40"
        [class.cursor-pointer]="!expanded"
        (click)="!expanded && toggleExpanded()"
      >
        <button
          type="button"
          [id]="triggerId"
          class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
          (click)="toggleExpanded(); $event.stopPropagation()"
          [attr.aria-expanded]="expanded"
          [attr.aria-controls]="panelId"
        >
          <span
            class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0"
          >
            <ng-content select="[sectionIcon]" />
            {{ sectionTitle }}
          </span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
            [class.rotate-180]="expanded"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        @if (expanded) {
          <div
            [id]="panelId"
            role="region"
            [attr.aria-labelledby]="triggerId"
            class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4" [innerHTML]="descriptionHtml"></p>

            @if (loading) {
              <div class="text-center py-6">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"
                ></div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ loadingMessage }}</p>
              </div>
            }

            @if (!loading) {
              <div
                class="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <span
                  [id]="templateLabelId"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >Email template</span
                >
                <div class="relative max-w-lg">
                  <div
                    [ngClass]="{
                      'border-blue-500 ring-2 ring-blue-500 bg-white dark:bg-gray-800': showDropdown,
                      'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600':
                        !showDropdown
                    }"
                    class="flex w-full rounded-lg border-2 transition-all overflow-hidden"
                  >
                    <button
                      type="button"
                      [id]="templateSelectId"
                      (click)="showDropdown = !showDropdown"
                      [disabled]="saving"
                      [attr.aria-expanded]="showDropdown"
                      aria-haspopup="listbox"
                      [attr.aria-labelledby]="templateLabelId"
                      [attr.aria-describedby]="helpTextId"
                      class="w-full flex items-center justify-between gap-2 p-2 sm:p-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <span class="text-sm font-medium text-gray-800 dark:text-gray-100">{{
                        selectedLabel()
                      }}</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="text-gray-600 dark:text-gray-400 transition-transform shrink-0"
                        [class.rotate-180]="showDropdown"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                  @if (showDropdown) {
                    <div>
                      <div class="fixed inset-0 z-10" (click)="showDropdown = false"></div>
                      <div
                        role="listbox"
                        [attr.aria-labelledby]="templateLabelId"
                        class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 max-h-60 overflow-y-auto"
                      >
                        @for (opt of templateOptions; track opt.value) {
                          <button
                            type="button"
                            role="option"
                            [attr.aria-selected]="selectedKey === opt.value"
                            (click)="setTemplateKey(opt.value)"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span>{{ opt.label }}</span>
                            @if (selectedKey === opt.value) {
                              <span class="text-blue-600 dark:text-blue-400">✓</span>
                            }
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
                <p [id]="helpTextId" class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {{ helpText }}
                </p>
              </div>
            }

            @if (success) {
              <div
                class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 mb-4"
                role="status"
                aria-live="polite"
              >
                <p class="text-sm text-green-800 dark:text-green-200">{{ successMessage }}</p>
              </div>
            }

            @if (loadError) {
              <div
                class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 mb-4"
                role="alert"
              >
                <p class="text-sm text-red-800 dark:text-red-200">{{ loadError }}</p>
              </div>
            }

            <div class="flex justify-end">
              <button
                type="button"
                (click)="save()"
                [disabled]="saving || loading"
                class="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Save reminder template"
              >
                @if (saving) {
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                }
                @if (!saving) {
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                    ></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                }
                {{ saving ? 'Saving…' : 'Save reminder template' }}
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class HourlyReminderTemplateSectionComponent implements OnInit {
  @Input({ required: true }) sectionTitle!: string;
  @Input({ required: true }) descriptionHtml!: string;
  @Input({ required: true }) settingsColumn!: string;
  @Input({ required: true }) templateOptions!: readonly HourlyReminderTemplateOption[];
  @Input({ required: true }) allowedKeys!: readonly string[];
  @Input({ required: true }) defaultKey!: string;
  @Input({ required: true }) helpText!: string;
  @Input({ required: true }) loadingMessage!: string;
  @Input({ required: true }) successMessage!: string;
  @Input({ required: true }) saveToastMessage!: string;
  @Input({ required: true }) saveErrorToastMessage!: string;
  @Input({ required: true }) loadErrorPrefix!: string;
  @Input({ required: true }) saveErrorPrefix!: string;
  @Input() triggerId = 'hourly-reminder-template-trigger';
  @Input() panelId = 'hourly-reminder-template-panel';
  @Input() templateLabelId = 'hourly-reminder-template-label';
  @Input() templateSelectId = 'hourly-reminder-template-select';
  @Input() helpTextId = 'hourlyReminderTemplateHelp';
  @Input() startExpanded = false;

  @Output() saved = new EventEmitter<void>();
  @Output() loadFailed = new EventEmitter<string>();

  expanded = false;
  showDropdown = false;
  selectedKey = '';
  loading = false;
  saving = false;
  success = false;
  loadError: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.expanded = this.startExpanded;
    this.selectedKey = this.defaultKey;
    void this.load();
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
    this.cdr.markForCheck();
  }

  selectedLabel(): string {
    return (
      this.templateOptions.find((o) => o.value === this.selectedKey)?.label ??
      this.templateOptions[0]?.label ??
      'Simple nudge (default)'
    );
  }

  setTemplateKey(value: string): void {
    this.selectedKey = value;
    this.showDropdown = false;
    this.cdr.markForCheck();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.success = false;
    this.loadError = null;
    this.cdr.markForCheck();
    try {
      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select(this.settingsColumn)
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      const key = (data as Record<string, string | undefined> | null)?.[this.settingsColumn];
      if (key && this.allowedKeys.includes(key)) {
        this.selectedKey = key;
      }
    } catch (err: unknown) {
      console.error(`Error loading ${this.settingsColumn}:`, err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Unknown error';
      this.loadError = `${this.loadErrorPrefix}: ${message}`;
      this.loadFailed.emit(this.loadError);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async save(): Promise<void> {
    this.saving = true;
    this.success = false;
    this.loadError = null;
    this.cdr.markForCheck();
    try {
      const { error } = await this.supabase.client
        .from('admin_settings')
        .update({ [this.settingsColumn]: this.selectedKey })
        .eq('id', 1);

      if (error) throw error;

      this.success = true;
      this.toast.success(this.saveToastMessage);
      this.saved.emit();
      this.cdr.markForCheck();
      setTimeout(() => {
        this.success = false;
        this.cdr.markForCheck();
      }, 3000);
    } catch (err: unknown) {
      console.error(`Error saving ${this.settingsColumn}:`, err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Unknown error';
      this.loadError = `${this.saveErrorPrefix}: ${message}`;
      this.toast.error(this.saveErrorToastMessage);
      this.cdr.markForCheck();
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
