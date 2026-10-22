import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

export const MIN15 = '15 minutes';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

export class PolicyError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
  }
}

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

function rpcErrorStatus(message: string): number {
  return message.includes('Not authorized') ? 403 : 500;
}

/** true when the subject is still inside the budget. */
export async function consumeRateLimit(
  admin: SupabaseClient,
  bucket: string,
  subject: string,
  max: number,
  window = MIN15,
): Promise<boolean> {
  const { data, error } = (await admin.rpc('consume_rate_limit', {
    p_bucket: bucket,
    p_subject: subject,
    p_max: max,
    p_window: window,
  })) as RpcResult;
  if (error) {
    throw new PolicyError(rpcErrorStatus(error.message), error.message || 'Rate limit failed');
  }
  return data === true;
}

export function policyErrorToResponse(error: unknown): Response {
  if (error instanceof PolicyError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.httpStatus,
      headers: corsHeaders,
    });
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return new Response(JSON.stringify({ error: message }), {
    status: rpcErrorStatus(message),
    headers: corsHeaders,
  });
}
