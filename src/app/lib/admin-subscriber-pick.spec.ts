import { describe, it, expect, vi } from 'vitest';
import {
  escapeForIlikePattern,
  fetchSubscriberPickRows,
  splitSubscriberName,
} from './admin-subscriber-pick';

describe('admin-subscriber-pick lib', () => {
  it('escapes ilike metacharacters', () => {
    expect(escapeForIlikePattern('100%_off')).toBe('100\\%\\_off');
  });

  it('splits subscriber display names into first and last', () => {
    expect(splitSubscriberName('Jane Marie Doe')).toEqual({
      firstName: 'Jane',
      lastName: 'Marie Doe',
    });
    expect(splitSubscriberName('Solo')).toEqual({ firstName: 'Solo', lastName: '' });
  });

  it('fetchSubscriberPickRows queries email_subscribers', async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ email: 'a@b.com', name: 'A B' }],
      error: null,
    });
    const order = vi.fn(() => ({ limit }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as never;

    const rows = await fetchSubscriberPickRows(client, 'ab');
    expect(from).toHaveBeenCalledWith('email_subscribers');
    expect(or).toHaveBeenCalledWith('email.ilike.%ab%,name.ilike.%ab%');
    expect(rows).toEqual([{ email: 'a@b.com', name: 'A B' }]);
  });
});
