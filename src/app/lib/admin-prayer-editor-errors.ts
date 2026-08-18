import { adminErrorMessage } from './admin-error-message';

/** Normalize mutation/search errors for toast and inline banner copy. */
export function prayerEditorErrorMessage(err: unknown, fallback: string): string {
  return adminErrorMessage(err, fallback);
}
