import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertEmailSubscriberByEmail } from './user-settings-subscriber-upsert';

describe('upsertEmailSubscriberByEmail', () => {
  let client: SupabaseClient;

  beforeEach(() => {
    client = {
      from: vi.fn(),
    } as unknown as SupabaseClient;
  });

  it('updates an existing subscriber by id', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({ data: { id: 'sub-1' }, error: null }),
    );
    const updateEq = vi.fn(() => Promise.resolve({ error: null }));
    const update = vi.fn(() => ({ eq: updateEq }));
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));

    vi.mocked(client.from).mockReturnValue({
      select,
      update,
      insert: vi.fn(),
    } as never);

    await upsertEmailSubscriberByEmail(
      client,
      'user@example.com',
      { is_active: true },
      { is_active: false, name: 'Test' },
    );

    expect(update).toHaveBeenCalledWith({ is_active: true });
    expect(updateEq).toHaveBeenCalledWith('id', 'sub-1');
  });

  it('inserts when no subscriber exists', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));

    vi.mocked(client.from).mockReturnValue({
      select,
      update: vi.fn(),
      insert,
    } as never);

    await upsertEmailSubscriberByEmail(
      client,
      'user@example.com',
      { receive_push: true },
      { is_active: true, receive_push: true, name: 'Test' },
    );

    expect(insert).toHaveBeenCalledWith({
      email: 'user@example.com',
      is_active: true,
      receive_push: true,
      name: 'Test',
    });
  });
});
