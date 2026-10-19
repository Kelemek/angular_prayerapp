import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  escapeIlikeExactEmail,
  normalizeSubscriberEmailForQuery,
  normalizeSubscriberEmailsForQuery,
} from './safe-subscriber-email.ts';

Deno.test('normalizeSubscriberEmailForQuery accepts a plain address', () => {
  assertEquals(normalizeSubscriberEmailForQuery(' Friend@Example.com '), 'friend@example.com');
});

Deno.test('normalizeSubscriberEmailForQuery rejects filter metacharacters', () => {
  assertEquals(normalizeSubscriberEmailForQuery('%'), null);
  assertEquals(normalizeSubscriberEmailForQuery('a%@example.com'), null);
});

Deno.test('escapeIlikeExactEmail escapes wildcards', () => {
  assertEquals(escapeIlikeExactEmail('a_b%c@x.co'), 'a\\_b\\%c@x.co');
});

Deno.test('normalizeSubscriberEmailsForQuery dedupes valid addresses', () => {
  assertEquals(
    normalizeSubscriberEmailsForQuery(['a@b.co', 'A@b.co', 'bad', '%']),
    ['a@b.co'],
  );
});
