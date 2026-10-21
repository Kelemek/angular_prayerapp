/** Same-origin path only; blocks open redirects and login loops. */
export function safeInternalReturnUrl(returnUrl: string): string {
  if (
    !returnUrl.startsWith('/') ||
    returnUrl.startsWith('//') ||
    returnUrl.startsWith('/login')
  ) {
    return '/';
  }
  return returnUrl;
}

/** Group-only login: honor a safe deep link to the Group tab; otherwise default tab. */
export function groupOnlyLoginDestination(
  returnUrl: string,
  groupsFeatureOn: boolean,
): string {
  if (!groupsFeatureOn) {
    return '/?filter=personal';
  }
  const safe = safeInternalReturnUrl(returnUrl);
  if (safe !== '/' && safe.includes('filter=groups')) {
    return safe;
  }
  return '/?filter=groups';
}
