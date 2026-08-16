import {
  Component,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { GitHubFeedbackService } from "../../services/github-feedback.service";
import { UserSessionService } from "../../services/user-session.service";
import { Subject, takeUntil } from "rxjs";

type FeedbackType = "suggestion" | "feature" | "bug";

@Component({
  selector: "app-github-feedback-form",
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="pb-0 pt-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Send Feedback
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Have a suggestion, bug report, or feature request? Let us know!
        </p>
      </div>

      <!-- Divider -->
      <div class="modal-chrome-border-t"></div>

      <!-- Form -->
      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Issue Type -->
        <div id="tour-settings-feedback-type">
          <span
            id="issueType-label"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Feedback Type
          </span>
          <div
            id="issueType"
            role="radiogroup"
            aria-labelledby="issueType-label"
            (keydown)="onFeedbackTypeKeydown($event)"
            class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2"
          >
            @for (option of feedbackTypeOptions; track option.value) {
              <button
                type="button"
                role="radio"
                [id]="feedbackTypeOptionId(option.value)"
                [attr.aria-checked]="feedbackType === option.value"
                [attr.tabindex]="feedbackType === option.value ? 0 : -1"
                [disabled]="isLoading"
                (click)="selectFeedbackType(option.value)"
                [ngClass]="feedbackTypeTileClasses(feedbackType === option.value)"
                class="flex items-center justify-center p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                <span
                  class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 text-center"
                  >{{ option.label }}</span
                >
              </button>
            }
          </div>
        </div>

        <div id="tour-settings-feedback-details" class="space-y-4">
          <!-- Title -->
          <div>
            <label
              for="feedbackTitle"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Title
            </label>
            <input
              type="text"
              id="feedbackTitle"
              [(ngModel)]="feedbackTitle"
              name="feedbackTitle"
              placeholder="Brief summary of your feedback"
              [disabled]="isLoading"
              required
              maxlength="100"
              class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ feedbackTitle.length }}/100
            </p>
          </div>

          <!-- Description -->
          <div>
            <label
              for="feedbackDescription"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="feedbackDescription"
              [(ngModel)]="feedbackDescription"
              name="feedbackDescription"
              placeholder="Provide details about your feedback..."
              [disabled]="isLoading"
              required
              rows="4"
              maxlength="1000"
              class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            ></textarea>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ feedbackDescription.length }}/1000
            </p>
          </div>

          <!-- Submit Button -->
          <div class="flex gap-2">
            <button
              type="submit"
              [disabled]="
                isLoading ||
                !feedbackTitle.trim() ||
                !feedbackDescription.trim()
              "
              class="flex items-center justify-center gap-2 px-4 py-2 btn-chip btn-chip-blue disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              @if (isLoading) {
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
              <span>Sending...</span>
              } @else {
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
                <path d="M22 2L11 13M22 2l-7 20-5-9-9-5 20-7z"></path>
              </svg>
              <span>Send Feedback</span>
              }
            </button>
          </div>
        </div>
      </form>

      <!-- Status Messages -->
      @if (successMessage) {
      <div
        class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="flex items-start gap-2">
          <svg
            class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <div class="flex-1">
            <p class="text-sm text-green-800 dark:text-green-200 font-medium">
              Thank you for your feedback!
            </p>
            <p class="text-xs text-green-700 dark:text-green-300 mt-1">
              Your submission has been received and will be reviewed by our
              team.
            </p>
          </div>
        </div>
      </div>
      } @if (errorMessage) {
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="flex items-start gap-2">
          <svg
            class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            ></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div class="flex-1">
            <p class="text-sm text-red-800 dark:text-red-200 font-medium">
              Error sending feedback
            </p>
            <p class="text-xs text-red-700 dark:text-red-300 mt-1">
              {{ errorMessage }}
            </p>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class GitHubFeedbackFormComponent implements OnDestroy {
  readonly feedbackTypeOptions: ReadonlyArray<{
    value: FeedbackType;
    label: string;
  }> = [
    { value: "suggestion", label: "Suggestion" },
    { value: "feature", label: "Feature Request" },
    { value: "bug", label: "Bug Report" },
  ];

  feedbackType: FeedbackType = "suggestion";
  feedbackTitle: string = "";
  feedbackDescription: string = "";
  isLoading: boolean = false;
  successMessage: string = "";
  errorMessage: string = "";
  issueUrl: string = "";

  private destroy$ = new Subject<void>();

  constructor(
    private githubFeedbackService: GitHubFeedbackService,
    private userSessionService: UserSessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectFeedbackType(type: FeedbackType): void {
    if (this.isLoading || this.feedbackType === type) {
      return;
    }
    this.feedbackType = type;
  }

  feedbackTypeTileClasses(selected: boolean): Record<string, boolean> {
    return {
      "border-blue-500 bg-blue-200 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-200 dark:hover:bg-blue-900/30":
        selected,
      "border-church-surface-inactive-border dark:border-gray-700 bg-church-surface-inactive dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20":
        !selected,
    };
  }

  feedbackTypeOptionId(type: FeedbackType): string {
    return `feedbackType-${type}`;
  }

  private focusFeedbackTypeOption(type: FeedbackType): void {
    document.getElementById(this.feedbackTypeOptionId(type))?.focus();
  }

  onFeedbackTypeKeydown(event: KeyboardEvent): void {
    if (this.isLoading) {
      return;
    }

    const order = this.feedbackTypeOptions.map((option) => option.value);
    const currentIndex = order.indexOf(this.feedbackType);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % order.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + order.length) % order.length;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextType = order[nextIndex];
    this.feedbackType = nextType;
    this.cdr.markForCheck();
    queueMicrotask(() => this.focusFeedbackTypeOption(nextType));
  }

  async onSubmit(): Promise<void> {
    if (!this.feedbackTitle.trim() || !this.feedbackDescription.trim()) {
      this.errorMessage = "Please fill in all fields";
      return;
    }

    this.isLoading = true;
    this.successMessage = "";
    this.errorMessage = "";
    this.issueUrl = "";
    this.cdr.markForCheck();

    try {
      // Wait for user session to be available
      const userSession = await this.userSessionService.waitForSession();
      if (!userSession) {
        this.errorMessage = "User session not available. Please try again.";
        this.cdr.markForCheck();
        return;
      }

      const result = await this.githubFeedbackService.createGitHubIssue({
        title: this.feedbackTitle.trim(),
        body: this.feedbackDescription.trim(),
        type: this.feedbackType,
        userEmail: userSession.email,
        userName: userSession.fullName,
      });

      if (result.success) {
        this.successMessage = "Thank you! Your feedback has been submitted.";
        this.issueUrl = result.url || "";
        // Reset form after success
        this.feedbackTitle = "";
        this.feedbackDescription = "";
        this.feedbackType = "suggestion";
        this.cdr.markForCheck();
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = "";
          this.cdr.markForCheck();
        }, 5000);
      } else {
        this.errorMessage =
          result.error || "Failed to submit feedback. Please try again.";
        this.cdr.markForCheck();
      }
    } catch (err) {
      console.error("[GitHubFeedbackForm] Submission error:", err);
      this.errorMessage = "An unexpected error occurred. Please try again.";
      this.cdr.markForCheck();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
