/** When Supabase emits no session but MFA email remains, try relink before signing out. */
export async function relinkMfaAfterSupabaseSessionCleared(deps: {
  mfaEmail: string;
  ensureSubscriberAuthOnLoad: (email: string) => Promise<boolean>;
  refreshDataAccessReady: () => Promise<void>;
  hasSupabaseJwt: () => Promise<boolean>;
  isUserAuthenticated: () => boolean;
  logout: () => Promise<void>;
}): Promise<void> {
  await deps.ensureSubscriberAuthOnLoad(deps.mfaEmail);
  await deps.refreshDataAccessReady();
  if (!(await deps.hasSupabaseJwt()) && deps.isUserAuthenticated()) {
    console.warn(
      '[AdminAuth] Supabase session ended without JWT; signing out'
    );
    await deps.logout();
  }
}
