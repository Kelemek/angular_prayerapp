import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, interval, timer } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';
import type { User } from '@supabase/supabase-js';

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

  public user$ = this.userSubject.asObservable();
  public isAdmin$ = this.isAdminSubject.asObservable();
  public hasAdminEmail$ = this.hasAdminEmailSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public requireSiteLogin$ = this.requireSiteLoginSubject.asObservable();
  public adminSessionExpired$ = this.adminSessionExpiredSubject.asObservable();

  private router = inject(Router);

  constructor(private supabase: SupabaseService, private cacheService: CacheService) {
    this.initializeAuth().catch(error => {
      console.error('[AdminAuth] initializeAuth failed:', error);
      this.loadingSubject.next(false);
    });
  }

  private async initializeAuth(): Promise<void> {
    try {
    // Check current session
    const { data: { session } } = await this.supabase.client.auth.getSession();
    
    if (session?.user) {
      this.userSubject.next(session.user);
      // Check admin status and wait for it to complete
      try {
        await this.checkAdminStatus(session.user);
      } catch (error) {
        console.error('[AdminAuth] Error checking admin status during init:', error);
        this.isAdminSubject.next(false);
        this.hasAdminEmailSubject.next(false);
      }
      // Set authenticated regardless of admin status check
      this.isAuthenticatedSubject.next(true);
      this.sessionStart = this.getPersistedSessionStart() || Date.now();
      this.persistSessionStart(this.sessionStart);
    } else {
      // Check if user has an MFA-based session stored in localStorage
      const mfaAuthenticatedEmail = localStorage.getItem('mfa_authenticated_email');
      if (mfaAuthenticatedEmail) {
        console.log('[AdminAuth] Restoring MFA authenticated session for:', mfaAuthenticatedEmail);
        // Create a mock user object to satisfy the type system
        const mockUser: User = {
          id: 'mfa-auth-' + mfaAuthenticatedEmail.replace(/[^a-zA-Z0-9]/g, ''),
          email: mfaAuthenticatedEmail,
          user_metadata: {},
          app_metadata: {},
          aud: 'authenticated',
          created_at: localStorage.getItem('mfa_session_start') || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString()
        } as User;
        
        this.userSubject.next(mockUser);
        // Check admin status and wait for it to complete
        try {
          await this.checkAdminStatus(mockUser);
        } catch (error) {
          console.error('[AdminAuth] Error checking admin status for restored MFA session:', error);
          this.isAdminSubject.next(false);
          this.hasAdminEmailSubject.next(false);
        }
        // Set authenticated for MFA session
        this.isAuthenticatedSubject.next(true);
        this.sessionStart = this.getPersistedSessionStart() || Date.now();
        this.persistSessionStart(this.sessionStart);
      }
    }

    // Listen for auth state changes
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      
      if (session?.user) {
        this.userSubject.next(session.user);
        // Check admin status but don't block on failure
        this.checkAdminStatus(session.user).catch(error => {
          console.error('[AdminAuth] Error checking admin status on state change:', error);
          this.isAdminSubject.next(false);
          this.hasAdminEmailSubject.next(false);
        });
        this.isAuthenticatedSubject.next(true);
        
        if (!this.sessionStart) {
          this.sessionStart = Date.now();
          this.persistSessionStart(this.sessionStart);
        }
      } else {
        // Only clear auth state if we don't have an MFA authenticated user
        // MFA users don't have Supabase sessions so this listener won't find them
        const mfaAuthenticatedEmail = localStorage.getItem('mfa_authenticated_email');
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
          localStorage.removeItem('read_prayers_data');
          localStorage.removeItem('read_prompts_data');
          
          // Clear analytics activity tracking for this user
          if (userEmail) {
            localStorage.removeItem(`last_activity_update_${userEmail}`);
          }
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
      this.loadingSubject.next(false);
    }
  }

  /**
   * Safety API to clear loading state when external flows need a fallback
   */
  public clearLoading(): void {
    this.loadingSubject.next(false);
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
        this.logout();
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
      const stored = localStorage.getItem('adminSessionStart');
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
        localStorage.removeItem('adminSessionStart');
      } else {
        localStorage.setItem('adminSessionStart', timestamp.toString());
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
        localStorage.setItem('mfa_code_id', codeId);
        localStorage.setItem('mfa_user_email', email);
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
      
      const codeId = localStorage.getItem('mfa_code_id');
      const email = localStorage.getItem('mfa_user_email');
      
      if (!codeId || !email) {
        return { success: false, error: 'No MFA session found. Please request a code again.' };
      }

      // Use existing verify-code function
      const { data, error } = await this.supabase.client.functions.invoke('verify-code', {
        body: {
          codeId,
          code
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
      localStorage.setItem('mfa_authenticated_email', email);
      localStorage.setItem('mfa_session_start', Date.now().toString());

      // Invalidate personal prayers cache on login to ensure fresh data
      // This prevents stale personal prayer data from being displayed if cache wasn't properly cleared on previous logout
      this.cacheService.invalidateCategory('personalPrayers');

      // Clean up
      localStorage.removeItem('mfa_code_id');
      localStorage.removeItem('mfa_user_email');

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
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Get user email before clearing auth state
      const userEmail = this.userSubject.value?.email || localStorage.getItem('mfa_authenticated_email');
      
      await this.supabase.client.auth.signOut();
      this.userSubject.next(null);
      this.isAdminSubject.next(false);
      this.isAuthenticatedSubject.next(false);
      this.sessionStart = null;
      this.persistSessionStart(null);
      
      // Clear approval code session data
      localStorage.removeItem('approvalAdminEmail');
      localStorage.removeItem('approvalSessionValidated');
      localStorage.removeItem('approvalApprovalType');
      localStorage.removeItem('approvalApprovalId');
      
      // Clear MFA authenticated session data
      localStorage.removeItem('mfa_authenticated_email');
      localStorage.removeItem('mfa_session_start');
      
      // Clear user-specific caches to prevent next user from seeing previous user's data
      this.cacheService.invalidateCategory('personalPrayers');
      this.cacheService.invalidateCategory('prayers');
      this.cacheService.invalidateCategory('prompts');
      this.cacheService.invalidateCategory('planningCenterListData');
      this.cacheService.invalidateCategory('memberPrayerUpdates');
      
      // Clear badge read tracking (which prayers/prompts user has read)
      localStorage.removeItem('read_prayers_data');
      localStorage.removeItem('read_prompts_data');
      
      // Clear analytics activity tracking for this user
      if (userEmail) {
        localStorage.removeItem(`last_activity_update_${userEmail}`);
      }
      
      // Always redirect to login page after logout
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
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
