import { Injectable } from '@angular/core';
import { messageFromFunctionsInvokeError } from '../lib/edge-function-invoke-error';
import { SupabaseService } from './supabase.service';

export interface FeedbackPayload {
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'suggestion';
  userEmail?: string;
  userName?: string;
  pageUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GitHubFeedbackService {
  constructor(private supabaseService: SupabaseService) {}

  async submitFeedback(
    payload: FeedbackPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabaseService.client.functions.invoke(
        'submit-feedback',
        { body: payload }
      );

      if (error) {
        console.error('[Feedback] Edge function error:', error);
        return {
          success: false,
          error: await messageFromFunctionsInvokeError(error),
        };
      }

      const result = data as { success?: boolean; error?: string; details?: string };
      if (result?.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result?.error || result?.details || 'Failed to submit feedback',
      };
    } catch (err) {
      console.error('[Feedback] Exception submitting feedback:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
