import type { UserSettingsFacade } from './user-settings-facade';

export function closeUserSettingsDeleteAccountVerification(host: UserSettingsFacade): void {
  if (!host.deletingAccount) {
    host.showDeleteAccountVerification = false;
    host.error = null;
    host.markForCheck();
  }
}

export async function runUserSettingsDeleteAccountKeepPrayers(
  host: UserSettingsFacade,
): Promise<void> {
  const email =
    host.email?.toLowerCase?.()?.trim?.() || host.email?.trim?.() || '';
  if (!email) {
    host.error = 'Could not determine your email. Please try again.';
    host.markForCheck();
    return;
  }
  host.deletingAccount = true;
  host.error = null;
  host.markForCheck();
  try {
    const { error } = await host.deps.supabase.client
      .from('email_subscribers')
      .delete()
      .eq('email', email);
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

export async function runUserSettingsDeleteAccountAndPrayers(
  host: UserSettingsFacade,
): Promise<void> {
  const email =
    host.email?.toLowerCase?.()?.trim?.() || host.email?.trim?.() || '';
  if (!email) {
    host.error = 'Could not determine your email. Please try again.';
    host.markForCheck();
    return;
  }
  host.deletingAccount = true;
  host.error = null;
  host.markForCheck();
  try {
    const client = host.deps.supabase.client;
    const { error: err1 } = await client
      .from('prayer_updates')
      .delete()
      .eq('author_email', email);
    if (err1) {
      throw err1;
    }
    const { error: err2 } = await client.from('prayers').delete().eq('email', email);
    if (err2) {
      throw err2;
    }
    const { error: err3 } = await client
      .from('personal_prayers')
      .delete()
      .eq('user_email', email);
    if (err3) {
      throw err3;
    }
    const { error: err4 } = await client
      .from('email_subscribers')
      .delete()
      .eq('email', email);
    if (err4) {
      throw err4;
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

export async function runUserSettingsLogout(host: UserSettingsFacade): Promise<void> {
  await host.deps.adminAuthService.logout();
}
