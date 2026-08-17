export interface EmailSubscriberRow {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_blocked: boolean;
  receive_push?: boolean;
  is_admin?: boolean;
  created_at: string;
  last_activity_date?: string | null;
  in_planning_center?: boolean | null;
  planning_center_checked_at?: string | null;
}

export interface EmailSubscriberCsvRow {
  name: string;
  email: string;
  valid: boolean;
  error?: string;
}

export type EmailSubscriberSortColumn =
  | 'name'
  | 'email'
  | 'created_at'
  | 'last_activity_date'
  | 'is_active'
  | 'receive_push'
  | 'is_blocked'
  | 'in_planning_center';

export type EmailSubscriberRowAction =
  | { type: 'toggleActive' }
  | { type: 'toggleReceivePush' }
  | { type: 'toggleBlocked' }
  | { type: 'edit' }
  | { type: 'delete' };

export function escapeEmailSubscriberIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export const EMAIL_SUBSCRIBER_LIST_SEARCH_MIN_CHARS = 2;
export const EMAIL_SUBSCRIBER_LIST_SEARCH_DEBOUNCE_MS = 350;
export const EMAIL_SUBSCRIBER_PC_SEARCH_MIN_CHARS = 2;
export const EMAIL_SUBSCRIBER_PC_SEARCH_DEBOUNCE_MS = 500;
