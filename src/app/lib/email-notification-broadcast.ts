/** Non-empty emails, excluding the configured test-account address when set. */
export function filterManualBroadcastRecipientEmails(
  emails: Array<string | null | undefined>,
  excludeLower: string | null
): string[] {
  return emails
    .map((email) => String(email ?? "").trim())
    .filter((email) => {
      if (!email) {
        return false;
      }
      if (!excludeLower) {
        return true;
      }
      return email.toLowerCase() !== excludeLower;
    });
}

export function normalizeTestAccountEmail(
  raw: string | null | undefined
): string | null {
  if (raw == null || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}
