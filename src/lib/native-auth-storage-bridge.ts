import { Capacitor } from '@capacitor/core';
import {
  ADMIN_SESSION_START_STORAGE_KEY,
  MFA_AUTH_RESUME_TOKEN_STORAGE_KEY,
  MFA_AUTHENTICATED_EMAIL_STORAGE_KEY,
} from './auth-storage-keys';

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
  const { Preferences } = await import('@capacitor/preferences');
  const { value: revokedFlag } = await Preferences.get({
    key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
  });
  return revokedFlag === 'true';
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
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key: NATIVE_AUTH_BRIDGE_PREFS_KEY });
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
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({
    key: NATIVE_AUTH_BRIDGE_PREFS_KEY,
    value: JSON.stringify(payload),
  });
  await Preferences.remove({ key: NATIVE_AUTH_BRIDGE_REVOKED_KEY });
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
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.remove({ key: NATIVE_AUTH_BRIDGE_PREFS_KEY });
  await Preferences.set({ key: NATIVE_AUTH_BRIDGE_REVOKED_KEY, value: 'true' });
}
