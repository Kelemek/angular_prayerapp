/** Spotlight memorization hourly email send gate (unit-tested). Duplicated in send-user-hourly-memorization-reminders/index.ts — keep in sync. */
export type MemorizationSpotlightLoadStatus = 'ok' | 'empty' | 'error';

export function shouldSendHourlyMemorizationReminderEmail(
  wantEmail: boolean,
  useSpotlightTemplate: boolean,
  spotlightLoadStatus: MemorizationSpotlightLoadStatus | null
): boolean {
  if (!wantEmail) return false;
  if (!useSpotlightTemplate) return true;
  return spotlightLoadStatus !== 'error';
}
