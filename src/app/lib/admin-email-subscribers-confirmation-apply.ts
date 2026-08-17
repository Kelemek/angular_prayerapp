import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailSubscriberConfirmationAction } from './admin-email-subscribers-confirmations';
import type { EmailSubscriberRow } from './admin-email-subscribers';
import {
  commandDeleteEmailSubscriber,
  commandSetEmailSubscriberActive,
  commandSetEmailSubscriberBlocked,
  commandSetEmailSubscriberReceivePush,
  commandUnsubscribeAdminEmailSubscriber,
} from './admin-email-subscribers-commands';
import {
  patchEmailSubscriberActive,
  patchEmailSubscriberBlocked,
  patchEmailSubscriberReceivePush,
  removeEmailSubscriberFromList,
} from './admin-email-subscribers-list-patches';
import { emailSubscriberPageAfterDelete } from './admin-email-subscribers-pagination';
import { countActiveEmailSubscribers } from './admin-email-subscribers-sort';

export interface EmailSubscriberConfirmationApplyInput {
  allSubscribers: EmailSubscriberRow[];
  totalActiveCount: number;
  totalItems: number;
  currentPage: number;
  pageSize: number;
  csvSuccess: string | null;
}

export interface EmailSubscriberConfirmationApplyResult {
  allSubscribers: EmailSubscriberRow[];
  totalActiveCount: number;
  totalItems: number;
  currentPage: number;
  csvSuccess: string | null;
  toastSuccess?: string;
  needsLoadPageData: boolean;
}

export async function applyEmailSubscriberConfirmation(
  client: SupabaseClient,
  action: EmailSubscriberConfirmationAction,
  input: EmailSubscriberConfirmationApplyInput,
): Promise<EmailSubscriberConfirmationApplyResult> {
  switch (action.kind) {
    case 'toggleActive': {
      const nextActive = !action.currentActive;
      await commandSetEmailSubscriberActive(client, action.id, nextActive);
      const activePatch = patchEmailSubscriberActive(
        input.allSubscribers,
        action.id,
        nextActive,
      );
      return {
        allSubscribers: activePatch.rows,
        totalActiveCount: activePatch.totalActiveCount,
        totalItems: input.totalItems,
        currentPage: input.currentPage,
        csvSuccess: input.csvSuccess,
        toastSuccess: action.currentActive
          ? 'Subscriber deactivated'
          : 'Subscriber activated',
        needsLoadPageData: false,
      };
    }
    case 'toggleReceivePush': {
      const nextReceivePush = !action.currentReceivePush;
      await commandSetEmailSubscriberReceivePush(
        client,
        action.id,
        nextReceivePush,
      );
      return {
        allSubscribers: patchEmailSubscriberReceivePush(
          input.allSubscribers,
          action.id,
          nextReceivePush,
        ),
        totalActiveCount: input.totalActiveCount,
        totalItems: input.totalItems,
        currentPage: input.currentPage,
        csvSuccess: input.csvSuccess,
        toastSuccess: action.currentReceivePush
          ? 'Push notifications disabled'
          : 'Push notifications enabled',
        needsLoadPageData: false,
      };
    }
    case 'toggleBlocked': {
      const nextBlocked = !action.currentBlocked;
      await commandSetEmailSubscriberBlocked(client, action.id, nextBlocked);
      return {
        allSubscribers: patchEmailSubscriberBlocked(
          input.allSubscribers,
          action.id,
          nextBlocked,
        ),
        totalActiveCount: input.totalActiveCount,
        totalItems: input.totalItems,
        currentPage: input.currentPage,
        csvSuccess: input.csvSuccess,
        toastSuccess: action.currentBlocked
          ? 'User unblocked - login enabled'
          : 'User blocked - login disabled',
        needsLoadPageData: false,
      };
    }
    case 'delete': {
      if (action.isAdmin) {
        await commandUnsubscribeAdminEmailSubscriber(client, action.id);
        const activePatch = patchEmailSubscriberActive(
          input.allSubscribers,
          action.id,
          false,
        );
        return {
          allSubscribers: activePatch.rows,
          totalActiveCount: activePatch.totalActiveCount,
          totalItems: input.totalItems,
          currentPage: input.currentPage,
          csvSuccess: `Admin ${action.email} has been unsubscribed from emails but retains admin access to the portal.`,
          needsLoadPageData: true,
        };
      }

      await commandDeleteEmailSubscriber(client, action.id);
      const allSubscribers = removeEmailSubscriberFromList(
        input.allSubscribers,
        action.id,
      );
      return {
        allSubscribers,
        totalActiveCount: countActiveEmailSubscribers(allSubscribers),
        totalItems: allSubscribers.length,
        currentPage: emailSubscriberPageAfterDelete(
          input.currentPage,
          input.pageSize,
          allSubscribers.length,
        ),
        csvSuccess: input.csvSuccess,
        toastSuccess: 'Subscriber removed',
        needsLoadPageData: true,
      };
    }
    default: {
      const neverKind: never = action.kind;
      return neverKind;
    }
  }
}

export function emailSubscriberConfirmationApplyErrorFeedback(
  action: EmailSubscriberConfirmationAction,
  err: unknown,
): { toastError?: string; error?: string } {
  const message =
    err instanceof Error ? err.message : 'Failed to update subscriber';
  switch (action.kind) {
    case 'delete':
      return { error: message };
    case 'toggleActive':
      return { toastError: 'Failed to update subscriber status' };
    case 'toggleReceivePush':
      return { toastError: 'Failed to update push notification preference' };
    case 'toggleBlocked':
      return { toastError: 'Failed to update user blocked status' };
    default: {
      const neverKind: never = action.kind;
      return neverKind;
    }
  }
}
