export function extractSupabaseErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    if ('error' in error) {
      const nested = (error as { error?: unknown }).error;
      if (typeof nested === 'string') {
        return nested;
      }
    }
    return JSON.stringify(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
