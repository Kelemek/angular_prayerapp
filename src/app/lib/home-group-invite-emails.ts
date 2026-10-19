/** Parses comma/space-separated invite input into unique, plausible email addresses. */
export function parseInviteEmails(raw: string): string[] {
  const unique = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (email.includes('@') && email.includes('.')) unique.add(email);
  }
  return [...unique];
}
