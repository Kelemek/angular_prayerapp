import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EmailSubscriberConfirmationAction,
  EmailSubscriberConfirmationDialogState,
} from './admin-email-subscribers-confirmations';
import {
  buildEmailSubscriberActiveToggleConfirmation,
  buildEmailSubscriberBlockedToggleConfirmation,
  buildEmailSubscriberDeleteConfirmation,
  buildEmailSubscriberPushToggleConfirmation,
} from './admin-email-subscribers-confirmations';
import {
  loadEmailSubscriberAdminFlag,
  loadEmailSubscriberEmail,
} from './admin-email-subscribers-fetch';

export type EmailSubscriberTogglePrepKind =
  | 'toggleActive'
  | 'toggleReceivePush'
  | 'toggleBlocked';

export interface EmailSubscriberConfirmationPrepResult {
  dialog: EmailSubscriberConfirmationDialogState;
  action: EmailSubscriberConfirmationAction;
}

export async function prepareEmailSubscriberToggleConfirmation(
  client: SupabaseClient,
  kind: EmailSubscriberTogglePrepKind,
  id: string,
  current: boolean,
): Promise<EmailSubscriberConfirmationPrepResult> {
  const email = await loadEmailSubscriberEmail(client, id);
  switch (kind) {
    case 'toggleActive':
      return {
        dialog: buildEmailSubscriberActiveToggleConfirmation(email, current),
        action: { kind: 'toggleActive', id, currentActive: current },
      };
    case 'toggleReceivePush':
      return {
        dialog: buildEmailSubscriberPushToggleConfirmation(email, current),
        action: { kind: 'toggleReceivePush', id, currentReceivePush: current },
      };
    case 'toggleBlocked':
      return {
        dialog: buildEmailSubscriberBlockedToggleConfirmation(email, current),
        action: { kind: 'toggleBlocked', id, currentBlocked: current },
      };
    default: {
      const neverKind: never = kind;
      return neverKind;
    }
  }
}

export async function prepareEmailSubscriberDeleteConfirmation(
  client: SupabaseClient,
  id: string,
  email: string,
): Promise<EmailSubscriberConfirmationPrepResult> {
  const isAdmin = await loadEmailSubscriberAdminFlag(client, id);
  return {
    dialog: buildEmailSubscriberDeleteConfirmation(email, isAdmin),
    action: { kind: 'delete', id, email, isAdmin },
  };
}
