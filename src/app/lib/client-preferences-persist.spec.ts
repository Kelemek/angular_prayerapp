import { describe, expect, it, vi } from 'vitest';
import { persistClientPreferencesByEmail } from './client-preferences-persist';

describe('persistClientPreferencesByEmail', () => {
  it('updates by email and skips insert when a row was updated', async () => {
    const update = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ email: 'user@example.com' }],
        error: null,
      }),
    });
    const insert = vi.fn();
    const client = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: update,
        }),
        insert,
      }),
    };

    await persistClientPreferencesByEmail(
      client as never,
      'User@Example.com',
      { theme: 'dark' }
    );

    expect(update).toHaveBeenCalledWith('email', 'user@example.com');
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserts when update matches no rows', async () => {
    const update = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: update,
        }),
        insert,
      }),
    };

    await persistClientPreferencesByEmail(
      client as never,
      'user@example.com',
      { theme: 'dark' }
    );

    expect(insert).toHaveBeenCalled();
  });

  it('ignores unique violation on insert', async () => {
    const update = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const insert = vi.fn().mockResolvedValue({ error: { code: '23505' } });
    const client = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: update,
        }),
        insert,
      }),
    };

    await persistClientPreferencesByEmail(
      client as never,
      'user@example.com',
      { theme: 'dark' }
    );

    expect(insert).toHaveBeenCalled();
  });
});
