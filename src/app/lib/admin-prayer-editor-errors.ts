/** Normalize mutation/search errors for toast and inline banner copy. */
export function prayerEditorErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
