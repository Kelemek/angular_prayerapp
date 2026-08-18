import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailSubscriberConfirmationAction } from './admin-email-subscribers-confirmations';
import {
  applyEmailSubscriberConfirmation,
  emailSubscriberConfirmationApplyErrorFeedback,
  type EmailSubscriberConfirmationApplyInput,
  type EmailSubscriberConfirmationApplyResult,
} from './admin-email-subscribers-confirmation-apply';

export interface EmailSubscriberConfirmationRunnerCallbacks {
  getClient: () => SupabaseClient;
  getApplyInput: () => EmailSubscriberConfirmationApplyInput;
  applyResult: (result: EmailSubscriberConfirmationApplyResult) => void;
  onApplyError: (feedback: { toastError?: string; error?: string }) => void;
  loadPageData: () => void;
}

export async function runEmailSubscriberConfirmationAction(
  action: EmailSubscriberConfirmationAction,
  callbacks: EmailSubscriberConfirmationRunnerCallbacks,
): Promise<void> {
  try {
    const result = await applyEmailSubscriberConfirmation(
      callbacks.getClient(),
      action,
      callbacks.getApplyInput(),
    );
    callbacks.applyResult(result);
    if (result.needsLoadPageData) {
      callbacks.loadPageData();
    }
  } catch (err: unknown) {
    console.error('Error applying subscriber confirmation:', err);
    callbacks.onApplyError(
      emailSubscriberConfirmationApplyErrorFeedback(action, err),
    );
  }
}
