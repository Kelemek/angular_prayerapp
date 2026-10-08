import { Injectable, inject, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, interval, timer } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';
import { PlanningCenterListService } from './planning-center-list.service';
import { PushNotificationService } from './push-notification.service';
import { PrayerEncouragementService } from './prayer-encouragement.service';
import { BadgeReadStateService } from './badge-read-state.service';
import {
  BADGE_READ_PRAYERS_DATA_KEY,
  BADGE_READ_PROMPTS_DATA_KEY,
} from '../lib/badge-cache';
import type { Session, User } from '@supabase/supabase-js';
import {
  VERIFY_CODE_LINK_AUTH_SESSION,
  linkAuthSessionAfterVerify,
  MFA_AUTH_RESUME_TOKEN_STORAGE_KEY,
  persistAuthResumeTokenFromVerifyResponse,
  resumeMfaSubscriberAuthLink,
  stampSubscriberAuthLink,
} from '../../lib/auth-session-link';
import {
  ADMIN_SESSION_START_STORAGE_KEY,
  MFA_AUTHENTICATED_EMAIL_STORAGE_KEY,
  MFA_LOGIN_CODE_ID_KEY,
  MFA_LOGIN_CODE_USER_EMAIL_KEY,
  clearPendingLoginMfaSession,
} from '../../lib/auth-storage-keys';
import {
  buildMfaMockUser,
  completeRestoredAuthSession as completeRestoredAuthSessionFlow,
} from '../../lib/admin-auth-session-restore';
import {
  clearMfaAuthLocalStorage,
  clearNativeAuthBridge,
  isLocalAuthBridgeRevoked,
  isNativeAuthBridgeRevoked,
  markLocalAuthSessionActive,
  mfaEmailConflictsWithSession,
  persistNativeAuthBridgeFromLocalStorage,
  readLocalAuthSessionAt,
  revokeLocalAuthBridge,
} from '../../lib/native-auth-storage-bridge';

/** getSession on the iOS WebView can hang; the site guard will not render until loading$ is false. */
const AUTH_INIT_STEP_MS = 1500;

/**
 * siteAuthGuard paints nothing while loading$ stays true. Restore may still be
 * in flight (hung signOut, Preferences, subscriber link). Open the shell anyway.
 */
const AUTH_RESTORE_BUDGET_MS = 2500;

function withAuthStepDeadline<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(`[AdminAuth] ${label} timed out after ${AUTH_INIT_STEP_MS}ms`)
      );
    }, AUTH_INIT_STEP_MS);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  private hasAdminEmailSubject = new BehaviorSubject<boolean>(false);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private requireSiteLoginSubject = new BehaviorSubject<boolean>(false);
  private adminSessionExpiredSubject = new BehaviorSubject<boolean>(false);
  private lastActivity = Date.now();
  private sessionStart: number | null = null;
  private adminSessionStart: number | null = null;
  private lastBlockedCheck = 0;
  /**
   * User tapped log out. Hung getSession/signOut must not sign them back in
   * or bounce them off /login via leaveLoginAfterRestoredSession.
   */
  private ignoreSessionRestore = false;
  /** Bumped on logout and on a successful code login so an older logout tail stops. */
  private sessionEpoch = 0;
  private readonly subscriberAuthLinkByEmail = new Map<string, Promise<void>>();
  private restoreBudgetTimer: ReturnType<typeof setTimeout> | undefined;

  public user$ = this.userSubject.asObservable();
  public isAdmin$ = this.isAdminSubject.asObservable();
  public hasAdminEmail$ = this.hasAdminEmailSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public requireSiteLogin$ = this.requireSiteLoginSubject.asObservable();
  public adminSessionExpired$ = this.adminSessionExpiredSubject.asObservable();

  private router = inject(Router);
  private injector = inject(Injector);
  private ngZone = inject(NgZone, { optional: true });

  constructor(
    private supabase: SupabaseService,
    private cacheService: CacheService
  ) {
    this.initializeAuth().catch(error => {
      console.error('[AdminAuth] initializeAuth failed:', error);
      this.releaseAuthShell();
    });
  }

  private armRestoreBudget(): void {
    this.restoreBudgetTimer = setTimeout(() => {
      if (!this.loadingSubject.value) {
        return;
      }
      console.warn(
        '[AdminAuth] Session restore budget elapsed; opening the shell'
      );
      this.loadingSubject.next(false);
    }, AUTH_RESTORE_BUDGET_MS);
  }

  private disarmRestoreBudget(): void {
    if (this.restoreBudgetTimer !== undefined) {
      clearTimeout(this.restoreBudgetTimer);
      this.restoreBudgetTimer = undefined;
    }
  }

  /**
   * The home route stays blank until loading$ is false. Call this as soon as
   * the signed-in bit is known, and again from the restore finally.
   */
  private releaseAuthShell(): void {
    this.disarmRestoreBudget();
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
    }
    this.leaveLoginAfterRestoredSession();
  }

  /** Logout won, including a same-origin revoke stamped while init was awaiting native I/O. */
  private logoutBlocksSessionRestore(): boolean {
    return this.ignoreSessionRestore || isLocalAuthBridgeRevoked();
  }

  /** A logout must stick even if restore or onAuthStateChange still has a session. */
  private acceptRestoredUser(user: User): void {
    if (this.ignoreSessionRestore) {
      return;
    }
    this.userSubject.next(user);
  }

  private acceptAuthenticated(value: boolean): void {
    if (value && this.ignoreSessionRestore) {
      return;
    }
    this.isAuthenticatedSubject.next(value);
  }

  /** Returning native sessions often have MFA email before getSession answers. */
  private applyLocalMfaSessionIfPresent(): void {
    if (this.ignoreSessionRestore || isLocalAuthBridgeRevoked()) {
      return;
    }
    const mfaEmail =
      localStorage.getItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY)?.trim() ?? '';
    if (!mfaEmail) {
      return;
    }
    this.acceptRestoredUser(buildMfaMockUser(mfaEmail));
    this.acceptAuthenticated(true);
    if (!this.sessionStart) {
      this.sessionStart = this.getPersistedSessionStart() || Date.now();
      this.persistSessionStart(this.sessionStart);
    }
  }

  private clearRestoredSessionSubjects(): void {
    const shellAlreadyOpen = !this.loadingSubject.value;
    this.userSubject.next(null);
    this.isAdminSubject.next(false);
    this.hasAdminEmailSubject.next(false);
    this.isAuthenticatedSubject.next(false);
    this.sessionStart = null;
    this.persistSessionStart(null);
    if (shellAlreadyOpen) {
      void this.router.navigate(['/login']);
    }
  }

  private async signOutBounded(label: string): Promise<void> {
    try {
      await withAuthStepDeadline(this.supabase.client.auth.signOut(), label);
    } catch (error) {
      console.warn(`[AdminAuth] ${label} failed:`, error);
    }
  }

  private async initializeAuth(): Promise<void> {
    // siteAuthGuard reads the first loading$ false. A local MFA session is
    // marked signed in before that, so the shell opens on home. A later
    // restore still calls leaveLoginAfterRestoredSession if the guard
    // already sent the user to /login.
    this.armRestoreBudget();
    try {
    this.applyLocalMfaSessionIfPresent();
    if (this.isAuthenticatedSubject.value) {
      this.releaseAuthShell();
    }
    let session: Session | null = null;
    try {
      const sessionResult = await withAuthStepDeadline(
        this.supabase.client.auth.getSession(),
        'getSession'
      );
      session = sessionResult.data.session;
    } catch (error) {
      console.warn(
        '[AdminAuth] getSession failed; continuing signed out:',
        error
      );
    }

    const nativeBridgeRevoked = await isNativeAuthBridgeRevoked();
    const authBridgeRevoked =
      isLocalAuthBridgeRevoked() || nativeBridgeRevoked;
    if (authBridgeRevoked) {
      clearMfaAuthLocalStorage();
      this.clearRestoredSessionSubjects();
      if (session) {
        console.warn(
          '[AdminAuth] Auth bridge revoked; clearing Supabase session'
        );
        await this.signOutBounded('signOut after revoke');
        session = null;
      }
    }

    const bridgedMfaEmail = localStorage.getItem(
      MFA_AUTHENTICATED_EMAIL_STORAGE_KEY
    );
    if (
      !authBridgeRevoked &&
      session?.user &&
      mfaEmailConflictsWithSession(bridgedMfaEmail, session.user.email)
    ) {
      console.warn(
        '[AdminAuth] Supabase session does not match bridged MFA email; clearing stale JWT'
      );
      await this.signOutBounded('signOut stale JWT');
      session = null;
    }

    const mfaEmail = bridgedMfaEmail?.trim() ?? '';
    if (!session && mfaEmail && !authBridgeRevoked) {
      let refreshed: { session: Session | null } = { session: null };
      let refreshError: { message: string } | null = null;
      try {
        const refreshResult = await withAuthStepDeadline(
          this.supabase.client.auth.refreshSession(),
          'refreshSession'
        );
        refreshed = refreshResult.data;
        refreshError = refreshResult.error;
      } catch (error) {
        console.warn('[AdminAuth] refreshSession failed:', error);
        refreshError = {
          message: error instanceof Error ? error.message : 'refreshSession failed',
        };
      }
      if (refreshError) {
        console.debug(
          '[AdminAuth] No Supabase session to refresh for MFA user:',
          refreshError.message
        );
      } else if (refreshed.session) {
        const refreshedEmail = refreshed.session.user.email?.toLowerCase().trim();
        if (refreshedEmail === mfaEmail.toLowerCase()) {
          session = refreshed.session;
        } else {
          console.warn(
            '[AdminAuth] Refreshed JWT email does not match MFA; clearing session'
          );
          await this.signOutBounded('signOut mismatched refresh');
          session = null;
        }
      }
    }

    if (
      this.isAuthenticatedSubject.value ||
      (!session?.user && !mfaEmail)
    ) {
      // Saved MFA is already signed in, or there is nothing to restore.
      // Do not wait on the subscriber link before the route can paint.
      this.releaseAuthShell();
    }

    const linkTargetEmail = session?.user?.email?.trim() || mfaEmail;

    if (linkTargetEmail && !this.logoutBlocksSessionRestore()) {
      if (mfaEmail) {
        console.log(
          '[AdminAuth] Restoring MFA authenticated session for:',
          mfaEmail
        );
      }
      try {
        await withAuthStepDeadline(
          this.ensureSubscriberAuthOnLoad(linkTargetEmail),
          'subscriber link'
        );
      } catch (error) {
        console.warn('[AdminAuth] Subscriber link skipped:', error);
      }

      let afterLink: Session | null = null;
      try {
        const afterResult = await withAuthStepDeadline(
          this.supabase.client.auth.getSession(),
          'getSession after link'
        );
        afterLink = afterResult.data.session;
      } catch (error) {
        console.warn('[AdminAuth] getSession after link failed:', error);
      }
      if (this.logoutBlocksSessionRestore()) {
        await this.signOutBounded('signOut after logout during restore');
      } else {
        const restoredUser =
          afterLink?.user ??
          session?.user ??
          (mfaEmail ? buildMfaMockUser(mfaEmail) : null);

        if (restoredUser) {
          await this.completeRestoredAuthSession(restoredUser);
        }
      }
    }

    // Listen for auth state changes. Do not await Supabase inside this callback:
    // it runs under the auth lock, and a nested call deadlocks signOut().
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      
      if (session?.user) {
        if (this.ignoreSessionRestore || isLocalAuthBridgeRevoked()) {
          return;
        }
        this.acceptRestoredUser(session.user);
        // Check admin status but don't block on failure
        this.checkAdminStatus(session.user).catch(error => {
          console.error('[AdminAuth] Error checking admin status on state change:', error);
          this.isAdminSubject.next(false);
          this.hasAdminEmailSubject.next(false);
        });
        this.acceptAuthenticated(true);
        
        if (!this.sessionStart) {
          this.sessionStart = Date.now();
          this.persistSessionStart(this.sessionStart);
        }
      } else {
        if (this.ignoreSessionRestore) {
          return;
        }
        // Only clear auth state if we don't have an MFA authenticated user
        // MFA users don't have Supabase sessions so this listener won't find them
        const mfaAuthenticatedEmail = localStorage.getItem(
          MFA_AUTHENTICATED_EMAIL_STORAGE_KEY
        );
        if (!mfaAuthenticatedEmail) {
          // Get user email before clearing auth state
          const userEmail = this.userSubject.value?.email;

          this.userSubject.next(null);
          this.isAdminSubject.next(false);
          this.isAuthenticatedSubject.next(false);
          this.sessionStart = null;
          this.persistSessionStart(null);

          // Clear user-specific caches when session ends
          this.cacheService.invalidateCategory('personalPrayers');
          this.cacheService.invalidateCategory('prayers');
          this.cacheService.invalidateCategory('prompts');
          this.cacheService.invalidateCategory('badgeReadState');

          // Clear analytics activity tracking for this user
          if (userEmail) {
            localStorage.removeItem(`last_activity_update_${userEmail}`);
          }

          // After the auth lock is released. Awaiting this here deadlocks signOut.
          setTimeout(() => {
            void this.clearBadgeReadStateForLogout(userEmail);
          }, 0);
        }
      }
    });

    // Track user activity
    this.trackUserActivity();

    // Refresh lightweight checks when the window regains focus so we don't block rendering
    window.addEventListener('focus', () => {
      this.checkBlockedStatusInBackground();
      
      // Re-validate admin status on focus after background suspension (iOS Edge issue)
      const currentUser = this.userSubject.value;
      if (currentUser) {
        this.checkAdminStatus(currentUser).catch(error => {
          console.error('Error re-validating admin status on focus:', error);
        });
      }
    });

    // Also handle visibilitychange event for iOS app background/foreground transitions
    // This fires before focus on some iOS browsers
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[AdminAuth] App became visible, re-validating admin state');
        // Re-validate admin status when app returns from background
        const currentUser = this.userSubject.value;
        if (currentUser) {
          this.checkAdminStatus(currentUser).catch(error => {
            console.error('Error re-validating admin status on visibility change:', error);
          });
        }
        
        // Check approval session
        const approvalEmail = localStorage.getItem('approvalAdminEmail');
        const sessionValidated = localStorage.getItem('approvalSessionValidated');
        if (approvalEmail && sessionValidated === 'true') {
          this.isEmailAdmin(approvalEmail).then(isAdmin => {
            this.isAdminSubject.next(isAdmin);
            this.hasAdminEmailSubject.next(isAdmin);
          }).catch(error => {
            console.error('Error re-validating approval session on visibility change:', error);
          });
        }
      }
    });

    // Set up session timeout checks
    this.setupSessionTimeouts();
    } finally {
      // Ensure loading is cleared on all code paths (success/error)
      this.releaseAuthShell();
      console.log('[AdminAuth] Session restore finished');
    }
  }

  /**
   * A restored session must not sit on the login page. The guard may already
   * have opened /login if loading$ was cleared early.
   */
  private leaveLoginAfterRestoredSession(): void {
    if (this.ignoreSessionRestore || !this.isAuthenticatedSubject.value) {
      return;
    }
    const url = this.router.url;
    if (typeof url !== 'string' || !url.startsWith('/login')) {
      return;
    }
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    const params = new URLSearchParams(query);
    if (
      params.get('sessionExpired') === 'true' ||
      params.get('blocked') === 'true'
    ) {
      return;
    }
    const returnUrl = params.get('returnUrl') ?? '/';
    void this.router.navigateByUrl(this.safeInternalReturnUrl(returnUrl));
  }

  private safeInternalReturnUrl(returnUrl: string): string {
    if (
      !returnUrl.startsWith('/') ||
      returnUrl.startsWith('//') ||
      returnUrl.startsWith('/login')
    ) {
      return '/';
    }
    return returnUrl;
  }

  /**
   * Safety API to clear loading state when external flows need a fallback
   */
  public clearLoading(): void {
    this.loadingSubject.next(false);
  }

  /**
   * Dual-run: create/link Supabase Auth for MFA-only sessions without forcing re-login.
   */
  private async completeRestoredAuthSession(user: User): Promise<void> {
    await completeRestoredAuthSessionFlow(user, {
      setUser: (next) => this.acceptRestoredUser(next),
      checkAdminStatus: (next) => this.checkAdminStatus(next),
      onAdminCheckFailed: () => {
        this.isAdminSubject.next(false);
        this.hasAdminEmailSubject.next(false);
      },
      setAuthenticated: (value) => this.acceptAuthenticated(value),
      getPersistedSessionStart: () => this.getPersistedSessionStart(),
      persistSessionStart: (timestamp) => {
        this.sessionStart = timestamp;
        this.persistSessionStart(timestamp);
      },
    });
  }

  private async ensureSubscriberAuthOnLoad(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    if (!normalized) {
      return;
    }

    const existing = this.subscriberAuthLinkByEmail.get(normalized);
    if (existing) {
      await existing;
      return;
    }

    const run = async (): Promise<void> => {
      const {
        data: { session },
      } = await this.supabase.client.auth.getSession();
      const result =
        session?.user?.email?.toLowerCase().trim() === normalized
          ? await stampSubscriberAuthLink(this.supabase.client)
          : await resumeMfaSubscriberAuthLink(
              this.supabase.client,
              normalized
            );

      if (!result.ok) {
        console.warn(
          '[AdminAuth] Subscriber auth link on load failed:',
          result.error
        );
      }
    };

    const pending = run().finally(() => {
      this.subscriberAuthLinkByEmail.delete(normalized);
    });
    this.subscriberAuthLinkByEmail.set(normalized, pending);
    await pending;
  }

  private async checkAdminStatus(user: User): Promise<void> {
    if (!user?.email) {
      this.isAdminSubject.next(false);
      this.hasAdminEmailSubject.next(false);
      this.isAuthenticatedSubject.next(false);
      return;
    }

    try {
      const { data, error } = await this.supabase.directQuery<Array<{ is_admin: boolean }>>('email_subscribers', {
        select: 'is_admin',
        eq: { email: user.email, is_admin: true },
        limit: 1,
        timeout: 10000
      });

      if (this.ignoreSessionRestore) {
        return;
      }
      if (!error && data && data.length > 0) {
        this.isAdminSubject.next(true);
        this.hasAdminEmailSubject.next(true);
      } else {
        this.isAdminSubject.next(false);
        this.hasAdminEmailSubject.next(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isAdminSubject.next(false);
      this.hasAdminEmailSubject.next(false);
    }
  }

  checkBlockedStatusInBackground(returnUrl?: string): void {
    const now = Date.now();
    if (now - this.lastBlockedCheck < 60000) return; // throttle to avoid spamming
    this.lastBlockedCheck = now;

    // Fire and forget – do not block UI rendering
    this.supabase.directQuery<{ is_blocked: boolean }>(
      'email_subscribers',
      {
        select: 'is_blocked',
        eq: { email: this.userSubject.value?.email?.toLowerCase() || '' },
        limit: 1,
        timeout: 5000
      }
    ).then(({ data, error }) => {
      if (error) {
        console.warn('[AdminAuth] Block check skipped due to error:', error);
        return;
      }

      const isBlocked = data && Array.isArray(data) && data.length > 0 && data[0]?.is_blocked;
      if (isBlocked) {
        console.log('[AdminAuth] User is blocked - logging out');
        void this.logout({ skipNavigation: true });
        this.router.navigate(['/login'], {
          queryParams: {
            returnUrl: returnUrl || '/',
            blocked: 'true'
          }
        });
      }
    }).catch(error => {
      console.warn('[AdminAuth] Block check exception:', error);
    });
  }

  private trackUserActivity(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      });
    });
  }

  /**
   * Record user activity to prevent inactivity timeout
   * Call this whenever user interacts with the admin panel
   */
  recordActivity(): void {
    this.lastActivity = Date.now();
  }

  private setupSessionTimeouts(): void {
    // Admin sessions now stay active indefinitely, matching normal user behavior
    // Sessions are maintained via Supabase auth and manual logout only
  }

  private getPersistedSessionStart(): number | null {
    try {
      const stored = localStorage.getItem(ADMIN_SESSION_START_STORAGE_KEY);
      if (stored) {
        const timestamp = parseInt(stored, 10);
        if (!isNaN(timestamp)) return timestamp;
      }
    } catch (e) {
      console.error('Error reading session start:', e);
    }
    return null;
  }

  private persistSessionStart(timestamp: number | null): void {
    try {
      if (timestamp === null) {
        localStorage.removeItem(ADMIN_SESSION_START_STORAGE_KEY);
      } else {
        localStorage.setItem(ADMIN_SESSION_START_STORAGE_KEY, timestamp.toString());
      }
    } catch (e) {
      console.error('Error persisting session start:', e);
    }
  }

  /**
   * Send MFA code via email for admin login (replaces magic link)
   */
  async sendMfaCode(email: string): Promise<{ success: boolean; error?: string; codeId?: string }> {
    try {
      console.log('[AdminAuth] Requesting MFA code for:', email);
      
      // Check if site-wide protection is enabled by fetching from database
      const { data: settings } = await this.supabase.client
        .from('admin_settings')
        .select('require_site_login')
        .eq('id', 1)
        .maybeSingle();
      
      const siteProtectionEnabled = settings?.require_site_login ?? true;
      console.log('[AdminAuth] Site protection enabled:', siteProtectionEnabled);
      
      // If site protection is enabled, allow any email
      // Otherwise, only allow admin emails
      if (!siteProtectionEnabled) {
        const isAdmin = await this.isEmailAdmin(email);
        if (!isAdmin) {
          return { success: false, error: 'Email address is not authorized for admin access' };
        }
      }

      // Use existing send-verification-code function with admin_login action
      const { data, error } = await this.supabase.client.functions.invoke('send-verification-code', {
        body: {
          email,
          actionType: 'admin_login',
          actionData: { timestamp: new Date().toISOString() }
        }
      });

      if (error) {
        console.error('[AdminAuth] Send verification code error:', error);
        return { success: false, error: error.message };
      }

      if (data.error) {
        console.error('[AdminAuth] Verification code service error:', data.error);
        return { success: false, error: data.error };
      }

      // Store the code ID for verification
      const codeId = data.codeId;
      if (codeId) {
        localStorage.setItem(MFA_LOGIN_CODE_ID_KEY, codeId);
        localStorage.setItem(MFA_LOGIN_CODE_USER_EMAIL_KEY, email);
      }

      console.log('[AdminAuth] MFA code sent successfully via Graph API');
      return { success: true, codeId };
    } catch (error) {
      console.error('[AdminAuth] Unexpected error sending MFA code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if email is in admin list
   */
  private async isEmailAdmin(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client.functions.invoke('check-admin-status', {
        body: { email }
      });

      if (error) {
        console.error('[AdminAuth] Error checking admin status:', error);
        return false;
      }

      console.log('[AdminAuth] Admin check result:', data);
      return data?.is_admin === true;
    } catch (error) {
      console.error('[AdminAuth] Exception checking admin status:', error);
      return false;
    }
  }

  /**
   * Verify MFA code (uses existing verify-code function)
   */
  async verifyMfaCode(code: string): Promise<{ success: boolean; error?: string; isAdmin?: boolean }> {
    try {
      console.log('[AdminAuth] Verifying MFA code');
      
      const codeId = localStorage.getItem(MFA_LOGIN_CODE_ID_KEY);
      const email = localStorage.getItem(MFA_LOGIN_CODE_USER_EMAIL_KEY);
      
      if (!codeId || !email) {
        return { success: false, error: 'No MFA session found. Please request a code again.' };
      }

      // Use existing verify-code function
      const { data, error } = await this.supabase.client.functions.invoke('verify-code', {
        body: {
          codeId,
          code,
          [VERIFY_CODE_LINK_AUTH_SESSION]: true,
        }
      });

      if (error) {
        console.error('[AdminAuth] Verify code error:', error);
        // Provide user-friendly error message
        let errorMessage = 'The verification code you entered is incorrect. Please try again.';
        if (error.message && error.message.includes('non-2xx')) {
          errorMessage = 'The verification code you entered is incorrect. Please try again.';
        }
        return { success: false, error: errorMessage };
      }

      if (data.error) {
        console.error('[AdminAuth] Code verification failed:', data.error);
        // Use the detailed error from the Edge Function or provide a friendly fallback
        let errorMessage = 'Verification failed. Please try again.';
        if (data.error === 'Invalid verification code') {
          errorMessage = 'The code you entered is incorrect. Please check and try again.';
        }
        return { success: false, error: errorMessage };
      }

      this.sessionEpoch += 1;
      markLocalAuthSessionActive();
      persistAuthResumeTokenFromVerifyResponse(data);

      let linkedUser: User | null = null;
      if (typeof data.hashed_token === 'string' && data.hashed_token.trim()) {
        const linked = await linkAuthSessionAfterVerify(
          this.supabase.client,
          data.hashed_token
        );
        if (linked.ok) {
          try {
            const {
              data: { session },
            } = await this.supabase.client.auth.getSession();
            const sessionEmail = session?.user?.email?.toLowerCase().trim();
            if (session?.user && sessionEmail === email.toLowerCase().trim()) {
              linkedUser = session.user;
            }
          } catch (error) {
            console.warn('[AdminAuth] getSession after MFA link failed:', error);
          }
        } else {
          console.warn(
            '[AdminAuth] Supabase auth link failed; continuing with MFA session:',
            linked.error
          );
        }
      }

      localStorage.setItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY, email);
      if (!linkedUser) {
        this.removeStoredSupabaseSession();
        await this.signOutBounded('signOut stale JWT after MFA');
      }
      this.ignoreSessionRestore = false;
      this.acceptRestoredUser(linkedUser ?? buildMfaMockUser(email));

      // Check if user is an admin
      const isAdmin = await this.isEmailAdmin(email);

      // Code verified successfully - mark admin status and authenticated
      if (isAdmin) {
        this.isAdminSubject.next(true);
        this.hasAdminEmailSubject.next(true);
        this.adminSessionStart = Date.now(); // Start admin session timer
        this.adminSessionExpiredSubject.next(false);
      } else {
        this.isAdminSubject.next(false);
        this.hasAdminEmailSubject.next(false);
      }

      // Mark user as authenticated (required for siteAuthGuard)
      this.isAuthenticatedSubject.next(true);

      // Store MFA authenticated email for session restoration after browser restart
      localStorage.setItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY, email);
      void persistNativeAuthBridgeFromLocalStorage();

      // Invalidate personal prayers cache on login to ensure fresh data
      // This prevents stale personal prayer data from being displayed if cache wasn't properly cleared on previous logout
      this.cacheService.invalidateCategory('personalPrayers');

      // Clean up
      localStorage.removeItem(MFA_LOGIN_CODE_ID_KEY);
      localStorage.removeItem(MFA_LOGIN_CODE_USER_EMAIL_KEY);

      console.log('[AdminAuth] MFA verification successful, session created (isAdmin:', isAdmin, ')');
      return { success: true, isAdmin };
    } catch (error) {
      console.error('[AdminAuth] Unexpected error verifying MFA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }



  /**
   * Logout current user.
   * Navigation happens as soon as the local session and shared caches are cleared.
   * signOut and Preferences can hang on iOS; they must not leave the user on a wiped home page.
   * A code login that finishes first cancels that tail so it cannot revoke the new session.
   * skipNavigation is for the blocked-user path, which adds its own query params.
   */
  async logout(options?: { skipNavigation?: boolean }): Promise<void> {
    const userEmail =
      this.userSubject.value?.email ||
      localStorage.getItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY);
    const epoch = ++this.sessionEpoch;
    this.ignoreSessionRestore = true;
    const loggedOutToken = this.readStoredAccessToken();
    const sessionAtLogout = readLocalAuthSessionAt();

    const goToLogin = (): void => {
      if (options?.skipNavigation) {
        return;
      }
      const navigate = (): void => {
        void this.router.navigate(['/login'], { replaceUrl: true });
      };
      // Capacitor plugin callbacks resume outside Angular. Without this, iOS
      // can change the URL and leave the wiped home page on screen.
      if (this.ngZone) {
        this.ngZone.run(navigate);
      } else {
        navigate();
      }
    };

    try {
      // Remove this device's push token so we don't send notifications after logout
      try {
        const pushService = this.injector.get(PushNotificationService);
        await withAuthStepDeadline(
          pushService.removeDeviceToken(),
          'remove device token'
        );
      } catch {
        // Ignore if push service not available (e.g. web) or the call hangs
      }

      try {
        await withAuthStepDeadline(
          this.clearBadgeReadStateForLogout(userEmail),
          'badge flush'
        );
      } catch (error) {
        console.warn('[AdminAuth] Badge flush before logout skipped:', error);
      }

      if (this.sessionEpoch !== epoch) {
        await this.revokeLoggedOutAccessToken(loggedOutToken, epoch);
        return;
      }

      this.userSubject.next(null);
      this.isAdminSubject.next(false);
      this.hasAdminEmailSubject.next(false);
      this.isAuthenticatedSubject.next(false);
      this.sessionStart = null;
      this.persistSessionStart(null);

      // Clear approval code session data
      localStorage.removeItem('approvalAdminEmail');
      localStorage.removeItem('approvalSessionValidated');
      localStorage.removeItem('approvalApprovalType');
      localStorage.removeItem('approvalApprovalId');

      // Clear MFA authenticated session data before any further native await
      localStorage.removeItem(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY);
      localStorage.removeItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY);
      clearPendingLoginMfaSession();
      localStorage.removeItem('prayer_encouragement_modal_do_not_show');
      if (userEmail) {
        localStorage.removeItem(`last_activity_update_${userEmail}`);
      }

      this.invalidateLogoutCaches(userEmail);
      if (this.sessionEpoch === epoch && this.ignoreSessionRestore) {
        revokeLocalAuthBridge(sessionAtLogout);
      }
      goToLogin();

      if (this.sessionEpoch !== epoch) {
        if (!this.ignoreSessionRestore) {
          markLocalAuthSessionActive();
        }
        await this.revokeLoggedOutAccessToken(loggedOutToken, epoch);
        return;
      }
      await this.revokeLoggedOutAccessToken(loggedOutToken, epoch);
      if (this.sessionEpoch !== epoch) {
        return;
      }
      await clearNativeAuthBridge();
    } catch (error) {
      console.error('Error during logout:', error);
      if (this.sessionEpoch === epoch) {
        goToLogin();
      }
    }
  }

  /** Drop shared caches before /login so a fast re-login cannot read the previous account. */
  private invalidateLogoutCaches(userEmail: string | null): void {
    this.cacheService.invalidateCategory('personalPrayers');
    this.cacheService.invalidateCategory('prayers');
    this.cacheService.invalidateCategory('prompts');
    this.cacheService.invalidateCategory('planningCenterListData');
    this.cacheService.invalidateCategory('memberPrayerUpdates');
    this.cacheService.invalidateCategory('badgeReadState');
    if (userEmail) {
      try {
        this.injector.get(PlanningCenterListService).invalidateForUser(userEmail);
      } catch {
        // Ignore if service not yet available
      }
    }
    try {
      const prayerEncouragement = this.injector.get(PrayerEncouragementService);
      prayerEncouragement.clearCooldownKeys();
    } catch {
      // Ignore if service not available
    }
  }

  /**
   * Revoke the access token captured when logout started. A newer login may
   * still be exchanging its OTP, so signOut() runs only when that login has
   * not started. Storage for the old token is removed either way.
   */
  private async revokeLoggedOutAccessToken(
    loggedOutToken: string | null,
    epoch: number
  ): Promise<void> {
    let token = loggedOutToken;
    if (!token && this.sessionEpoch === epoch) {
      token = await this.readSessionAccessToken();
      if (this.sessionEpoch !== epoch) {
        token = loggedOutToken;
      }
    }
    if (token) {
      await this.revokeAccessToken(token);
    }
    const current = this.readStoredAccessToken();
    if (token && current === token) {
      this.removeStoredSupabaseSession();
    }
    if (this.sessionEpoch !== epoch) {
      return;
    }
    if (token && current && current !== token) {
      return;
    }
    await this.signOutBounded('signOut on logout');
  }

  private removeStoredSupabaseSession(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && /^sb-.+-auth-token(?:\.\d+)?$/.test(key)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  /** Supabase persists the session under `sb-*-auth-token` before any await. */
  private readStoredAccessToken(): string | null {
    try {
      const bases = new Set<string>();
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        const match = key?.match(/^(sb-.+-auth-token)(?:\.\d+)?$/);
        if (match?.[1]) {
          bases.add(match[1]);
        }
      }
      for (const base of bases) {
        const direct = localStorage.getItem(base);
        const raw = direct ?? this.readChunkedStorage(base);
        const token = this.accessTokenFromStoredSession(raw);
        if (token) {
          return token;
        }
      }
    } catch (error) {
      console.warn('[AdminAuth] Could not read stored access token:', error);
    }
    return null;
  }

  private readChunkedStorage(base: string): string | null {
    let joined = '';
    for (let i = 0; i < 8; i += 1) {
      const part = localStorage.getItem(`${base}.${i}`);
      if (part == null) {
        break;
      }
      joined += part;
    }
    return joined || null;
  }

  private accessTokenFromStoredSession(raw: string | null): string | null {
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      access_token?: unknown;
      currentSession?: { access_token?: unknown };
    };
    const token = parsed.access_token ?? parsed.currentSession?.access_token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  }

  private async readSessionAccessToken(): Promise<string | null> {
    try {
      const { data } = await withAuthStepDeadline(
        this.supabase.client.auth.getSession(),
        'logout getSession'
      );
      return data.session?.access_token ?? null;
    } catch (error) {
      console.warn('[AdminAuth] logout getSession failed:', error);
      return null;
    }
  }

  private async revokeAccessToken(accessToken: string): Promise<void> {
    try {
      await withAuthStepDeadline(
        fetch(`${this.supabase.getSupabaseUrl()}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: this.supabase.getSupabaseKey(),
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        'logout token'
      );
    } catch (error) {
      console.warn('[AdminAuth] Token logout failed:', error);
    }
  }

  private async clearBadgeReadStateForLogout(
    userEmail: string | null | undefined
  ): Promise<void> {
    if (!userEmail) {
      localStorage.removeItem(BADGE_READ_PRAYERS_DATA_KEY);
      localStorage.removeItem(BADGE_READ_PROMPTS_DATA_KEY);
      return;
    }

    try {
      const badgeReadState = this.injector.get(BadgeReadStateService);
      await badgeReadState.flushBeforeLogout(userEmail);
      badgeReadState.invalidateForEmail(userEmail);
    } catch {
      // Ignore if service not yet available
    }

    localStorage.removeItem(BADGE_READ_PRAYERS_DATA_KEY);
    localStorage.removeItem(BADGE_READ_PROMPTS_DATA_KEY);
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.userSubject.value;
  }

  /**
   * Check if current user is admin
   */
  getIsAdmin(): boolean {
    return this.isAdminSubject.value;
  }

  /**
   * Check if auth is loading
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Reload site protection setting from database
   */
  async reloadSiteProtectionSetting(): Promise<void> {
    try {
      const { data, error } = await this.supabase.directQuery<Array<{
        require_site_login: boolean;
      }>>('admin_settings', {
        select: 'require_site_login',
        eq: { id: 1 },
        limit: 1,
        timeout: 10000
      });

      if (!error && data && data[0]) {
        this.requireSiteLoginSubject.next(data[0].require_site_login ?? true);
      }
    } catch (error) {
      console.error('Error reloading site protection setting:', error);
    }
  }
}
