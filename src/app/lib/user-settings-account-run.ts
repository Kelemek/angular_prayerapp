import type { UserSettingsFacade } from './user-settings-facade';

export function closeUserSettingsDeleteAccountVerification(host: UserSettingsFacade): void {
  if (!host.deletingAccount) {
    host.showDeleteAccountVerification = false;
    host.error = null;
    host.markForCheck();
  }
}

function accountEmail(host: UserSettingsFacade): string {
  return host.email?.toLowerCase?.()?.trim?.() || host.email?.trim?.() || '';
}

async function runUserSettingsDeleteAccount(
  host: UserSettingsFacade,
  deletePrayers: boolean,
): Promise<void> {
  if (!accountEmail(host)) {
    host.error = 'Could not determine your email. Please try again.';
    host.markForCheck();
    return;
  }
  host.deletingAccount = true;
  host.error = null;
  host.markForCheck();
  try {
    const { error } = await host.deps.supabase.client.rpc('delete_own_subscriber_account', {
      p_delete_prayers: deletePrayers,
    });
    if (error) {
      throw error;
    }
    host.showDeleteAccountVerification = false;
    host.deletingAccount = false;
    host.markForCheck();
    await runUserSettingsLogout(host);
  } catch {
    host.deletingAccount = false;
    host.error = 'Could not delete account. Please try again.';
    host.showDeleteAccountVerification = false;
    host.markForCheck();
  }
}

export function runUserSettingsDeleteAccountKeepPrayers(
  host: UserSettingsFacade,
): Promise<void> {
  return runUserSettingsDeleteAccount(host, false);
}

export function runUserSettingsDeleteAccountAndPrayers(
  host: UserSettingsFacade,
): Promise<void> {
  return runUserSettingsDeleteAccount(host, true);
}

export async function runUserSettingsLogout(host: UserSettingsFacade): Promise<void> {
  await host.deps.adminAuthService.logout();
}
