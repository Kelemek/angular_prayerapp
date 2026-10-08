export const MFA_AUTHENTICATED_EMAIL_STORAGE_KEY = 'mfa_authenticated_email';

/** Login page: a code was emailed and the verify step is still open. */
export const MFA_LOGIN_CODE_SENT_KEY = 'mfa_email_sent';

export const MFA_LOGIN_CODE_EMAIL_KEY = 'mfa_email';

/** verify-code session written when a login code is sent. */
export const MFA_LOGIN_CODE_ID_KEY = 'mfa_code_id';

export const MFA_LOGIN_CODE_USER_EMAIL_KEY = 'mfa_user_email';

/** Drop a half-finished login code so logout cannot reopen the verify step. */
export function clearPendingLoginMfaSession(): void {
  sessionStorage.removeItem(MFA_LOGIN_CODE_SENT_KEY);
  sessionStorage.removeItem(MFA_LOGIN_CODE_EMAIL_KEY);
  localStorage.removeItem(MFA_LOGIN_CODE_ID_KEY);
  localStorage.removeItem(MFA_LOGIN_CODE_USER_EMAIL_KEY);
}

export const MFA_AUTH_RESUME_TOKEN_STORAGE_KEY = 'mfa_auth_resume_token';

export const ADMIN_SESSION_START_STORAGE_KEY = 'adminSessionStart';
