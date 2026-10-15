import type { SupabaseClient } from '@supabase/supabase-js';
import { jwtEmailFromSession } from './supabase-jwt-readiness';

/**
 * Bearer token for raw PostgREST fetch calls. Prefers the user JWT; falls back to anon key
 * only when there is no session (e.g. login page branding).
 */
export async function resolveSupabaseRestBearer(
  client: SupabaseClient,
  anonKey: string
): Promise<string> {
  const sessionResult = await client.auth.getSession();
  const session = sessionResult?.data?.session ?? null;
  const token = session?.access_token?.trim();
  if (token && jwtEmailFromSession(session)) {
    return token;
  }
  return anonKey;
}

/** Headers for raw PostgREST `fetch` calls (anon apikey + user JWT when signed in). */
export function supabaseRestJsonHeaders(
  anonKey: string,
  authorizationBearer: string,
): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${authorizationBearer}`,
    'Content-Type': 'application/json',
  };
}
