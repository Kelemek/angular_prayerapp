import { Component, Output, EventEmitter, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GitHubFeedbackService, GitHubIssueConfig } from '../../services/github-feedback.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-github-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40">
      <button
        type="button"
        id="github-settings-trigger"
        class="w-full flex items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="onSectionToggle()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="github-settings-panel"
      >
        <span class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="text-blue-600 dark:text-blue-400 shrink-0">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub Feedback Settings
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
        id="github-settings-panel"
        role="region"
        aria-labelledby="github-settings-trigger"
        class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
      <p class="text-gray-600 dark:text-gray-400 text-sm mb-6">
        Configure GitHub repository settings for user feedback integration
      </p>

      <form (ngSubmit)="submitSettings()" class="space-y-6">
        <!-- Enable GitHub Feedback -->
        <div class="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <input
            type="checkbox"
            id="enableGithub"
            [(ngModel)]="config.enabled"
            name="enableGithub"
            [disabled]="isSaving"
            class="mt-1 h-4 w-4 text-blue-600 border-gray-300 bg-white dark:bg-gray-800 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0 disabled:opacity-50"
          />
          <div class="flex-1">
            <label for="enableGithub" class="font-medium text-gray-900 dark:text-gray-100 text-sm">
              Enable GitHub Feedback
            </label>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Allow users to submit feedback as GitHub issues
            </p>
          </div>
        </div>

        <!-- Repository Owner -->
        <div>
          <label for="repoOwner" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Repository Owner
          </label>
          <input
            type="text"
            id="repoOwner"
            [(ngModel)]="config.github_repo_owner"
            name="repoOwner"
            placeholder="e.g., your-github-username"
            [disabled]="isSaving || !config.enabled"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            GitHub username or organization name
          </p>
        </div>

        <!-- Repository Name -->
        <div>
          <label for="repoName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Repository Name
          </label>
          <input
            type="text"
            id="repoName"
            [(ngModel)]="config.github_repo_name"
            name="repoName"
            placeholder="e.g., my-project"
            [disabled]="isSaving || !config.enabled"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            GitHub repository name
          </p>
        </div>

        <!-- GitHub Token -->
        <div>
          <label for="githubToken" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Personal Access Token
          </label>
          <input
            [type]="showToken ? 'text' : 'password'"
            id="githubToken"
            [(ngModel)]="config.github_token"
            name="githubToken"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            [disabled]="isSaving || !config.enabled"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">
              Create a personal access token →
            </a>
            with 'repo' and 'issues' scopes
          </p>
        </div>

        <!-- Info Box -->
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <p class="text-sm text-amber-800 dark:text-amber-200">
            <strong>Security Note:</strong> Your GitHub token is encrypted in our database. Never share your token with anyone.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 justify-end">
          <button
            type="button"
            (click)="testConnection()"
            [disabled]="isSaving || isTestingConnection || !config.enabled || !config.github_token || !config.github_repo_owner || !config.github_repo_name"
            class="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            @if (isTestingConnection) {
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8 9.5 1 16"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            }
            <span>Test Connection</span>
          </button>

          <button
            type="submit"
            [disabled]="isSaving"
            class="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            @if (isSaving) {
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Saving...</span>
            } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Save Settings</span>
            }
          </button>
        </div>
      </form>

      <!-- Status Messages -->
      @if (successMessage) {
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mt-4" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="flex items-start gap-2">
          <svg class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <p class="text-sm text-green-800 dark:text-green-200">{{ successMessage }}</p>
        </div>
      </div>
      } @if (errorMessage) {
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mt-4" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="flex items-start gap-2">
          <svg class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div class="flex-1">
            <p class="text-sm text-red-800 dark:text-red-200 font-medium">{{ errorMessage }}</p>
            @if (testError) {
            <p class="text-xs text-red-700 dark:text-red-300 mt-1">{{ testError }}</p>
            }
          </div>
        </div>
      </div>
      } @if (testMessage) {
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mt-4" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="flex items-start gap-2">
          <svg class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <p class="text-sm text-blue-800 dark:text-blue-200">{{ testMessage }}</p>
        </div>
      </div>
      }
      </div>
      }
    </div>
  `,
  styles: []
})
export class GitHubSettingsComponent implements OnDestroy {
  @Output() onSave = new EventEmitter<void>();

  sectionExpanded = false;
  private sectionInitialLoadDone = false;

  config: GitHubIssueConfig = {
    id: 1,
    github_token: '',
    github_repo_owner: '',
    github_repo_name: '',
    enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  showToken: boolean = false;
  isSaving: boolean = false;
  isTestingConnection: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  testMessage: string = '';
  testError: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private githubFeedbackService: GitHubFeedbackService,
    private cdr: ChangeDetectorRef
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.loadConfiguration();
    }
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await this.githubFeedbackService.getGitHubConfig();
      if (savedConfig) {
        this.config = savedConfig;
      }
    } catch (err) {
      console.error('[GitHubSettings] Error loading configuration:', err);
    }
  }

  async submitSettings(): Promise<void> {
    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.testMessage = '';
    this.testError = '';

    try {
      const success = await this.githubFeedbackService.saveGitHubConfig(this.config);

      if (success) {
        this.successMessage = 'GitHub settings saved successfully!';
        this.onSave.emit();
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      } else {
        this.errorMessage = 'Failed to save GitHub settings. Please try again.';
      }
    } catch (err) {
      console.error('[GitHubSettings] Error saving configuration:', err);
      this.errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }

  async testConnection(): Promise<void> {
    this.isTestingConnection = true;
    this.testMessage = '';
    this.testError = '';
    this.errorMessage = '';

    try {
      const result = await this.githubFeedbackService.testGitHubConnection(
        this.config.github_token,
        this.config.github_repo_owner,
        this.config.github_repo_name
      );

      if (result.success) {
        this.testMessage = result.message;
        setTimeout(() => {
          this.testMessage = '';
        }, 5000);
      } else {
        this.testError = result.message;
      }
    } catch (err) {
      console.error('[GitHubSettings] Connection test error:', err);
      this.testError = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.isTestingConnection = false;
    }
  }
}
