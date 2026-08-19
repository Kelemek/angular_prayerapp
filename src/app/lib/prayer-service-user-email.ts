export const MFA_AUTHENTICATED_EMAIL_STORAGE_KEY = 'mfa_authenticated_email';

export type PrayerServiceSessionReader = () => Promise<{
  data: { session: { user: { email?: string | null } } | null };
}>;

export async function resolvePrayerServiceUserEmail(
  getSession: PrayerServiceSessionReader,
  readMfaEmail: () => string | null = () =>
    localStorage.getItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY)
): Promise<string | null> {
  try {
    const { data: { session } } = await getSession();
    if (session?.user?.email) {
      return session.user.email;
    }
  } catch (error) {
    console.error('Error getting session:', error);
  }

  const mfaEmail = readMfaEmail();
  return mfaEmail || null;
}
