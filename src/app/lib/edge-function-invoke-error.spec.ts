import { describe, it, expect } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { messageFromFunctionsInvokeError } from './edge-function-invoke-error';

describe('messageFromFunctionsInvokeError', () => {
  it('reads error from FunctionsHttpError response body', async () => {
    const error = new FunctionsHttpError({
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    await expect(messageFromFunctionsInvokeError(error)).resolves.toBe('Unauthorized');
  });

  it('falls back to Error.message when body has no known fields', async () => {
    const error = new FunctionsHttpError({
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(messageFromFunctionsInvokeError(error)).resolves.toBe(
      'Edge Function returned a non-2xx status code'
    );
  });

  it('uses plain object message when not FunctionsHttpError', async () => {
    await expect(
      messageFromFunctionsInvokeError({ message: 'Function error' })
    ).resolves.toBe('Function error');
  });
});
