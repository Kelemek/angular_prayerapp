import type { EmailSubscriberRow } from './admin-email-subscribers';
import { countActiveEmailSubscribers } from './admin-email-subscribers-sort';

export function patchEmailSubscriberActive(
  rows: EmailSubscriberRow[],
  id: string,
  isActive: boolean,
): {
  rows: EmailSubscriberRow[];
  totalActiveCount: number;
} {
  const rowsPatched = rows.map((row) =>
    row.id === id ? { ...row, is_active: isActive } : row,
  );
  return {
    rows: rowsPatched,
    totalActiveCount: countActiveEmailSubscribers(rowsPatched),
  };
}

export function patchEmailSubscriberReceivePush(
  rows: EmailSubscriberRow[],
  id: string,
  receivePush: boolean,
): EmailSubscriberRow[] {
  return rows.map((row) =>
    row.id === id ? { ...row, receive_push: receivePush } : row,
  );
}

export function patchEmailSubscriberBlocked(
  rows: EmailSubscriberRow[],
  id: string,
  isBlocked: boolean,
): EmailSubscriberRow[] {
  return rows.map((row) =>
    row.id === id ? { ...row, is_blocked: isBlocked } : row,
  );
}

export function removeEmailSubscriberFromList(
  rows: EmailSubscriberRow[],
  id: string,
): EmailSubscriberRow[] {
  return rows.filter((row) => row.id !== id);
}

export function patchEmailSubscriberName(
  rows: EmailSubscriberRow[],
  id: string,
  name: string,
): EmailSubscriberRow[] {
  return rows.map((row) => (row.id === id ? { ...row, name } : row));
}
