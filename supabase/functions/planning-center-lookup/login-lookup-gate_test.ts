import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import {
  decidePlanningCenterLookupMode,
  loginLookupBooleanResult,
  parsePlanningCenterLookupBody,
  trustedClientAddress,
} from './login-lookup-gate.ts';

Deno.test('resume token selects boolean login mode', () => {
  const parsed = parsePlanningCenterLookupBody({
    email: 'User@Church.org',
    auth_resume_token: ' signed.token ',
  });
  if ('kind' in parsed) {
    throw new Error('expected parsed body');
  }
  assertEquals(parsed.email, 'user@church.org');
  assertEquals(
    decidePlanningCenterLookupMode(parsed),
    {
      kind: 'login',
      email: 'user@church.org',
      resumeToken: 'signed.token',
    },
  );
});

Deno.test('missing resume token selects church JWT mode', () => {
  const parsed = parsePlanningCenterLookupBody({ email: 'a@b.com' });
  if ('kind' in parsed) {
    throw new Error('expected parsed body');
  }
  assertEquals(decidePlanningCenterLookupMode(parsed), {
    kind: 'church',
    email: 'a@b.com',
  });
});

Deno.test('login lookup never returns people', () => {
  assertEquals(loginLookupBooleanResult(true), { count: 1, people: [] });
  assertEquals(loginLookupBooleanResult(false), { count: 0, people: [] });
});

Deno.test('cf-connecting-ip wins over forwarded hops', () => {
  const req = new Request('https://example.test', {
    headers: {
      'cf-connecting-ip': ' 203.0.113.9 ',
      'x-forwarded-for': '1.1.1.1, 198.51.100.4',
    },
  });
  assertEquals(trustedClientAddress(req), '203.0.113.9');
});

Deno.test('last forwarded hop is used when cf-connecting-ip is empty', () => {
  const req = new Request('https://example.test', {
    headers: {
      'cf-connecting-ip': ' ',
      'x-forwarded-for': 'spoofed, 198.51.100.4',
    },
  });
  assertEquals(trustedClientAddress(req), '198.51.100.4');
});

Deno.test('x-real-ip is the fallback before unknown', () => {
  const req = new Request('https://example.test', {
    headers: { 'x-real-ip': ' 192.0.2.10 ' },
  });
  assertEquals(trustedClientAddress(req), '192.0.2.10');
  assertEquals(trustedClientAddress(new Request('https://example.test')), 'unknown');
});
