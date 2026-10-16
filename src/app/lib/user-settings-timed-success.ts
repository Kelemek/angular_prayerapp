import type { TextSize } from '../services/text-size.service';
import type { UserSettingsFacade } from './user-settings-facade';
import type { ThemeOption } from './user-settings-types';

export type UserSettingsSuccessField =
  | 'successTheme'
  | 'successTextSize'
  | 'successNotification'
  | 'successPushNotification'
  | 'successBadge'
  | 'successPrayerEncouragementUi'
  | 'successDefaultView'
  | 'successMemorizationStrictMode';

const SUCCESS_DISMISS_MS = 3000;

const dismissTimers = new WeakMap<
  UserSettingsFacade,
  Map<UserSettingsSuccessField, ReturnType<typeof setTimeout>>
>();

function getTimerMap(host: UserSettingsFacade): Map<
  UserSettingsSuccessField,
  ReturnType<typeof setTimeout>
> {
  let map = dismissTimers.get(host);
  if (!map) {
    map = new Map();
    dismissTimers.set(host, map);
  }
  return map;
}

export function clearUserSettingsSuccessTimers(host: UserSettingsFacade): void {
  const map = dismissTimers.get(host);
  if (!map) {
    return;
  }
  for (const id of map.values()) {
    clearTimeout(id);
  }
  map.clear();
}

export function showUserSettingsTimedSuccess(
  host: UserSettingsFacade,
  field: UserSettingsSuccessField,
  message: string,
): void {
  const map = getTimerMap(host);
  const existing = map.get(field);
  if (existing !== undefined) {
    clearTimeout(existing);
  }

  host[field] = message;
  host.markForCheck();

  const id = setTimeout(() => {
    map.delete(field);
    host[field] = null;
    host.markForCheck();
  }, SUCCESS_DISMISS_MS);
  map.set(field, id);
}

const THEME_SUCCESS_LABEL: Record<ThemeOption, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

const TEXT_SIZE_SUCCESS_LABEL: Record<TextSize, string> = {
  normal: 'Default',
  large: 'Larger',
  largest: 'Largest',
};

export function showUserSettingsThemeSaved(
  host: UserSettingsFacade,
  theme: ThemeOption,
): void {
  showUserSettingsTimedSuccess(
    host,
    'successTheme',
    `✅ Theme set to ${THEME_SUCCESS_LABEL[theme]}`,
  );
}

export function showUserSettingsTextSizeSaved(
  host: UserSettingsFacade,
  size: TextSize,
): void {
  showUserSettingsTimedSuccess(
    host,
    'successTextSize',
    `✅ Text size set to ${TEXT_SIZE_SUCCESS_LABEL[size]}`,
  );
}
