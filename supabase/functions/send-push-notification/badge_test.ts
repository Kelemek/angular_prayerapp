import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { computeIconBadge, type IconBadgeReport } from './badge.ts';

const reported = (unread: number, badgesEnabled: boolean): IconBadgeReport => ({
  unread,
  badgesEnabled,
  reportedAt: '2026-10-28T00:00:00.000Z',
});

Deno.test('never reported omits the badge', () => {
  assertEquals(computeIconBadge(null, true, 4, 9), null);
});

Deno.test('badges off ignores unread and newSince', () => {
  assertEquals(computeIconBadge(reported(5, false), false, 3, 8), 0);
});

Deno.test('admin adds pending', () => {
  assertEquals(computeIconBadge(reported(1, true), true, 2, 4), 7);
});

Deno.test('badges off still adds pending for an admin', () => {
  assertEquals(computeIconBadge(reported(5, false), true, 3, 4), 4);
});

Deno.test('non-admin ignores pending', () => {
  assertEquals(computeIconBadge(reported(1, true), false, 2, 4), 3);
});

Deno.test('negative inputs clamp to 0', () => {
  assertEquals(computeIconBadge(reported(-3, true), false, -2, 9), 0);
});
