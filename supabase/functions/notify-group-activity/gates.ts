import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import type { GroupActivityNotifyKind } from './plan.ts';
import { PolicyError } from '../shared/policy-rpc.ts';

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export async function assertInviteSendable(
  admin: SupabaseClient,
  groupId: string,
  owner: string,
  email: string,
): Promise<void> {
  const { error } = (await admin.rpc('assert_group_invite_sendable', {
    p_group_id: groupId,
    p_owner: owner,
    p_email: email,
  })) as RpcResult;
  if (!error) {
    return;
  }
  const message = error.message || 'Not authorized';
  throw new PolicyError(message.includes('Not authorized') ? 403 : 500, message);
}

export async function claimNotify(
  admin: SupabaseClient,
  kind: GroupActivityNotifyKind,
  prayerId: string,
  updateId: string,
  recipient: string,
): Promise<boolean> {
  const { data, error } = (await admin.rpc('claim_group_activity_notify', {
    p_kind: kind,
    p_prayer_id: prayerId,
    p_update_id: updateId,
    p_recipient: recipient,
  })) as RpcResult;
  if (error) {
    const message = error.message || 'Notify claim failed';
    throw new PolicyError(message.includes('Not authorized') ? 403 : 500, message);
  }
  return data === true;
}

export async function claimNotifyRecipients(
  admin: SupabaseClient,
  kind: GroupActivityNotifyKind,
  prayerId: string,
  updateId: string,
  recipients: readonly string[],
): Promise<string[]> {
  const claimed: string[] = [];
  for (const recipient of recipients) {
    if (await claimNotify(admin, kind, prayerId, updateId, recipient)) {
      claimed.push(recipient);
    }
  }
  return claimed;
}

export async function insertGroupMail(
  admin: SupabaseClient,
  input: {
    recipients: readonly string[];
    templateKey: string;
    templateVariables: Record<string, unknown>;
  },
): Promise<{ queued: number; error: string | null }> {
  let queued = 0;
  for (const recipient of input.recipients) {
    const { error } = await admin.from('email_queue').insert({
      recipient,
      template_key: input.templateKey,
      template_variables: input.templateVariables,
      status: 'pending',
      attempts: 0,
    });
    if (error) {
      return { queued, error: error.message };
    }
    queued += 1;
  }
  return { queued, error: null };
}

export async function enqueueClaimedGroupMail(
  admin: SupabaseClient,
  input: {
    kind: GroupActivityNotifyKind;
    prayerId: string;
    updateId: string;
    recipients: string[];
    templateKey: string;
    templateVariables: Record<string, unknown>;
  },
): Promise<{ queued: number; error: string | null }> {
  const claimed = await claimNotifyRecipients(
    admin,
    input.kind,
    input.prayerId,
    input.updateId,
    input.recipients,
  );
  return insertGroupMail(admin, {
    recipients: claimed,
    templateKey: input.templateKey,
    templateVariables: input.templateVariables,
  });
}
