import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type MintSubscriberMagicLinkResult =
  | { ok: true; hashed_token: string; email: string }
  | { ok: false; status: number; error: string };

export async function assertActiveEmailSubscriber(
  supabase: SupabaseClient,
  emailNormalized: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: subscriber, error: subError } = await supabase
    .from('email_subscribers')
    .select('email, is_blocked')
    .eq('email', emailNormalized)
    .maybeSingle();

  if (subError || !subscriber || subscriber.is_blocked === true) {
    return { ok: false, status: 403, error: 'Subscriber not found' };
  }

  return { ok: true };
}

export async function mintSubscriberMagicLinkToken(
  supabase: SupabaseClient,
  emailNormalized: string
): Promise<MintSubscriberMagicLinkResult> {
  const subscriberCheck = await assertActiveEmailSubscriber(
    supabase,
    emailNormalized
  );
  if (!subscriberCheck.ok) {
    return subscriberCheck;
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email: emailNormalized,
    email_confirm: true,
  });
  if (createError && !/already|exists|registered/i.test(createError.message)) {
    console.error('mintSubscriberMagicLinkToken createUser failed:', createError);
    return { ok: false, status: 500, error: 'Unable to link account' };
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: emailNormalized,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('mintSubscriberMagicLinkToken generateLink failed:', linkError);
    return { ok: false, status: 500, error: 'Unable to link account' };
  }

  return {
    ok: true,
    hashed_token: linkData.properties.hashed_token,
    email: emailNormalized,
  };
}
