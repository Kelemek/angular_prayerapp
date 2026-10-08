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

/** Test-only. Production reads skip Preferences after a failure; logout still retries. */
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

async function getPreferencesApi(options?: {
  /** Logout and session persist must run even after a boot-time Preferences timeout. */
  force?: boolean;
}): Promise<PreferencesApi | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  if (preferencesNativeUnavailable && !options?.force) {
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

/** This origin's latest login. Newer than a revoke timestamp means re-login wins. */
export const NATIVE_AUTH_LOCAL_SESSION_AT_KEY = 'prayerapp_native_auth_local_session_at';

/**
 * Set only on this origin while a login has not yet removed a legacy `'true'`
 * revoke. Other origins do not have the key, so that flag still logs them out.
 */
const NATIVE_AUTH_LEGACY_REVOKE_SUPERSEDED_KEY =
  'prayerapp_native_auth_legacy_revoke_superseded';

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

type NativeRevokedRead = 'revoked' | 'superseded' | 'active' | 'unknown';

function readLocalSessionAt(): number | null {
  const value = Number(localStorage.getItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** `superseded` is a logout flag older than this origin's current login. */
function classifyRevokedFlag(
  value: string | null | undefined,
  applyLegacySupersede: boolean
): Exclude<NativeRevokedRead, 'unknown'> {
  if (!value) {
    return 'active';
  }
  if (value === 'true') {
    if (
      applyLegacySupersede &&
      localStorage.getItem(NATIVE_AUTH_LEGACY_REVOKE_SUPERSEDED_KEY) === '1'
    ) {
      return 'superseded';
    }
    return 'revoked';
  }
  const revokedAt = Number(value);
  if (!Number.isFinite(revokedAt) || revokedAt <= 0) {
    return 'active';
  }
  const sessionAt = readLocalSessionAt();
  if (sessionAt != null && sessionAt > revokedAt) {
    return 'superseded';
  }
  return 'revoked';
}

/**
 * `unknown` means Preferences did not answer. Callers that write the bridge
 * must not treat that as "not revoked".
 */
async function readNativeAuthBridgeRevoked(options?: {
  force?: boolean;
}): Promise<NativeRevokedRead> {
  const Preferences = await getPreferencesApi(options);
  if (!Preferences) {
    return 'unknown';
  }
  try {
    const { value: revokedFlag } = await withNativeTimeout(
      Preferences.get({
        key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
      }),
      'Preferences.get revoked'
    );
    preferencesNativeUnavailable = false;
    return classifyRevokedFlag(revokedFlag, true);
  } catch (error) {
    markPreferencesNativeUnavailable(error);
    console.warn('[NativeAuthBridge] Failed to read revoked flag:', error);
    return 'unknown';
  }
}

/** True after native logout until the next MFA session is bridged again. */
export async function isNativeAuthBridgeRevoked(): Promise<boolean> {
  return (await readNativeAuthBridgeRevoked()) === 'revoked';
}

export function isLocalAuthBridgeRevoked(): boolean {
  return (
    classifyRevokedFlag(localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY), false) ===
    'revoked'
  );
}

function markLocalAuthBridgeRevoked(): string {
  const revokedAt = String(Date.now());
  localStorage.setItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY, revokedAt);
  localStorage.removeItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY);
  localStorage.removeItem(NATIVE_AUTH_LEGACY_REVOKE_SUPERSEDED_KEY);
  return revokedAt;
}

function clearLocalAuthBridgeRevoked(): void {
  localStorage.removeItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY);
}

function markLocalSessionActive(): void {
  const prior = Number(localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY));
  const at = Math.max(Date.now(), (Number.isFinite(prior) ? prior : 0) + 1);
  localStorage.setItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY, String(at));
  clearLocalAuthBridgeRevoked();
}

/** Copy native-backed auth keys into this WebView origin (bundled vs live). */
export async function hydrateLocalStorageFromNativeAuthBridge(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  // Same-origin logout marker. Survives a failed Preferences write on this WebView.
  if (isLocalAuthBridgeRevoked()) {
    clearMfaAuthLocalStorage();
    return;
  }
  const revoked = await readNativeAuthBridgeRevoked();
  switch (revoked) {
    case 'revoked':
      clearMfaAuthLocalStorage();
      return;
    case 'unknown':
    case 'superseded':
      return;
    case 'active':
      break;
    default: {
      const _exhaustive: never = revoked;
      return _exhaustive;
    }
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
  // Drop the logout marker before any native await. Hydrate and live redirect
  // must not wipe this login while Preferences is still clearing the old flag.
  markLocalSessionActive();
  // Cover the legacy Preferences value `true` until this login removes it.
  // A bare session timestamp must not ignore that flag on the other WebView.
  localStorage.setItem(NATIVE_AUTH_LEGACY_REVOKE_SUPERSEDED_KEY, '1');
  const Preferences = await getPreferencesApi({ force: true });
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
    localStorage.removeItem(NATIVE_AUTH_LEGACY_REVOKE_SUPERSEDED_KEY);
    preferencesNativeUnavailable = false;
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
  if (isLocalAuthBridgeRevoked()) {
    clearMfaAuthLocalStorage();
    await clearNativeAuthBridge();
    return;
  }
  // A boot timeout sets preferencesNativeUnavailable. Reading without force
  // would look like "not revoked" and the persist below would overwrite the
  // native logout flag with stale bundled MFA.
  const revoked = await readNativeAuthBridgeRevoked({ force: true });
  switch (revoked) {
    case 'revoked':
      clearMfaAuthLocalStorage();
      return;
    case 'unknown':
      console.warn(
        '[NativeAuthBridge] Skipping live-redirect persist; revoked flag was not read'
      );
      return;
    case 'active':
    case 'superseded':
      await persistNativeAuthBridgeFromLocalStorage();
      return;
    default: {
      const _exhaustive: never = revoked;
      return _exhaustive;
    }
  }
}

const NATIVE_LOGOUT_WRITE_ATTEMPTS = 2;

async function writeNativeLogout(
  Preferences: PreferencesApi,
  revokedAt: string
): Promise<boolean> {
  let revoked = false;
  let removed = false;
  for (
    let attempt = 0;
    attempt < NATIVE_LOGOUT_WRITE_ATTEMPTS && (!revoked || !removed);
    attempt += 1
  ) {
    if (!revoked) {
      try {
        await withNativeTimeout(
          Preferences.set({ key: NATIVE_AUTH_BRIDGE_REVOKED_KEY, value: revokedAt }),
          'Preferences.set revoked'
        );
        revoked = true;
      } catch (error) {
        console.warn('[NativeAuthBridge] Failed to set revoked flag:', error);
        if (isCapacitorUnimplementedError(error)) {
          markPreferencesNativeUnavailable(error);
          return false;
        }
      }
    }
    if (!removed) {
      try {
        await withNativeTimeout(
          Preferences.remove({ key: NATIVE_AUTH_BRIDGE_PREFS_KEY }),
          'Preferences.remove bridge'
        );
        removed = true;
      } catch (error) {
        console.warn('[NativeAuthBridge] Failed to remove auth bridge:', error);
        if (isCapacitorUnimplementedError(error)) {
          markPreferencesNativeUnavailable(error);
          return revoked;
        }
      }
    }
  }
  if (revoked) {
    preferencesNativeUnavailable = false;
  }
  return revoked;
}

export async function clearNativeAuthBridge(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  // Record logout on this origin before any native call so a hung Preferences
  // write cannot be republished into localStorage on the next cold start.
  const revokedAt = markLocalAuthBridgeRevoked();
  const Preferences = await getPreferencesApi({ force: true });
  if (!Preferences) {
    console.warn(
      '[NativeAuthBridge] Preferences unavailable; logout kept a local revoked flag only'
    );
    return;
  }
  await writeNativeLogout(Preferences, revokedAt);
}
