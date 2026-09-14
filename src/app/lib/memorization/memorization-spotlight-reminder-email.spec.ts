import { describe, expect, it } from 'vitest';
import { shouldSendHourlyMemorizationReminderEmail } from './memorization-spotlight-reminder-email';

describe('shouldSendHourlyMemorizationReminderEmail', () => {
  it('skips email when spotlight template is on but memorized_items load failed', () => {
    expect(
      shouldSendHourlyMemorizationReminderEmail(true, true, 'error')
    ).toBe(false);
  });

  it('still sends spotlight template email when user has no memorized items', () => {
    expect(
      shouldSendHourlyMemorizationReminderEmail(true, true, 'empty')
    ).toBe(true);
  });

  it('sends simple nudge template regardless of spotlight load status', () => {
    expect(
      shouldSendHourlyMemorizationReminderEmail(true, false, 'error')
    ).toBe(true);
  });
});
