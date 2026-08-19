import {
  Component,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AdminSectionLoadingComponent } from "../admin-section-loading/admin-section-loading.component";
import { SupabaseService } from "../../services/supabase.service";
import { RichTextEditorsSettingsService } from "../../services/rich-text-editors-settings.service";

@Component({
  selector: "app-rich-text-editors-settings",
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSectionLoadingComponent],
  template: `
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors dark:hover:bg-gray-700/40"
      [class.cursor-pointer]="!sectionExpanded"
      (click)="!sectionExpanded && onSectionToggle()"
    >
      <button
        type="button"
        id="rich-text-editors-settings-trigger"
        class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="onSectionToggle(); $event.stopPropagation()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="rich-text-editors-panel"
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
            <path d="M4 7h16M4 12h16M4 17h10"></path>
          </svg>
          Rich text editors (user forms)
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
        id="rich-text-editors-panel"
        role="region"
        aria-labelledby="rich-text-editors-settings-trigger"
        class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
        (click)="$event.stopPropagation()"
      >
        @if (isLoading) {
        <app-admin-section-loading
          message="Loading rich text editor settings…"
        />
        } @else {
        <p class="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Control whether members see the formatted editor (bold, lists, quotes)
          on the main app when submitting or editing prayers and updates. When
          off, they get a plain text box; existing markdown still displays
          correctly when viewing.
        </p>

        <form (ngSubmit)="submitSettings()" class="space-y-6">
          <div
            class="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg"
          >
            <input
              type="checkbox"
              id="enableRichTextEditors"
              [(ngModel)]="richTextEditorsEnabled"
              name="enableRichTextEditors"
              [disabled]="isSaving"
              class="mt-1 h-4 w-4 text-blue-600 border-gray-300 bg-white dark:bg-gray-800 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0 disabled:opacity-50"
            />
            <div class="flex-1">
              <label
                for="enableRichTextEditors"
                class="font-medium text-gray-900 dark:text-gray-100 text-sm"
              >
                Enable rich text editors for user-facing forms
              </label>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Applies to new prayer requests, prayer updates, and personal
                prayer/edit flows on the main site. Admin tools (e.g. Prayer
                Editor in Settings) always use the full editor.
              </p>
            </div>
          </div>

          <div
            class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 justify-end"
          >
            <button
              type="submit"
              [disabled]="isSaving"
              class="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              @if (isSaving) {
              <svg
                class="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Saving...</span>
              } @else {
              <span>Save Settings</span>
              }
            </button>
          </div>
        </form>

        @if (successMessage) {
        <div
          class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mt-4"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <p class="text-sm text-green-800 dark:text-green-200">
            {{ successMessage }}
          </p>
        </div>
        } @if (errorMessage) {
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mt-4"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <p class="text-sm text-red-800 dark:text-red-200">
            {{ errorMessage }}
          </p>
        </div>
        } }
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class RichTextEditorsSettingsComponent {
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  richTextEditorsEnabled = true;
  isSaving = false;
  isLoading = false;
  successMessage = "";
  errorMessage = "";

  constructor(
    private supabase: SupabaseService,
    private richTextEditorsSettings: RichTextEditorsSettingsService,
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
        .from("admin_settings")
        .select("rich_text_editors_enabled")
        .eq("id", 1)
        .maybeSingle();

      if (error) throw error;
      this.richTextEditorsEnabled =
        (data as { rich_text_editors_enabled?: boolean } | null)
          ?.rich_text_editors_enabled !== false;
    } catch (err) {
      console.error("[RichTextEditorsSettings] Error loading:", err);
      this.errorMessage = "Failed to load settings.";
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async submitSettings(): Promise<void> {
    this.isSaving = true;
    this.successMessage = "";
    this.errorMessage = "";

    try {
      const { error } = await this.supabase.client
        .from("admin_settings")
        .update({ rich_text_editors_enabled: this.richTextEditorsEnabled })
        .eq("id", 1);

      if (error) throw error;

      this.richTextEditorsSettings.invalidateFlagCache();
      this.successMessage = "Rich text editor settings saved.";
      setTimeout(() => {
        this.successMessage = "";
      }, 5000);
    } catch (err) {
      console.error("[RichTextEditorsSettings] Error saving:", err);
      this.errorMessage = "Failed to save settings. Please try again.";
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }
}
