type ClientPreferencesChangeListener = () => void;

let listener: ClientPreferencesChangeListener | null = null;
let applyingFromSessionDepth = 0;

export function setClientPreferencesChangeListener(
  fn: ClientPreferencesChangeListener | null
): void {
  listener = fn;
}

export function isApplyingClientPreferencesFromSession(): boolean {
  return applyingFromSessionDepth > 0;
}

/** Suppress sync emits while session prefs are applied to local mirrors / services. */
export function runApplyingClientPreferencesFromSession(fn: () => void): void {
  applyingFromSessionDepth += 1;
  try {
    fn();
  } finally {
    applyingFromSessionDepth -= 1;
  }
}

export function emitClientPreferencesLocalChange(): void {
  if (applyingFromSessionDepth > 0) {
    return;
  }
  listener?.();
}
