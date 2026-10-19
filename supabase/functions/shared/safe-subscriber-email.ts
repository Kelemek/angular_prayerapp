/** Lowercases and rejects values unsafe for PostgREST `.in('email', …)` filters. */
export function normalizeSubscriberEmailForQuery(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254) {
    return null;
  }
  if (/[%,*()]/.test(email) || /\s/.test(email)) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

/** Escape `_` and `%` so ILIKE matches the address literally. */
export function escapeIlikeExactEmail(email: string): string {
  return email.replace(/\\/g, '\\\\').replace(/_/g, '\\_').replace(/%/g, '\\%');
}

export function normalizeSubscriberEmailsForQuery(rawEmails: string[]): string[] {
  const unique = new Set<string>();
  for (const raw of rawEmails) {
    const email = normalizeSubscriberEmailForQuery(raw);
    if (email) {
      unique.add(email);
    }
  }
  return [...unique];
}

export type SubscriberNotifyRow = {
  email: string;
  is_active: boolean | null;
  is_blocked: boolean | null;
  receive_push: boolean | null;
  name: string | null;
};
