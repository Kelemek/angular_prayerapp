import type { SubscriberPickRow } from './admin-subscriber-pick';

export interface PrayerEditorUpdate {
  id: string;
  content: string;
  author: string;
  author_email?: string;
  created_at: string;
  denial_reason?: string | null;
  approval_status?: string;
  is_anonymous?: boolean;
  approved_at?: string;
}

export interface PrayerEditorPrayer {
  id: string;
  title: string;
  requester: string;
  email: string | null;
  status: string;
  created_at: string;
  denial_reason?: string | null;
  description?: string | null;
  approval_status?: string;
  prayer_for?: string;
  prayer_updates?: PrayerEditorUpdate[];
  approved_at?: string;
}

export interface PrayerEditorEditForm {
  title: string;
  description: string;
  requester: string;
  email: string;
  prayer_for: string;
  status: string;
}

export interface PrayerEditorCreateForm {
  description: string;
  firstName: string;
  lastName: string;
  email: string;
  prayer_for: string;
  status: string;
  is_anonymous: boolean;
}

export interface PrayerEditorNewUpdate {
  content: string;
  firstName: string;
  lastName: string;
  author_email: string;
}

export interface PrayerEditorEditUpdateForm {
  content: string;
  author: string;
  author_email: string;
}

export type PrayerEditorCardAction =
  | { type: 'toggleSelect' }
  | { type: 'toggleExpand' }
  | { type: 'startEdit' }
  | { type: 'cancelEdit' }
  | { type: 'saveEdit' }
  | { type: 'delete' }
  | { type: 'startAddUpdate' }
  | { type: 'cancelAddUpdate' }
  | { type: 'saveNewUpdate' }
  | { type: 'deleteUpdate'; updateId: string; content: string }
  | { type: 'startEditUpdate'; update: PrayerEditorUpdate }
  | { type: 'cancelEditUpdate' }
  | { type: 'saveEditUpdate'; updateId: string }
  | { type: 'addUpdateSubscriberSelected'; row: SubscriberPickRow };

export function prayerEditorStatusColor(status: string): string {
  switch (status) {
    case 'current':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    case 'answered':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'archived':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
}

export function prayerEditorApprovalStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    case 'denied':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
}

export const EMPTY_PRAYER_EDITOR_CREATE_FORM: PrayerEditorCreateForm = {
  description: '',
  firstName: '',
  lastName: '',
  email: '',
  prayer_for: '',
  status: 'current',
  is_anonymous: false,
};

export const EMPTY_PRAYER_EDITOR_EDIT_FORM: PrayerEditorEditForm = {
  title: '',
  description: '',
  requester: '',
  email: '',
  prayer_for: '',
  status: '',
};

export const EMPTY_PRAYER_EDITOR_NEW_UPDATE: PrayerEditorNewUpdate = {
  content: '',
  firstName: '',
  lastName: '',
  author_email: '',
};

export const EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM: PrayerEditorEditUpdateForm = {
  content: '',
  author: '',
  author_email: '',
};
