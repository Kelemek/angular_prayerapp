import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { planningCenterPeopleIncludeEmail } from './planning-center-email-match.ts';

Deno.test('planningCenterPeopleIncludeEmail matches login or primary email', () => {
  const people = [
    {
      attributes: {
        login_identifier: 'Other@Church.org',
        primary_email_address: 'not-the-one@church.org',
      },
    },
    {
      attributes: {
        login_identifier: null,
        primary_email_address: 'Ada@Church.org',
      },
    },
  ];
  assertEquals(planningCenterPeopleIncludeEmail(people, 'ada@church.org'), true);
  assertEquals(planningCenterPeopleIncludeEmail(people, 'other@church.org'), true);
  assertEquals(planningCenterPeopleIncludeEmail(people, 'missing@church.org'), false);
});
