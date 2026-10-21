import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import {
  decideChurchMemberCallerAccess,
  type ChurchMemberCallerFacts,
} from './reject-group-only-caller.ts';

function facts(
  overrides: Partial<ChurchMemberCallerFacts> & {
    subscriber?: ChurchMemberCallerFacts['subscriber'];
  },
): ChurchMemberCallerFacts {
  return {
    hasToken: true,
    envConfigured: true,
    getUserOk: true,
    email: 'user@church.org',
    subscriber: {
      is_church_member: true,
      is_blocked: false,
      is_admin: false,
    },
    ...overrides,
  };
}

Deno.test('no token is denied', () => {
  assertEquals(
    decideChurchMemberCallerAccess(facts({ hasToken: false })),
    { kind: 'deny', status: 401 },
  );
});

Deno.test('anon key getUser failure is denied', () => {
  assertEquals(
    decideChurchMemberCallerAccess(
      facts({ getUserOk: false, email: null, subscriber: null }),
    ),
    { kind: 'deny', status: 401 },
  );
});

Deno.test('valid JWT with no subscriber row is denied', () => {
  assertEquals(
    decideChurchMemberCallerAccess(facts({ subscriber: null })),
    { kind: 'deny', status: 403 },
  );
});

Deno.test('group-only JWT is denied', () => {
  assertEquals(
    decideChurchMemberCallerAccess(
      facts({
        subscriber: {
          is_church_member: false,
          is_blocked: false,
          is_admin: false,
        },
      }),
    ),
    { kind: 'deny', status: 403 },
  );
});

Deno.test('church-member JWT is allowed', () => {
  assertEquals(decideChurchMemberCallerAccess(facts({})), { kind: 'allow' });
});

Deno.test('admin JWT is allowed', () => {
  assertEquals(
    decideChurchMemberCallerAccess(
      facts({
        subscriber: {
          is_church_member: true,
          is_blocked: false,
          is_admin: true,
        },
      }),
    ),
    { kind: 'allow' },
  );
});
