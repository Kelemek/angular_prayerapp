/** True when the native shell has no implementation for a Capacitor plugin call. */
export function isCapacitorUnimplementedError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code?: string }).code === 'UNIMPLEMENTED';
  }
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error) as { code?: string };
      return parsed.code === 'UNIMPLEMENTED';
    } catch {
      return false;
    }
  }
  return false;
}
