import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSectionLoadingComponent } from '../admin-section-loading/admin-section-loading.component';
import { SupabaseService } from '../../services/supabase.service';
import { MemorizationReciteSettingsService } from '../../services/memorization-recite-settings.service';
import type {
  MemorizationReciteOpenAiUsage,
} from '../../types/memorization';

@Component({
  selector: 'app-memorization-recite-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSectionLoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
      [class.cursor-pointer]="!sectionExpanded"
      (click)="!sectionExpanded && onSectionToggle()"
    >
      <button
        type="button"
        id="memorization-recite-settings-trigger"
        class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="onSectionToggle(); $event.stopPropagation()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="memorization-recite-panel"
      >
        <span
          class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-blue-600 dark:text-blue-400 shrink-0"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          Memorization Recite Mode
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
          [class.rotate-180]="sectionExpanded"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      @if (sectionExpanded) {
        <div
          id="memorization-recite-panel"
          role="region"
          aria-labelledby="memorization-recite-settings-trigger"
          class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          (click)="$event.stopPropagation()"
        >
          @if (isLoading) {
            <app-admin-section-loading message="Loading Recite mode settings…" />
          } @else {
            <p class="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Let users record a verse from memory and get word-by-word accuracy feedback
              using OpenAI Whisper transcription.
            </p>

            <form (ngSubmit)="submitSettings()" class="space-y-6">
              <label
                class="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg cursor-pointer"
              >
                <input
                  type="checkbox"
                  [(ngModel)]="reciteEnabled"
                  name="reciteEnabled"
                  [disabled]="isSaving"
                  class="mt-1 h-4 w-4 text-blue-600 border-gray-300 bg-white dark:bg-gray-800 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0 disabled:opacity-50"
                />
                <div class="flex-1">
                  <span class="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    Enable Recite mode
                  </span>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Shows Recite in memorization practice for passages up to 5 verses and Bible Books items.
                    Requires
                    <code class="text-xs">OPENAI_API_KEY</code> on the server.
                  </p>
                </div>
              </label>

              <div class="flex gap-3 pt-2 justify-end">
                <button
                  type="submit"
                  [disabled]="isSaving"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                >
                  {{ isSaving ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </form>

            @if (reciteEnabled) {
            <div class="mt-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  OpenAI API key spend (whisper-1)
                </h3>
                <div class="flex items-center gap-3 shrink-0">
                  @if (openAiUsage?.configured && !openAiUsage?.error && !openAiUsageLoading) {
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                      {{ formatCost(openAiUsage.totalUsd ?? 0) }}
                      <span class="text-gray-500 dark:text-gray-400">· last {{ openAiUsage.periodDays }} days</span>
                    </span>
                  }
                </div>
              </div>

              @if (openAiUsageLoading) {
                <div
                  class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent"
                    aria-hidden="true"
                  ></span>
                  Loading whisper-1 spend…
                </div>
              } @else if (openAiUsage?.error) {
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Could not load OpenAI API key spend. Requires an
                  <a
                    href="https://platform.openai.com/settings/organization/admin-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >Admin API key</a>
                  in Supabase as <code class="text-xs">OPENAI_ADMIN_KEY</code> and the Whisper key id as
                  <code class="text-xs">OPENAI_API_KEY_ID</code>.
                </p>
              } @else if (openAiUsage?.adminKeyRequired) {
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  OpenAI API key spend (last 30 days) needs a separate
                  <a
                    href="https://platform.openai.com/settings/organization/admin-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >Admin API key</a>
                  — set <code class="text-xs">OPENAI_ADMIN_KEY</code> on Supabase (Whisper still uses
                  <code class="text-xs">OPENAI_API_KEY</code>).
                </p>
              } @else if (openAiUsage?.apiKeyIdRequired) {
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Set <code class="text-xs">OPENAI_API_KEY_ID</code> on Supabase to match the Whisper
                  <code class="text-xs">OPENAI_API_KEY</code> (copy the tracking id from
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >OpenAI API keys</a>
                  — not the secret). Also requires <code class="text-xs">OPENAI_ADMIN_KEY</code>.
                </p>
              } @else if (openAiUsage && !openAiUsage.configured) {
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Set <code class="text-xs">OPENAI_ADMIN_KEY</code> and <code class="text-xs">OPENAI_API_KEY_ID</code>
                  on the server for API-key spend, or <code class="text-xs">OPENAI_API_KEY</code> for transcription only.
                </p>
              }

              <a
                href="https://platform.openai.com/usage"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open OpenAI usage dashboard →
              </a>
            </div>
            }

            @if (successMessage) {
              <p class="text-sm text-green-700 dark:text-green-300 mt-3">{{ successMessage }}</p>
            }
            @if (errorMessage) {
              <p class="text-sm text-red-700 dark:text-red-300 mt-3">{{ errorMessage }}</p>
            }
          }
        </div>
      }
    </div>
  `,
})
export class MemorizationReciteSettingsComponent {
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  reciteEnabled = false;
  isSaving = false;
  isLoading = false;
  openAiUsageLoading = false;
  successMessage = '';
  errorMessage = '';
  openAiUsage: MemorizationReciteOpenAiUsage | null = null;

  constructor(
    private supabase: SupabaseService,
    private reciteSettingsService: MemorizationReciteSettingsService,
    private cdr: ChangeDetectorRef
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.loadSettings();
    }
    this.cdr.markForCheck();
  }

  async loadSettings(): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();
    try {
      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('memorization_recite_enabled')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      this.reciteEnabled = !!data?.memorization_recite_enabled;
    } catch (err) {
      console.error('[MemorizationReciteSettings] Error loading:', err);
      this.errorMessage = 'Failed to load settings.';
      this.sectionExpanded = true;
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }

    if (this.reciteEnabled) {
      void this.refreshOpenAiUsage();
    }
  }

  async submitSettings(): Promise<void> {
    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const { error } = await this.supabase.client
        .from('admin_settings')
        .update({ memorization_recite_enabled: this.reciteEnabled })
        .eq('id', 1);

      if (error) throw error;

      this.reciteSettingsService.invalidateCache();
      this.successMessage = 'Recite mode settings saved.';
      if (this.reciteEnabled) {
        void this.refreshOpenAiUsage();
      }
      setTimeout(() => {
        this.successMessage = '';
        this.cdr.markForCheck();
      }, 5000);
    } catch (err) {
      console.error('[MemorizationReciteSettings] Error saving:', err);
      this.errorMessage = 'Failed to save settings. Please try again.';
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async refreshOpenAiUsage(): Promise<void> {
    if (!this.reciteEnabled) {
      return;
    }
    this.openAiUsageLoading = true;
    this.cdr.markForCheck();

    try {
      this.openAiUsage = await this.reciteSettingsService.fetchOpenAiOrgUsage();
    } catch (err) {
      console.error('[MemorizationReciteSettings] OpenAI usage load failed:', err);
      this.openAiUsage = { configured: false, error: 'Could not load OpenAI usage' };
    } finally {
      this.openAiUsageLoading = false;
      this.cdr.markForCheck();
    }
  }

  formatCost(usd: number): string {
    if (usd < 0.01) return '$0.00';
    return `$${usd.toFixed(2)}`;
  }
}
