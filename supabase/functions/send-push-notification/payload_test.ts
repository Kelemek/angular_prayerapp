import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { assertThrows } from 'https://deno.land/std@0.224.0/assert/assert_throws.ts';
import {
  buildApnsRequest,
  buildFcmMessage,
  logContent,
  parsePushRequest,
  type PushRequest,
} from './payload.ts';

const badgeOnly: PushRequest = { kind: 'badge_only', platform: 'both' };

const alert: PushRequest = {
  kind: 'alert',
  emails: ['a@x.com'],
  sendToAll: false,
  title: 'Prayer approved',
  body: 'Body',
  data: { type: 'prayer_approved', prayerId: '1' },
  platform: 'both',
};

Deno.test('badgeOnly parses without title, body, or emails', () => {
  assertEquals(parsePushRequest({ badgeOnly: true }), badgeOnly);
});

Deno.test('alert still requires title, body, and recipients', () => {
  assertEquals(parsePushRequest({ emails: ['a@x.com'] }), { error: 'title and body are required' });
  assertEquals(parsePushRequest({ title: 'T', body: 'B' }), { error: 'emails or sendToAll is required' });
});

Deno.test('alert data values are stringified for FCM', () => {
  assertEquals(
    parsePushRequest({ emails: ['a@x.com'], title: 'T', body: 'B', data: { n: 2, s: 'x' } }),
    { kind: 'alert', emails: ['a@x.com'], sendToAll: false, title: 'T', body: 'B', data: { n: '2', s: 'x' }, platform: 'both' },
  );
});

Deno.test('iOS badge-only sets only the badge, as a low-priority alert-type push', () => {
  assertEquals(buildApnsRequest(badgeOnly, 0), {
    headers: { 'apns-push-type': 'alert', 'apns-priority': '5' },
    body: { aps: { badge: 0 }, type: 'badge_refresh', target: 'admin' },
  });
});

Deno.test('iOS alert keeps title, sound, badge, and data', () => {
  assertEquals(buildApnsRequest(alert, 3), {
    headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
    body: {
      aps: { alert: { title: 'Prayer approved', body: 'Body' }, sound: 'default', badge: 3 },
      type: 'prayer_approved',
      prayerId: '1',
    },
  });
});

Deno.test('Android badge-only is data-only so nothing is shown', () => {
  assertEquals(buildFcmMessage('tok', badgeOnly, 2), {
    token: 'tok',
    data: { type: 'badge_refresh', target: 'admin', badge: '2' },
    android: { priority: 'normal' },
  });
});

Deno.test('Android alert keeps the visible notification and count', () => {
  assertEquals(buildFcmMessage('tok', alert, 4), {
    token: 'tok',
    notification: { title: 'Prayer approved', body: 'Body' },
    data: { type: 'prayer_approved', prayerId: '1' },
    android: { priority: 'high', notification: { channelId: 'prayers', notification_count: 4 } },
  });
});

Deno.test('badge-only refuses an unknown badge instead of clearing the icon', () => {
  assertThrows(() => buildApnsRequest(badgeOnly, null));
  assertThrows(() => buildFcmMessage('tok', badgeOnly, null));
});

Deno.test('badge-only log rows have no text and are tagged badge_refresh', () => {
  assertEquals(logContent(badgeOnly), {
    title: null,
    body: null,
    data: { type: 'badge_refresh', target: 'admin' },
  });
});
