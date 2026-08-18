import { getUserInfo } from '../../utils/userInfoStorage';

export function getUserSettingsUserInfo(): {
  firstName: string;
  lastName: string;
  email: string;
} {
  return getUserInfo();
}

export function getUserSettingsDisplayName(
  name: string,
  userInfo: { firstName: string; lastName: string },
): string {
  if (name) {
    return name;
  }
  const firstName = userInfo.firstName || '';
  const lastName = userInfo.lastName || '';
  return (firstName + (lastName ? ' ' + lastName : '')).trim();
}
