import { interpretPersonalCategoryRpcMutation } from './prayer-personal-category';

export type PersonalCategoryMutationRpcResult =
  | { ok: true; logMessage?: string }
  | { ok: false; shouldFallback: true }
  | { ok: false; shouldFallback: false; message: string };

export async function runPersonalCategoryMutationRpc(
  rpcCall: () => Promise<{ data: unknown; error: unknown }>,
  failureMessage = 'Personal category mutation failed'
): Promise<PersonalCategoryMutationRpcResult> {
  const { data, error } = await rpcCall();

  if (error) {
    return { ok: false, shouldFallback: true };
  }

  const rpcResult = interpretPersonalCategoryRpcMutation(data);
  if (!rpcResult.ok) {
    return {
      ok: false,
      shouldFallback: false,
      message: rpcResult.message ?? failureMessage,
    };
  }

  return { ok: true, logMessage: rpcResult.logMessage };
}

export function logPersonalCategoryRpcMessage(logMessage: string | undefined): void {
  if (logMessage) {
    console.log('[PrayerService]', logMessage);
  }
}
