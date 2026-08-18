/** Normalize unknown errors for toast and inline banner copy. */
export function adminErrorMessage(
  err: unknown,
  fallback = 'Unknown error',
): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return String(err.message);
  }
  return fallback;
}
