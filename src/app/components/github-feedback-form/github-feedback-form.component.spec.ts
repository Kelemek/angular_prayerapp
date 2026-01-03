import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubFeedbackFormComponent } from './github-feedback-form.component';
import { GitHubFeedbackService } from '../../services/github-feedback.service';
import { ChangeDetectorRef } from '@angular/core';

describe('GitHubFeedbackFormComponent', () => {
  let component: GitHubFeedbackFormComponent;
  let mockGitHubFeedbackService: any;
  let mockChangeDetectorRef: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockGitHubFeedbackService = {
      createGitHubIssue: vi.fn()
    };

    mockChangeDetectorRef = {
      markForCheck: vi.fn()
    };

    component = new GitHubFeedbackFormComponent(
      mockGitHubFeedbackService,
      mockChangeDetectorRef as ChangeDetectorRef
    );
    component.userEmail = 'test@example.com';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Initialization', () => {
    it('should create component with default values', () => {
      expect(component).toBeTruthy();
      expect(component.feedbackType).toBe('suggestion');
      expect(component.feedbackTitle).toBe('');
      expect(component.feedbackDescription).toBe('');
      expect(component.isLoading).toBe(false);
      expect(component.successMessage).toBe('');
      expect(component.errorMessage).toBe('');
    });

    it('should have userEmail property', () => {
      expect(component.userEmail).toBe('test@example.com');
    });

    it('should initialize destroy subject', () => {
      expect(component['destroy$']).toBeDefined();
    });
  });

  describe('Form Properties', () => {
    it('should track feedback type changes', () => {
      component.feedbackType = 'bug';
      expect(component.feedbackType).toBe('bug');

      component.feedbackType = 'feature';
      expect(component.feedbackType).toBe('feature');
    });

    it('should track feedback title changes', () => {
      component.feedbackTitle = 'Test Title';
      expect(component.feedbackTitle).toBe('Test Title');
    });

    it('should track feedback description changes', () => {
      const description = 'This is a long feedback description';
      component.feedbackDescription = description;
      expect(component.feedbackDescription).toBe(description);
    });

    it('should accept long title values', () => {
      const longTitle = 'a'.repeat(101);
      component.feedbackTitle = longTitle;
      expect(component.feedbackTitle).toBe(longTitle);
    });

    it('should accept long description values', () => {
      const longDesc = 'a'.repeat(1001);
      component.feedbackDescription = longDesc;
      expect(component.feedbackDescription).toBe(longDesc);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });
    });

    it('should validate required fields before submission', async () => {
      component.feedbackTitle = '';
      component.feedbackDescription = '';

      await component.onSubmit();

      expect(component.errorMessage).toContain('fill in all fields');
      expect(mockGitHubFeedbackService.createGitHubIssue).not.toHaveBeenCalled();
    });

    it('should set loading state during submission', async () => {
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Test description';

      const submitPromise = component.onSubmit();
      expect(component.isLoading).toBe(true);

      await submitPromise;
    });

    it('should call GitHub service with correct payload', async () => {
      component.feedbackType = 'bug';
      component.feedbackTitle = 'Test Bug';
      component.feedbackDescription = 'Bug description';

      await component.onSubmit();

      expect(mockGitHubFeedbackService.createGitHubIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Bug',
          body: 'Bug description',
          type: 'bug',
          userEmail: 'test@example.com'
        })
      );
    });

    it('should trim whitespace from inputs before submission', async () => {
      component.feedbackTitle = '  Test Title  ';
      component.feedbackDescription = '  Test Description  ';

      await component.onSubmit();

      const callArgs = mockGitHubFeedbackService.createGitHubIssue.mock.calls[0][0];
      expect(callArgs.title).toBe('Test Title');
      expect(callArgs.body).toBe('Test Description');
    });

    it('should reset form after successful submission', async () => {
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.feedbackTitle).toBe('');
      expect(component.feedbackDescription).toBe('');
      expect(component.feedbackType).toBe('suggestion');
    });

    it('should display success message on successful submission', async () => {
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.successMessage).toContain('Thank you');
      expect(component.isLoading).toBe(false);
    });

    it('should include GitHub issue URL in response', async () => {
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.issueUrl).toBe('https://github.com/test/repo/issues/1');
    });

    it('should clear loading state after successful submission', async () => {
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();
      vi.advanceTimersByTime(100);

      expect(component.isLoading).toBe(false);
    });

    it('should handle submission failure gracefully', async () => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: false,
        error: 'GitHub not configured'
      });

      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.errorMessage).toBe('GitHub not configured');
      expect(component.isLoading).toBe(false);
    });

    it('should handle exceptions during submission', async () => {
      mockGitHubFeedbackService.createGitHubIssue.mockRejectedValue(
        new Error('Network error')
      );

      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.errorMessage).toContain('unexpected error');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Success Message Handling', () => {
    beforeEach(() => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });
    });

    it('should auto-clear success message after timeout', async () => {
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.successMessage).toBeTruthy();

      vi.advanceTimersByTime(5000);

      expect(component.successMessage).toBe('');
    });

    it('should include GitHub link in success response', async () => {
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.issueUrl).toBe('https://github.com/test/repo/issues/1');
    });
  });

  describe('Error Handling', () => {
    it('should clear previous errors on new submission', async () => {
      component.errorMessage = 'Previous error';

      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });

      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.errorMessage).not.toBe('Previous error');
    });

    it('should display detailed error messages from service', async () => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: false,
        error: 'Invalid GitHub token: authentication failed'
      });

      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.errorMessage).toContain('authentication failed');
    });

    it('should handle API timeout errors', async () => {
      mockGitHubFeedbackService.createGitHubIssue.mockRejectedValue(
        new Error('Request timeout')
      );

      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(component.errorMessage).toBeTruthy();
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Change Detection', () => {
    it('should call markForCheck after setting loading state', async () => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });

      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should call markForCheck after success message', async () => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });

      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should call markForCheck on error', async () => {
      mockGitHubFeedbackService.createGitHubIssue.mockRejectedValue(
        new Error('Error')
      );

      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('Feedback Types', () => {
    it('should support bug feedback type', () => {
      component.feedbackType = 'bug';
      expect(component.feedbackType).toBe('bug');
    });

    it('should support feature feedback type', () => {
      component.feedbackType = 'feature';
      expect(component.feedbackType).toBe('feature');
    });

    it('should support suggestion feedback type', () => {
      component.feedbackType = 'suggestion';
      expect(component.feedbackType).toBe('suggestion');
    });

    it('should default to suggestion type', () => {
      expect(component.feedbackType).toBe('suggestion');
    });
  });

  describe('Component Cleanup', () => {
    it('should complete destroy subject on ngOnDestroy', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'complete');
      component.ngOnDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Different Feedback Types', () => {
    beforeEach(() => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });
    });

    it('should submit bug feedback with correct type', async () => {
      component.feedbackType = 'bug' as const;
      component.feedbackTitle = 'Bug Title';
      component.feedbackDescription = 'Bug Description';

      await component.onSubmit();

      expect(mockGitHubFeedbackService.createGitHubIssue).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bug' })
      );
    });

    it('should submit feature feedback with correct type', async () => {
      component.feedbackType = 'feature' as const;
      component.feedbackTitle = 'Feature Title';
      component.feedbackDescription = 'Feature Description';

      await component.onSubmit();

      expect(mockGitHubFeedbackService.createGitHubIssue).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'feature' })
      );
    });

    it('should submit suggestion feedback with correct type', async () => {
      component.feedbackType = 'suggestion' as const;
      component.feedbackTitle = 'Suggestion Title';
      component.feedbackDescription = 'Suggestion Description';

      await component.onSubmit();

      expect(mockGitHubFeedbackService.createGitHubIssue).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'suggestion' })
      );
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });
    });

    it('should handle empty string inputs', async () => {
      component.feedbackTitle = '';
      component.feedbackDescription = '';

      await component.onSubmit();

      expect(component.errorMessage).toContain('fill in all fields');
    });

    it('should handle whitespace-only inputs', async () => {
      component.feedbackTitle = '   ';
      component.feedbackDescription = '   ';

      await component.onSubmit();

      expect(component.errorMessage).toContain('fill in all fields');
    });

    it('should handle very long titles', () => {
      const longTitle = 'a'.repeat(150);
      component.feedbackTitle = longTitle;

      expect(component.feedbackTitle.length).toBe(150);
    });

    it('should handle very long descriptions', () => {
      const longDesc = 'a'.repeat(1500);
      component.feedbackDescription = longDesc;

      expect(component.feedbackDescription.length).toBe(1500);
    });

    it('should handle multiple rapid submissions', async () => {
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });

      const submission1 = component.onSubmit();
      const submission2 = component.onSubmit();

      await Promise.all([submission1, submission2]);

      expect(mockGitHubFeedbackService.createGitHubIssue).toHaveBeenCalledTimes(2);
    });

    it('should handle null userEmail gracefully', async () => {
      component.userEmail = '';
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      const callArgs = mockGitHubFeedbackService.createGitHubIssue.mock.calls[0][0];
      expect(callArgs.userEmail).toBe('');
    });
  });

  describe('User Interaction Scenarios', () => {
    beforeEach(() => {
      mockGitHubFeedbackService.createGitHubIssue.mockResolvedValue({
        success: true,
        url: 'https://github.com/test/repo/issues/1'
      });
    });

    it('should handle typing in feedback title', () => {
      component.feedbackTitle = 'T';
      expect(component.feedbackTitle).toBe('T');

      component.feedbackTitle = 'Te';
      expect(component.feedbackTitle).toBe('Te');

      component.feedbackTitle = 'Test';
      expect(component.feedbackTitle).toBe('Test');
    });

    it('should handle typing in feedback description', () => {
      component.feedbackDescription = 'This is ';
      expect(component.feedbackDescription).toBe('This is ');

      component.feedbackDescription = 'This is a test';
      expect(component.feedbackDescription).toBe('This is a test');
    });

    it('should handle changing feedback type mid-form', async () => {
      component.feedbackType = 'bug' as const;
      component.feedbackType = 'feature' as const;
      component.feedbackTitle = 'Test';
      component.feedbackDescription = 'Description';

      await component.onSubmit();

      expect(mockGitHubFeedbackService.createGitHubIssue).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'feature' })
      );
    });

    it('should handle user cancelling after filling form', () => {
      component.feedbackTitle = 'Test Title';
      component.feedbackDescription = 'Test Description';

      // User clears the form
      component.feedbackTitle = '';
      component.feedbackDescription = '';

      expect(component.feedbackTitle).toBe('');
      expect(component.feedbackDescription).toBe('');
    });
  });
});
