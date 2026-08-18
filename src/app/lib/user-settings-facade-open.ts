import type { SimpleChanges } from '@angular/core';
import type { ThemeOption } from './user-settings-types';
import type { UserSettingsFacade } from './user-settings-facade';
import { runUserSettingsPreferencesLoad } from './user-settings-preferences-load';
import {
  runUserSettingsLoadPersonalCategories,
  runUserSettingsLoadPromptTypes,
} from './user-settings-print';
import {
  getUserSettingsDisplayName,
  getUserSettingsUserInfo,
} from './user-settings-user-info';

export function scheduleUserSettingsScrollToSection(host: UserSettingsFacade): void {
  if (!host.scrollToSectionId) {
    return;
  }
  if (host.scrollToSectionTimer) {
    clearTimeout(host.scrollToSectionTimer);
  }
  const sectionId = host.scrollToSectionId;
  host.scrollToSectionTimer = setTimeout(() => {
    host.scrollToSectionTimer = null;
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    host.deps.emitScrollToSectionComplete?.();
  }, 200);
}

export function runUserSettingsOpenChange(
  host: UserSettingsFacade,
  changes: SimpleChanges,
): void {
  if (changes['isOpen'] && host.isOpen) {
    host.theme = host.deps.themeService.getTheme() as ThemeOption;
    host.textSize = host.deps.textSizeService.getTextSize();
    void runUserSettingsLoadPromptTypes(host);
    void runUserSettingsLoadPersonalCategories(host);

    host.isInitialLoad = true;
    host.personalPrayerCooldownEdited = false;
    host.preferencesLoaded = false;
    host.badgePreferencesLoaded = false;
    host.prayerEncouragementUiLoaded = false;
    host.defaultViewPreferencesLoaded = false;
    host.memorizationStrictModeLoaded = false;

    const userSession = host.deps.userSessionService.getCurrentSession();
    if (userSession) {
      host.email = userSession.email;
      host.name = userSession.fullName || '';
      host.receiveNotifications = userSession.isActive ?? true;
      host.receivePushNotifications = userSession.receivePush ?? false;
      host.preferencesLoaded = true;
      host.badgeFunctionalityEnabled =
        userSession.badgeFunctionalityEnabled ?? false;
      host.badgePreferencesLoaded = true;
      host.showPrayForButton = userSession.showPrayForButton ?? true;
      host.showPrayingCount = userSession.showPrayingCount ?? true;
      host.personalPrayerCooldownHours =
        userSession.personalPrayerCooldownHours ?? 4;
      host.prayerEncouragementUiLoaded = true;
      host.defaultPrayerView = userSession.defaultPrayerView || 'current';
      host.defaultViewPreferencesLoaded = true;
      host.memorizationStrictMode = userSession.memorizationStrictMode ?? false;
      host.memorizationStrictModeLoaded = true;
    } else {
      const userInfo = getUserSettingsUserInfo();
      host.email = userInfo.email;
      host.name = getUserSettingsDisplayName('', userInfo);

      if (host.email.trim()) {
        void runUserSettingsPreferencesLoad(host, host.email);
        host.badgeFunctionalityEnabled = false;
        host.badgePreferencesLoaded = true;
        host.showPrayForButton = true;
        host.showPrayingCount = true;
        host.prayerEncouragementUiLoaded = true;
        host.defaultPrayerView = 'current';
        host.defaultViewPreferencesLoaded = true;
      } else {
        host.receiveNotifications = true;
        host.receivePushNotifications = false;
        host.preferencesLoaded = true;
        host.badgeFunctionalityEnabled = false;
        host.badgePreferencesLoaded = true;
        host.showPrayForButton = true;
        host.showPrayingCount = true;
        host.prayerEncouragementUiLoaded = true;
        host.defaultPrayerView = 'current';
        host.defaultViewPreferencesLoaded = true;
        host.memorizationStrictMode = false;
        host.memorizationStrictModeLoaded = true;
      }
    }

    host.error = null;
    host.success = null;
    host.successNotification = null;
    host.successPushNotification = null;
    host.successBadge = null;
    host.successPrayerEncouragementUi = null;
    host.successMemorizationStrictMode = null;

    setTimeout(() => {
      host.isInitialLoad = false;
    }, 100);
  }

  if (
    host.isOpen &&
    host.scrollToSectionId &&
    (changes['isOpen'] || changes['scrollToSectionId'])
  ) {
    scheduleUserSettingsScrollToSection(host);
  }
}
