import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import {
  createLoginLookupRateLimiter,
  decidePlanningCenterLookupMode,
  loginLookupBooleanResult,
  parsePlanningCenterLookupBody,
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

Deno.test('login lookup rate limiter trips after max attempts', () => {
  const limiter = createLoginLookupRateLimiter(60_000, 2);
  assertEquals(limiter.isLimited('ip:a@b.com'), false);
  limiter.record('ip:a@b.com');
  limiter.record('ip:a@b.com');
  assertEquals(limiter.isLimited('ip:a@b.com'), true);
});
