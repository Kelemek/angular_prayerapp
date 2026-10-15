import { vi } from 'vitest';

type MockClient = {
  from: (table: string) => unknown;
  rpc?: (fn: string, args?: Record<string, unknown>) => Promise<unknown>;
};

export type GatedSupabaseServiceMock<T extends { client: MockClient }> = T & {
  getClientWhenReady: ReturnType<typeof vi.fn>;
  db: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

/** Attach gated PostgREST helpers to plain SupabaseService test doubles. */
export function wireGatedSupabaseMock<
  T extends { client: MockClient },
>(mock: T): GatedSupabaseServiceMock<T> {
  mock.getClientWhenReady = vi.fn(async () => mock.client);
  mock.db = vi.fn(async () => mock.client);
  mock.from = vi.fn(async (table: string) => mock.client.from(table));
  mock.rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => {
    if (mock.client.rpc) {
      return mock.client.rpc(fn, args);
    }
    return { data: null, error: null };
  });
  mock.getClient = vi.fn(() => mock.client);
  return mock;
}
