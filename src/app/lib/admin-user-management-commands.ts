import type { SupabaseClient } from '@supabase/supabase-js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AddAdminValidationResult =
  | { ok: true; email: string; name: string }
  | { ok: false; error: string };

export function validateAddAdminInput(
  email: string,
  name: string,
): AddAdminValidationResult {
  if (!email.trim() || !name.trim()) {
    return { ok: false, error: 'Email and name are required' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }
  return {
    ok: true,
    email: email.toLowerCase().trim(),
    name: name.trim(),
  };
}

export async function adminUserAlreadyExists(
  client: SupabaseClient,
  email: string,
): Promise<boolean> {
  const { data } = await client
    .from('email_subscribers')
    .select('email')
    .eq('email', email)
    .eq('is_admin', true)
    .maybeSingle();
  return Boolean(data);
}

export async function upsertAdminUser(
  client: SupabaseClient,
  email: string,
  name: string,
): Promise<void> {
  const { error } = await client.from('email_subscribers').upsert(
    {
      email,
      name,
      is_admin: true,
      is_active: true,
      receive_admin_push: true,
    },
    { onConflict: 'email' },
  );
  if (error) throw error;
}

export async function removeAdminAccess(
  client: SupabaseClient,
  email: string,
): Promise<void> {
  const { error } = await client
    .from('email_subscribers')
    .update({ is_admin: false })
    .eq('email', email);
  if (error) throw error;
}

export async function toggleAdminReceiveEmails(
  client: SupabaseClient,
  email: string,
  currentStatus: boolean,
): Promise<boolean> {
  const next = !currentStatus;
  const { error } = await client
    .from('email_subscribers')
    .update({ receive_admin_emails: next })
    .eq('email', email);
  if (error) throw error;
  return next;
}

export async function toggleAdminReceivePush(
  client: SupabaseClient,
  email: string,
  currentStatus: boolean,
): Promise<boolean> {
  const next = !currentStatus;
  const { error } = await client
    .from('email_subscribers')
    .update({ receive_admin_push: next })
    .eq('email', email);
  if (error) throw error;
  return next;
}
