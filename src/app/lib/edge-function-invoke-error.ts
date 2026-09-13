import { FunctionsHttpError } from '@supabase/supabase-js';

function messageFromInvokeErrorBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const record = body as { error?: unknown; details?: unknown; message?: unknown };
  for (const value of [record.error, record.details, record.message]) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/** Prefer JSON body from FunctionsHttpError.context over the generic invoke message. */
export async function messageFromFunctionsInvokeError(
  error: unknown,
  fallback = 'Failed to submit feedback'
): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context) {
    try {
      const body = await error.context.json();
      const fromBody = messageFromInvokeErrorBody(body);
      if (fromBody) {
        return fromBody;
      }
    } catch {
      // Response body may not be JSON
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fallback;
}
