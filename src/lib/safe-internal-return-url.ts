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
