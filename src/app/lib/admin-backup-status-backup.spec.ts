import { describe, expect, it } from 'vitest';
import { tablesForManualBackup } from './admin-backup-status-backup';

describe('tablesForManualBackup', () => {
  it('drops verification_codes from a discovered table list', () => {
    expect(tablesForManualBackup(['prayers', 'verification_codes', 'email_subscribers'])).toEqual([
      'prayers',
      'email_subscribers',
    ]);
  });
});
