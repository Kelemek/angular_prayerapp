import { describe, expect, it, vi } from 'vitest';
import { commandDeleteEmailSubscriber } from './admin-email-subscribers-commands';

describe('commandDeleteEmailSubscriber', () => {
  it('removes the subscriber and their sign-in in one database call', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { rpc } as never;

    await commandDeleteEmailSubscriber(client, '11111111-1111-4111-8111-111111111111');

    expect(rpc).toHaveBeenCalledWith('admin_delete_email_subscriber', {
      p_subscriber_id: '11111111-1111-4111-8111-111111111111',
    });
  });
});
