import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { GitHubFeedbackService } from './github-feedback.service';

describe('GitHubFeedbackService', () => {
  let service: GitHubFeedbackService;
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockSupabaseService: { client: { functions: { invoke: ReturnType<typeof vi.fn> } } };

  beforeEach(() => {
    mockInvoke = vi.fn();
    mockSupabaseService = {
      client: {
        functions: {
          invoke: mockInvoke,
        },
      },
    };
    service = new GitHubFeedbackService(mockSupabaseService as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submitFeedback', () => {
    const payload = {
      title: 'Test title',
      description: 'Test description',
      type: 'bug' as const,
      userEmail: 'user@example.com',
      userName: 'Test User',
      pageUrl: 'https://app.example.com/home',
    };

    it('should invoke submit-feedback Edge Function with payload', async () => {
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      const result = await service.submitFeedback(payload);

      expect(mockInvoke).toHaveBeenCalledWith('submit-feedback', { body: payload });
      expect(result.success).toBe(true);
    });

    it('should return error when invoke fails', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      });

      const result = await service.submitFeedback(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Function error');
    });

    it('should return JSON body message from FunctionsHttpError', async () => {
      const httpError = new FunctionsHttpError({
        status: 403,
        json: async () => ({ error: 'Not a subscriber' }),
      } as Response);

      mockInvoke.mockResolvedValue({
        data: null,
        error: httpError,
      });

      const result = await service.submitFeedback(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not a subscriber');
    });

    it('should return error when response success is false', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: false, error: 'Unauthorized' },
        error: null,
      });

      const result = await service.submitFeedback(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should handle thrown exceptions', async () => {
      mockInvoke.mockRejectedValue(new Error('Network failure'));

      const result = await service.submitFeedback(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });
  });
});
