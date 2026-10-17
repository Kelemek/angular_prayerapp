/**
 * Test-account login email is sent only when the browser is the production site.
 */
export const TEST_ACCOUNT_LOGIN_NOTIFY_ORIGIN = "https://cpprayer.cp-church.org";

export function shouldNotifyTestAccountLogin(
  originHeader: string | null | undefined,
  refererHeader: string | null | undefined
): boolean {
  const raw = (originHeader || refererHeader || "").trim();
  if (!raw) return false;
  try {
    return new URL(raw).origin === TEST_ACCOUNT_LOGIN_NOTIFY_ORIGIN;
  } catch {
    return false;
  }
}
