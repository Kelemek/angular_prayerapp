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
    expect(sql).toContain('>Web Site</a>');
    expect(sql).toContain('href="{{appLink}}"');
    expect(sql).not.toContain('Cross Point Prayer');
    expect(sql).not.toContain('cpprayer.cp-church.org');
    expect(sql).toContain('Install Cross Pointe Prayer');
    expect(sql.match(/>Web Site<\/a>/g)?.length).toBe(2);
  });

  it('anchors subscriber plain text on the full {{appLink}}/info line', () => {
    const subscriberSql = sql.slice(
      0,
      sql.indexOf("WHERE template_key = 'subscriber_welcome'"),
    );
    expect(subscriberSql).toMatch(
      /replace\(\s*text_body,\s*E'Visit the app to get started: \{\{appLink\}\}\/info',\s*E'Visit the app to get started: \{\{appLink\}\}\/info\r?\n\r?\nGet the app:\r?\nWeb Site: \{\{appLink\}\}/,
    );
    expect(subscriberSql).toContain(
      "E'Visit the app to get started: {{appLink}}info'",
    );
    expect(subscriberSql).toContain(
      "WHEN text_body LIKE '%id6759469929%' THEN text_body",
    );
    expect(subscriberSql).not.toContain("E'{{appLink}}'");
  });

  it('skips group_welcome when plain text already contains the App Store id', () => {
    const groupSql = sql.slice(
      sql.lastIndexOf('UPDATE public.email_templates'),
    );
    expect(groupSql).toContain("E'{{appLink}}'");
    expect(groupSql).toContain('Web Site: {{appLink}}');
    expect(groupSql).toContain(
      "AND COALESCE(text_body, '') NOT LIKE '%id6759469929%'",
    );
  });
});