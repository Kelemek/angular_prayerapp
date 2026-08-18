import { clampPrayerCooldownHours } from '../services/user-session.service';
import type { UserSettingsFacade } from './user-settings-facade';
import { syncMemorizationStrictModeToUserSession } from './user-settings-preferences-load';
import { upsertEmailSubscriberByEmail } from './user-settings-subscriber-upsert';

function requireUserSettingsEmail(host: UserSettingsFacade): string | null {
  const email = host.email.toLowerCase().trim();
  if (!email) {
    host.error = 'Email not found. Please log in again.';
    return null;
  }
  return email;
}

export async function runUserSettingsNotificationToggle(
  host: UserSettingsFacade,
): Promise<void> {
  const email = requireUserSettingsEmail(host);
  if (!email) {
    return;
  }

  host.savingNotification = true;
  host.error = null;
  host.success = null;

  try {
    console.log(
      'Toggling notification for email:',
      email,
      'to:',
      host.receiveNotifications,
    );

    const client = host.deps.supabase.client;
    const { data: existingSubscriber, error: fetchError } = await client
      .from('email_subscribers')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }

    console.log('Existing subscriber:', existingSubscriber);

    if (existingSubscriber) {
      console.log('Updating existing subscriber...');
      const { error: updateError } = await client
        .from('email_subscribers')
        .update({ is_active: host.receiveNotifications })
        .eq('id', existingSubscriber.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      console.log('Successfully updated subscriber');
    } else {
      console.log('Creating new subscriber...');
      const { error: insertError } = await client.from('email_subscribers').insert({
        email,
        is_active: host.receiveNotifications,
        name: host.name || '',
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      console.log('Successfully created subscriber');
    }

    host.success = `✅ Notifications ${
      host.receiveNotifications ? 'enabled' : 'disabled'
    } successfully!`;

    await host.deps.userSessionService.updateUserSession({
      isActive: host.receiveNotifications ?? true,
    });

    host.savingNotification = false;
    host.markForCheck();
    host.successNotification = host.receiveNotifications
      ? '✅ Prayer notifications enabled'
      : '✅ Prayer notifications disabled';
    setTimeout(() => {
      host.successNotification = null;
      host.markForCheck();
    }, 3000);
  } catch (err) {
    console.error('Error updating notification preference:', err);
    host.error =
      err instanceof Error ? err.message : 'Failed to update preference';
    host.receiveNotifications = !host.receiveNotifications;
    host.savingNotification = false;
    host.markForCheck();
  } finally {
    console.log('Setting saving to false');
  }
}

export async function runUserSettingsPushNotificationToggle(
  host: UserSettingsFacade,
): Promise<void> {
  const email = requireUserSettingsEmail(host);
  if (!email) {
    return;
  }

  host.savingPushNotification = true;
  host.error = null;
  host.successPushNotification = null;

  try {
    await upsertEmailSubscriberByEmail(
      host.deps.supabase.client,
      email,
      { receive_push: host.receivePushNotifications },
      {
        is_active: host.receiveNotifications ?? true,
        receive_push: host.receivePushNotifications ?? false,
        name: host.name || '',
      },
    );

    await host.deps.userSessionService.updateUserSession({
      receivePush: host.receivePushNotifications ?? false,
    });

    host.successPushNotification = host.receivePushNotifications
      ? '✅ Push notifications enabled'
      : '✅ Push notifications disabled';
    setTimeout(() => {
      host.successPushNotification = null;
      host.markForCheck();
    }, 3000);
  } catch (err) {
    console.error('Error updating push notification preference:', err);
    host.error =
      err instanceof Error ? err.message : 'Failed to update preference';
    host.receivePushNotifications = !host.receivePushNotifications;
    host.markForCheck();
  } finally {
    host.savingPushNotification = false;
    host.markForCheck();
  }
}

export async function runUserSettingsBadgeFunctionalityToggle(
  host: UserSettingsFacade,
): Promise<void> {
  const email = requireUserSettingsEmail(host);
  if (!email) {
    return;
  }

  host.savingBadge = true;
  host.error = null;
  host.success = null;

  try {
    await upsertEmailSubscriberByEmail(
      host.deps.supabase.client,
      email,
      { badge_functionality_enabled: host.badgeFunctionalityEnabled },
      { badge_functionality_enabled: host.badgeFunctionalityEnabled },
    );

    if (host.badgeFunctionalityEnabled) {
      host.markAllItemsAsRead();
      host.successBadge = '✅ Notification badges enabled';
    } else {
      host.successBadge = '✅ Notification badges disabled';
    }

    await host.deps.userSessionService.updateUserSession({
      badgeFunctionalityEnabled: host.badgeFunctionalityEnabled ?? false,
    });

    host.savingBadge = false;
    host.markForCheck();

    setTimeout(() => {
      host.successBadge = null;
      host.markForCheck();
    }, 3000);
  } catch (err) {
    console.error('Error updating badge preference:', err);
    host.error =
      err instanceof Error ? err.message : 'Failed to update badge preference';
    host.badgeFunctionalityEnabled = !host.badgeFunctionalityEnabled;
    host.savingBadge = false;
    host.markForCheck();
  } finally {
    host.savingBadge = false;
    host.markForCheck();
  }
}

export async function runUserSettingsMemorizationStrictModeToggle(
  host: UserSettingsFacade,
): Promise<void> {
  const email = requireUserSettingsEmail(host);
  if (!email) {
    return;
  }

  host.savingMemorizationStrictMode = true;
  host.error = null;
  host.successMemorizationStrictMode = null;

  try {
    await upsertEmailSubscriberByEmail(
      host.deps.supabase.client,
      email,
      { memorization_strict_mode: host.memorizationStrictMode },
      { memorization_strict_mode: host.memorizationStrictMode },
    );

    await syncMemorizationStrictModeToUserSession(host, email);

    host.successMemorizationStrictMode = host.memorizationStrictMode
      ? '✅ Strict memorization practice enabled'
      : '✅ Standard memorization practice enabled';

    host.savingMemorizationStrictMode = false;
    host.markForCheck();

    setTimeout(() => {
      host.successMemorizationStrictMode = null;
      host.markForCheck();
    }, 3000);
  } catch (err) {
    console.error('Error updating memorization strict mode:', err);
    host.error =
      err instanceof Error
        ? err.message
        : 'Failed to update memorization practice preference';
    host.memorizationStrictMode = !host.memorizationStrictMode;
    host.savingMemorizationStrictMode = false;
    host.markForCheck();
  }
}

export async function runUserSettingsShowPrayForButtonToggle(
  host: UserSettingsFacade,
): Promise<void> {
  const email = requireUserSettingsEmail(host);
  if (!email) {
    return;
  }
  const next = host.showPrayForButton ?? true;
  host.savingShowPrayForButton = true;
  host.error = null;
  host.successPrayerEncouragementUi = null;

  try {
    await upsertEmailSubscriberByEmail(
      host.deps.supabase.client,
      email,
      { show_pray_for_button: next },
      { name: host.name || '', show_pray_for_button: next },
    );

    await host.deps.userSessionService.updateUserSession({
      showPrayForButton: next,
    });
    host.successPrayerEncouragementUi = next
      ? 'Pray For button shown on cards'
      : 'Pray For button hidden on cards';
    setTimeout(() => {
      host.successPrayerEncouragementUi = null;
      host.markForCheck();
    }, 3000);
  } catch (err) {
    console.error('Error updating show Pray For preference:', err);
    host.error =
      err instanceof Error ? err.message : 'Failed to update preference';
    host.showPrayForButton = !next;
  } finally {
    host.savingShowPrayForButton = false;
    host.markForCheck();
  }
}

export async function runUserSettingsShowPrayingCountToggle(
  host: UserSettingsFacade,
): Promise<void> {
  const email = requireUserSettingsEmail(host);
  if (!email) {
    return;
  }
  const next = host.showPrayingCount ?? true;
  host.savingShowPrayingCount = true;
  host.error = null;
  host.successPrayerEncouragementUi = null;

  try {
    await upsertEmailSubscriberByEmail(
      host.deps.supabase.client,
      email,
      { show_praying_count: next },
      { name: host.name || '', show_praying_count: next },
    );

    await host.deps.userSessionService.updateUserSession({
      showPrayingCount: next,
    });
    host.successPrayerEncouragementUi = next
      ? 'Praying count shown when available'
      : 'Praying count hidden on cards';
    setTimeout(() => {
      host.successPrayerEncouragementUi = null;
      host.markForCheck();
    }, 3000);
  } catch (err) {
    console.error('Error updating show praying count preference:', err);
    host.error =
      err instanceof Error ? err.message : 'Failed to update preference';
    host.showPrayingCount = !next;
  } finally {
    host.savingShowPrayingCount = false;
    host.markForCheck();
  }
}

export async function runUserSettingsPersonalPrayerCooldownSave(
  host: UserSettingsFacade,
): Promise<void> {
  const email = requireUserSettingsEmail(host);
  if (!email) {
    return;
  }

  if (!host.personalPrayerCooldownEdited) {
    host.personalPrayerCooldownHours =
      host.deps.userSessionService.getPersonalPrayerCooldownHours();
    return;
  }

  const next = clampPrayerCooldownHours(host.personalPrayerCooldownHours);
  const current = host.deps.userSessionService.getPersonalPrayerCooldownHours();
  if (next === current) {
    host.personalPrayerCooldownHours = next;
    host.personalPrayerCooldownEdited = false;
    return;
  }

  host.personalPrayerCooldownHours = next;
  host.savingPersonalPrayerCooldown = true;
  host.error = null;
  host.successPrayerEncouragementUi = null;

  try {
    await upsertEmailSubscriberByEmail(
      host.deps.supabase.client,
      email,
      { personal_prayer_cooldown_hours: next },
      { name: host.name || '', personal_prayer_cooldown_hours: next },
    );

    await host.deps.userSessionService.updateUserSession({
      personalPrayerCooldownHours: next,
    });
    host.personalPrayerCooldownEdited = false;
    host.successPrayerEncouragementUi = `Personal / member / prompt cooldown set to ${next} ${
      next === 1 ? 'hour' : 'hours'
    }`;
    setTimeout(() => {
      host.successPrayerEncouragementUi = null;
      host.markForCheck();
    }, 3000);
  } catch (err) {
    console.error('Error updating personal prayer cooldown:', err);
    host.error =
      err instanceof Error ? err.message : 'Failed to update preference';
    host.personalPrayerCooldownHours = current;
  } finally {
    host.savingPersonalPrayerCooldown = false;
    host.markForCheck();
  }
}

export async function runUserSettingsDefaultViewChange(
  host: UserSettingsFacade,
  newView: 'current' | 'personal',
): Promise<void> {
  const email = requireUserSettingsEmail(host);
  if (!email) {
    return;
  }

  host.defaultPrayerView = newView;
  host.savingDefaultView = true;
  host.error = null;
  host.success = null;

  try {
    await upsertEmailSubscriberByEmail(
      host.deps.supabase.client,
      email,
      { default_prayer_view: newView },
      { default_prayer_view: newView },
    );

    host.successDefaultView = `✅ Default view set to ${
      newView === 'current' ? 'Current Prayers' : 'Personal Prayers'
    }`;

    await host.deps.userSessionService.updateUserSession({
      defaultPrayerView: newView,
    });

    host.savingDefaultView = false;
    host.markForCheck();

    setTimeout(() => {
      host.successDefaultView = null;
      host.markForCheck();
    }, 3000);
  } catch (err) {
    console.error('Error updating default view preference:', err);
    host.error =
      err instanceof Error
        ? err.message
        : 'Failed to update default view preference';
    host.defaultPrayerView =
      host.defaultPrayerView === 'current' ? 'personal' : 'current';
    host.savingDefaultView = false;
    host.markForCheck();
  }
}
