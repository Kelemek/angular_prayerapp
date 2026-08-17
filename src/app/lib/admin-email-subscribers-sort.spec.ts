import { describe, it, expect } from 'vitest';
import {
  emailSubscriberSortIndicator,
  nextEmailSubscriberSort,
  sortEmailSubscriberRows,
} from './admin-email-subscribers-sort';
import type { EmailSubscriberRow } from './admin-email-subscribers';

describe('admin-email-subscribers-sort', () => {
  const row = (email: string): EmailSubscriberRow => ({
    id: email,
    name: 'Name',
    email,
    is_active: true,
    is_blocked: false,
    created_at: '2024-01-01T00:00:00Z',
  });

  it('sorts rows by email descending', () => {
    const sorted = sortEmailSubscriberRows(
      [row('a@example.com'), row('b@example.com')],
      'email',
      'desc',
    );
    expect(sorted[0].email).toBe('b@example.com');
  });

  it('toggles sort direction for the same column', () => {
    expect(nextEmailSubscriberSort('name', 'asc', 'name')).toEqual({
      sortBy: 'name',
      sortDirection: 'desc',
    });
    expect(nextEmailSubscriberSort('email', 'asc', 'last_activity_date')).toEqual({
      sortBy: 'last_activity_date',
      sortDirection: 'desc',
    });
  });

  it('builds sort indicators', () => {
    expect(emailSubscriberSortIndicator('name', 'asc', 'name')).toBe(' ↑');
    expect(emailSubscriberSortIndicator('name', 'asc', 'email')).toBe('');
  });
});
