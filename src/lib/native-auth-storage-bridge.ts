import { Capacitor } from '@capacitor/core';
import {
  ADMIN_SESSION_START_STORAGE_KEY,
  MFA_AUTH_RESUME_TOKEN_STORAGE_KEY,
  MFA_AUTHENTICATED_EMAIL_STORAGE_KEY,
} from './auth-storage-keys';
import { isCapacitorUnimplementedError } from './capacitor-unimplemented';

type PreferencesApi = typeof import('@capacitor/preferences').Preferences;

/** If native never answers, do not leave boot or auth init waiting. */
const NATIVE_PREFERENCES_TIMEOUT_MS = 800;

let preferencesNativeUnavailable = false;

/** Test-only. Production boot keeps the flag for the page lifetime. */
export function resetNativePreferencesAvailabilityForTests(): void {
  preferencesNativeUnavailable = false;
}

function withNativeTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, NATIVE_PREFERENCES_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function getPreferencesApi(): Promise<PreferencesApi | null> {
  if (!Capacitor.isNativePlatform() || preferencesNativeUnavailable) {
    return null;
  }
  try {
    if (!Capacitor.isPluginAvailable('Preferences')) {
      console.warn(
        '[NativeAuthBridge] Preferences plugin not registered — run npx cap sync and rebuild the native app'
      );
      return null;
    }
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences;
  } catch (error) {
    console.warn('[NativeAuthBridge] Preferences unavailable:', error);
    return null;
  }
}

function markPreferencesNativeUnavailable(error: unknown): void {
  preferencesNativeUnavailable = true;
  if (isCapacitorUnimplementedError(error)) {
    console.warn(
      '[NativeAuthBridge] Preferences UNIMPLEMENTED in native binary — rebuild iOS after npx cap sync'
    );
    return;
  }
  console.warn('[NativeAuthBridge] Preferences call failed; skipping native bridge:', error);
}

export const NATIVE_AUTH_BRIDGE_PREFS_KEY = 'prayerapp_native_auth_bridge';

/** Set on logout so bundled WebView does not republish stale localStorage to Preferences. */
export const NATIVE_AUTH_BRIDGE_REVOKED_KEY = 'prayerapp_native_auth_revoked';

export type NativeAuthBridgePayload = {
  mfaEmail?: string;
  authResumeToken?: string;
  adminSessionStart?: string;
};

function readBridgePayloadFromLocalStorage(): NativeAuthBridgePayload {
  return {
    mfaEmail: localStorage.getItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY)?.trim(),
    authResumeToken: localStorage.getItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY)?.trim(),
    adminSessionStart: localStorage.getItem(ADMIN_SESSION_START_STORAGE_KEY)?.trim(),
  };
}

/** True when bridged MFA email should replace a Supabase JWT on this origin. */
export function mfaEmailConflictsWithSession(
  mfaEmail: string | null | undefined,
  sessionEmail: string | null | undefined
): boolean {
  const mfa = mfaEmail?.toLowerCase().trim();
  const session = sessionEmail?.toLowerCase().trim();
  if (!mfa || !session) {
    return false;
  }
  return mfa !== session;
}

function applyBridgePayloadToLocalStorage(payload: NativeAuthBridgePayload): void {
  const bridgeEmail = payload.mfaEmail?.trim();
  if (!bridgeEmail) {
    return;
  }

  const currentEmail = localStorage
    .getItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY)
    ?.toLowerCase()
    .trim();
  const bridgeNormalized = bridgeEmail.toLowerCase();

  if (!currentEmail || currentEmail !== bridgeNormalized) {
    localStorage.setItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY, bridgeEmail);
    if (payload.authResumeToken) {
      localStorage.setItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY, payload.authResumeToken);
    } else {
      localStorage.removeItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY);
    }
    if (payload.adminSessionStart) {
      localStorage.setItem(ADMIN_SESSION_START_STORAGE_KEY, payload.adminSessionStart);
    } else {
      localStorage.removeItem(ADMIN_SESSION_START_STORAGE_KEY);
    }
    return;
  }

  if (
    payload.authResumeToken &&
    !localStorage.getItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY)
  ) {
    localStorage.setItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY, payload.authResumeToken);
  }
  if (
    payload.adminSessionStart &&
    !localStorage.getItem(ADMIN_SESSION_START_STORAGE_KEY)
  ) {
    localStorage.setItem(ADMIN_SESSION_START_STORAGE_KEY, payload.adminSessionStart);
  }
}

/** True after native logout until the next MFA session is bridged again. */
export async function isNativeAuthBridgeRevoked(): Promise<boolean> {
  const Preferences = await getPreferencesApi();
  if (!Preferences) {
    return false;
  }
  try {
    const { value: revokedFlag } = await withNativeTimeout(
      Preferences.get({
        key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
      }),
      'Preferences.get revoked'
    );
    return revokedFlag === 'true';
  } catch (error) {
    markPreferencesNativeUnavailable(error);
    console.warn('[NativeAuthBridge] Failed to read revoked flag:', error);
    return false;
  }
}

/** Copy native-backed auth keys into this WebView origin (bundled vs live). */
export async function hydrateLocalStorageFromNativeAuthBridge(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  if (await isNativeAuthBridgeRevoked()) {
    clearMfaAuthLocalStorage();
    return;
  }
  const Preferences = await getPreferencesApi();
  if (!Preferences) {
    return;
  }
  let value: string | null | undefined;
  try {
    const result = await withNativeTimeout(
      Preferences.get({ key: NATIVE_AUTH_BRIDGE_PREFS_KEY }),
      'Preferences.get bridge'
    );
    value = result.value;
  } catch (error) {
    markPreferencesNativeUnavailable(error);
    console.warn('[NativeAuthBridge] Failed to read auth bridge:', error);
    return;
  }
  if (!value) {
    return;
  }
  try {
    const payload = JSON.parse(value) as NativeAuthBridgePayload;
    applyBridgePayloadToLocalStorage(payload);
  } catch {
    // ignore corrupt bridge
  }
}

export function clearMfaAuthLocalStorage(): void {
  localStorage.removeItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY);
  localStorage.removeItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_SESSION_START_STORAGE_KEY);
}

/** Persist MFA session fields so offline bundled boot and live redirect share state. */
export async function persistNativeAuthBridgeFromLocalStorage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  const payload = readBridgePayloadFromLocalStorage();
  if (!payload.mfaEmail && !payload.authResumeToken) {
    return;
  }
  const Preferences = await getPreferencesApi();
  if (!Preferences) {
    return;
  }
  try {
    await withNativeTimeout(
      Preferences.set({
        key: NATIVE_AUTH_BRIDGE_PREFS_KEY,
        value: JSON.stringify(payload),
      }),
      'Preferences.set bridge'
    );
    await withNativeTimeout(
      Preferences.remove({ key: NATIVE_AUTH_BRIDGE_REVOKED_KEY }),
      'Preferences.remove revoked'
    );
  } catch (error) {
    console.warn('[NativeAuthBridge] Failed to persist auth bridge:', error);
  }
}

/**
 * Before live redirect: sync bridge from localStorage, or drop stale bundled auth after logout.
 */
export async function syncNativeAuthBridgeBeforeLiveRedirect(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  if (await isNativeAuthBridgeRevoked()) {
    clearMfaAuthLocalStorage();
    return;
  }
  await persistNativeAuthBridgeFromLocalStorage();
}

export async function clearNativeAuthBridge(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  const Preferences = await getPreferencesApi();
  if (!Preferences) {
    return;
  }
  try {
    await withNativeTimeout(
      Preferences.remove({ key: NATIVE_AUTH_BRIDGE_PREFS_KEY }),
      'Preferences.remove bridge'
    );
    await withNativeTimeout(
      Preferences.set({ key: NATIVE_AUTH_BRIDGE_REVOKED_KEY, value: 'true' }),
      'Preferences.set revoked'
    );
  } catch (error) {
    console.warn('[NativeAuthBridge] Failed to clear auth bridge:', error);
  }
}
