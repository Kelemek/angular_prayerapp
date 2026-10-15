import type { SupabaseClient } from '@supabase/supabase-js';

export function jwtEmailFromSession(
  session: { user?: { email?: string | null } } | null | undefined
): string {
  return session?.user?.email?.toLowerCase().trim() ?? '';
}

export async function hasSupabaseJwtSession(client: SupabaseClient): Promise<boolean> {
  const {
    data: { session },
  } = await client.auth.getSession();
  return jwtEmailFromSession(session) !== '';
}

/** Signed-in users need a Supabase JWT before PostgREST reads; logged-out callers do not wait. */
export function supabaseDataAccessReady(
  isAuthenticated: boolean,
  hasJwt: boolean
): boolean {
  if (!isAuthenticated) {
    return true;
  }
  return hasJwt;
}
