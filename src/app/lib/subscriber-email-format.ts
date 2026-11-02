const SUBSCRIBER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSubscriberEmailFormat(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  if (!SUBSCRIBER_EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address';
  }
  return null;
}

/** Used by admin user management validation (same rules as subscriber email). */
export function isSubscriberEmailFormatValid(email: string): boolean {
  return validateSubscriberEmailFormat(email) === null;
}
