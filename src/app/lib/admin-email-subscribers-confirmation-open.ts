import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EmailSubscriberConfirmationAction,
  EmailSubscriberConfirmationDialogState,
} from './admin-email-subscribers-confirmations';
import {
  prepareEmailSubscriberDeleteConfirmation,
  prepareEmailSubscriberToggleConfirmation,
  type EmailSubscriberTogglePrepKind,
} from './admin-email-subscribers-confirmation-prep';

export interface EmailSubscriberConfirmationOpenHost {
  openConfirmation(
    state: EmailSubscriberConfirmationDialogState,
    action: EmailSubscriberConfirmationAction,
  ): void;
}

const togglePrepErrorMessages: Record<EmailSubscriberTogglePrepKind, string> = {
  toggleActive: 'Failed to prepare status toggle action',
  toggleReceivePush: 'Failed to prepare push toggle action',
  toggleBlocked: 'Failed to prepare block action',
};

export async function openEmailSubscriberToggleConfirmation(
  client: SupabaseClient,
  host: EmailSubscriberConfirmationOpenHost | undefined,
  kind: EmailSubscriberTogglePrepKind,
  id: string,
  current: boolean,
  onToastError: (message: string) => void,
): Promise<void> {
  try {
    const prep = await prepareEmailSubscriberToggleConfirmation(
      client,
      kind,
      id,
      current,
    );
    host?.openConfirmation(prep.dialog, prep.action);
  } catch (err: unknown) {
    console.error('Error preparing subscriber toggle confirmation:', err);
    onToastError(togglePrepErrorMessages[kind]);
  }
}

export async function openEmailSubscriberDeleteConfirmation(
  client: SupabaseClient,
  host: EmailSubscriberConfirmationOpenHost | undefined,
  id: string,
  email: string,
  onError: (message: string) => void,
): Promise<void> {
  try {
    const prep = await prepareEmailSubscriberDeleteConfirmation(
      client,
      id,
      email,
    );
    host?.openConfirmation(prep.dialog, prep.action);
  } catch (err: unknown) {
    console.error('Error preparing delete:', err);
    onError(
      err instanceof Error ? err.message : 'Failed to prepare deletion',
    );
  }
}
