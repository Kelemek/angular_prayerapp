import { describe, expect, it, vi } from 'vitest';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { AdminDataReadService } from './admin-data-read.service';
import type { SupabaseService } from './supabase.service';

interface HeadCall {
  table: string;
  columns: string;
  count: string | undefined;
  head: boolean | undefined;
  column: string;
  value: string;
}

function pendingCountClient(
  counts: Record<string, number | null>,
  errorTable?: string,
): { client: { from: ReturnType<typeof vi.fn> }; calls: HeadCall[] } {
  const calls: HeadCall[] = [];
  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns: string, options: { count?: string; head?: boolean }) => ({
        eq: vi.fn((column: string, value: string) => {
          calls.push({
            table,
            columns,
            count: options?.count,
            head: options?.head,
            column,
            value,
          });
          if (table === errorTable) {
            return Promise.resolve({
              count: null,
              error: { message: `${table} failed` },
              data: null,
            });
          }
          const count = Object.prototype.hasOwnProperty.call(counts, table) ? counts[table] : 0;
          return Promise.resolve({ count, error: null, data: null });
        }),
      })),
    })),
  };
  return { client, calls };
}

describe('AdminDataReadService.fetchPendingCounts', () => {
  it('issues five head-only pending counts and treats a null count as 0', async () => {
    const { client, calls } = pendingCountClient({
      prayers: null,
      prayer_updates: 2,
      deletion_requests: 1,
      update_deletion_requests: 0,
      account_approval_requests: 4,
    });
    const supabase = wireGatedSupabaseMock({ client }) as unknown as SupabaseService;
    const service = new AdminDataReadService(supabase);

    await expect(service.fetchPendingCounts()).resolves.toEqual({
      prayers: 0,
      updates: 2,
      deletionRequests: 1,
      updateDeletionRequests: 0,
      accountRequests: 4,
    });

    expect(calls.map((call) => call.table).sort()).toEqual([
      'account_approval_requests',
      'deletion_requests',
      'prayer_updates',
      'prayers',
      'update_deletion_requests',
    ]);
    for (const call of calls) {
      expect(call.head).toBe(true);
      expect(call.count).toBe('exact');
      expect(call.column).toBe('approval_status');
      expect(call.value).toBe('pending');
    }
    expect(calls.find((call) => call.table === 'prayer_updates')?.columns).toContain('prayers!inner');
    expect(calls.find((call) => call.table === 'deletion_requests')?.columns).toContain(
      'prayers!inner',
    );
    expect(calls.find((call) => call.table === 'update_deletion_requests')?.columns).not.toContain(
      '!inner',
    );
  });

  it('throws when any pending count query fails', async () => {
    const { client, calls } = pendingCountClient({}, 'deletion_requests');
    const supabase = wireGatedSupabaseMock({ client }) as unknown as SupabaseService;
    const service = new AdminDataReadService(supabase);

    await expect(service.fetchPendingCounts()).rejects.toEqual({
      message: 'deletion_requests failed',
    });
    expect(calls).toHaveLength(5);
  });
});
