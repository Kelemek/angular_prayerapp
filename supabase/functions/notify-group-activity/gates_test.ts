import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { assertRejects } from 'https://deno.land/std@0.224.0/assert/assert_rejects.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { consumeRateLimit, PolicyError } from '../shared/policy-rpc.ts';
import {
  assertInviteSendable,
  claimNotifyRecipients,
  enqueueClaimedGroupMail,
} from './gates.ts';

const PRAYER_ID = '11111111-1111-1111-1111-111111111111';
const SENTINEL = '00000000-0000-0000-0000-000000000000';

function client(
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>,
  inserts: string[] = [],
): SupabaseClient {
  return {
    rpc,
    from() {
      return {
        insert(row: { recipient: string }) {
          inserts.push(row.recipient);
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
}

Deno.test('missing invite is not authorized', async () => {
  const admin = client(() =>
    Promise.resolve({ data: null, error: { message: 'Not authorized' } })
  );
  const error = await assertRejects(
    () => assertInviteSendable(admin, 'group-1', 'owner@x.org', 'missing@x.org'),
    PolicyError,
  );
  assertEquals((error as PolicyError).httpStatus, 403);
});

Deno.test('other-group invite is not authorized', async () => {
  const admin = client(() =>
    Promise.resolve({ data: null, error: { message: 'Not authorized' } })
  );
  const error = await assertRejects(
    () => assertInviteSendable(admin, 'other-group', 'owner@x.org', 'member@x.org'),
    PolicyError,
  );
  assertEquals((error as PolicyError).httpStatus, 403);
});

Deno.test('consume_rate_limit false is over the budget', async () => {
  const admin = client(() => Promise.resolve({ data: false, error: null }));
  assertEquals(
    await consumeRateLimit(admin, 'invite_owner', 'owner@x.org', 10),
    false,
  );
});

Deno.test('duplicate notify does not queue a second row', async () => {
  const claimed = new Set<string>();
  const inserts: string[] = [];
  const admin = client((_fn, args) => {
    const recipient = String((args as { p_recipient: string }).p_recipient);
    if (claimed.has(recipient)) {
      return Promise.resolve({ data: false, error: null });
    }
    claimed.add(recipient);
    return Promise.resolve({ data: true, error: null });
  }, inserts);

  const first = await enqueueClaimedGroupMail(admin, {
    kind: 'prayer_added',
    prayerId: PRAYER_ID,
    updateId: SENTINEL,
    recipients: ['a@x.org'],
    templateKey: 'group_prayer_added',
    templateVariables: {},
  });
  const second = await enqueueClaimedGroupMail(admin, {
    kind: 'prayer_added',
    prayerId: PRAYER_ID,
    updateId: SENTINEL,
    recipients: ['a@x.org'],
    templateKey: 'group_prayer_added',
    templateVariables: {},
  });

  assertEquals(first.queued, 1);
  assertEquals(second.queued, 0);
  assertEquals(inserts, ['a@x.org']);
});

Deno.test('notify claim is once per recipient for email and push', async () => {
  const claimed = new Set<string>();
  const admin = client((_fn, args) => {
    const recipient = String((args as { p_recipient: string }).p_recipient);
    if (claimed.has(recipient)) {
      return Promise.resolve({ data: false, error: null });
    }
    claimed.add(recipient);
    return Promise.resolve({ data: true, error: null });
  });

  const first = await claimNotifyRecipients(
    admin,
    'prayer_added',
    PRAYER_ID,
    SENTINEL,
    ['a@x.org', 'b@x.org'],
  );
  const second = await claimNotifyRecipients(
    admin,
    'prayer_added',
    PRAYER_ID,
    SENTINEL,
    ['a@x.org', 'b@x.org'],
  );

  assertEquals(first, ['a@x.org', 'b@x.org']);
  assertEquals(second, []);
});
