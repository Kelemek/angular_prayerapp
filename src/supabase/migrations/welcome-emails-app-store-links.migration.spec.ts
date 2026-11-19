import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
} from '../../lib/app-store-links';

describe('migration 20261119140000_welcome_emails_app_store_links.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261119140000_welcome_emails_app_store_links.sql',
    ),
    'utf8',
  );

  it('adds store links to subscriber_welcome and group_welcome using canonical URLs', () => {
    expect(sql).toContain("'subscriber_welcome'");
    expect(sql).toContain("'group_welcome'");
    expect(sql).toContain('Get the app');
    expect(sql).toContain(IOS_APP_STORE_URL);
    expect(sql).toContain(ANDROID_PLAY_STORE_URL);
    expect(sql).toContain('App Store (iOS)');
    expect(sql).toContain('Google Play (Android)');
  });
});