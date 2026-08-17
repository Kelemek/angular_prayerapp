import { describe, it, expect } from 'vitest';
import {
  buildPlanningCenterStatusMap,
  collectPendingEmailsForPcLookup,
  mapPendingUpdateRow,
  prayerStatusAfterApprovedUpdate,
} from './admin-data-map';

describe('admin-data-map', () => {
  it('collects unique emails from pending prayers and updates', () => {
    const emails = collectPendingEmailsForPcLookup(
      [{ id: '1', email: 'A@Example.com' } as never],
      [{ id: 'u1', author_email: 'b@example.com' } as never],
    );
    expect(emails).toEqual(['a@example.com', 'b@example.com']);
  });

  it('maps planning center flags from subscriber rows', () => {
    const map = buildPlanningCenterStatusMap([
      { email: 'a@example.com', in_planning_center: true },
      { email: 'b@example.com', in_planning_center: null },
    ]);
    expect(map.get('a@example.com')).toBe(true);
    expect(map.get('b@example.com')).toBe(false);
  });

  it('derives prayer status after update approval', () => {
    expect(prayerStatusAfterApprovedUpdate(true, 'current')).toBe('answered');
    expect(prayerStatusAfterApprovedUpdate(false, 'archived')).toBe('current');
    expect(prayerStatusAfterApprovedUpdate(false, 'current')).toBeNull();
  });

  it('maps pending updates with prayer title and PC flag', () => {
    const pc = new Map<string, boolean>([['author@example.com', true]]);
    const row = {
      id: 'u1',
      prayer_id: 'p1',
      content: 'Body',
      author: 'Jane',
      author_email: 'author@example.com',
      created_at: '2024-01-01',
      prayers: { title: 'Prayer title', email: 'author@example.com' },
    };
    const mapped = mapPendingUpdateRow(row, pc);
    expect(mapped.prayer_title).toBe('Prayer title');
    expect(mapped.in_planning_center).toBe(true);
  });
});
