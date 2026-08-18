import type { UserSettingsFacade } from './user-settings-facade';

export async function syncMemorizationStrictModeToUserSession(
  host: UserSettingsFacade,
  email: string,
): Promise<void> {
  const currentSession = host.deps.userSessionService.getCurrentSession();
  if (currentSession) {
    await host.deps.userSessionService.updateUserSession({
      memorizationStrictMode: host.memorizationStrictMode,
    });
    return;
  }
  await host.deps.userSessionService.loadUserSession(email);
}

export async function runUserSettingsPreferencesLoad(
  host: UserSettingsFacade,
  emailAddress: string,
): Promise<void> {
  if (!emailAddress.trim()) {
    host.preferencesLoaded = true;
    host.memorizationStrictMode = false;
    host.memorizationStrictModeLoaded = true;
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailAddress)) {
    host.preferencesLoaded = true;
    host.memorizationStrictMode = false;
    host.memorizationStrictModeLoaded = true;
    return;
  }

  const normalizedEmail = emailAddress.toLowerCase().trim();

  try {
    const { data: subscriberData, error } = await host.deps.supabase.client
      .from('email_subscribers')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Error loading subscriber preferences:', error);
      host.receiveNotifications = true;
      host.receivePushNotifications = false;
      host.memorizationStrictMode = false;
      host.preferencesLoaded = true;
      host.memorizationStrictModeLoaded = true;
      return;
    }

    if (subscriberData) {
      if (subscriberData.name && subscriberData.name.trim()) {
        host.name = subscriberData.name;
      }
      host.receiveNotifications = subscriberData.is_active;
      host.receivePushNotifications = subscriberData.receive_push ?? false;
      host.memorizationStrictMode = subscriberData.memorization_strict_mode ?? false;
    } else {
      host.receiveNotifications = true;
      host.receivePushNotifications = false;
      host.memorizationStrictMode = false;
    }

    host.preferencesLoaded = true;
    host.memorizationStrictModeLoaded = true;
    await syncMemorizationStrictModeToUserSession(host, normalizedEmail);
    host.markForCheck();
  } catch (err) {
    console.error('Error loading preferences:', err);
    host.receiveNotifications = true;
    host.receivePushNotifications = false;
    host.memorizationStrictMode = false;
    host.preferencesLoaded = true;
    host.memorizationStrictModeLoaded = true;
  }
}
