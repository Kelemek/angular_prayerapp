import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, interval, timer } from 'rxjs';
import { SupabaseService } from './supabase.service';
import type { User } from '@supabase/supabase-js';

interface TimeoutSettings {
  inactivityTimeoutMinutes: number;
}

const DEFAULT_TIMEOUTS: TimeoutSettings = {
  inactivityTimeoutMinutes: 30,
};

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
  private timeoutSettings: TimeoutSettings = DEFAULT_TIMEOUTS;
  private lastBlockedCheck = 0;

  public user$ = this.userSubject.asObservable();
  public isAdmin$ = this.isAdminSubject.asObservable();
  public hasAdminEmail$ = this.hasAdminEmailSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public requireSiteLogin$ = this.requireSiteLoginSubject.asObservable();
  public adminSessionExpired$ = this.adminSessionExpiredSubject.asObservable();

  private router = inject(Router);

  constructor(private supabase: SupabaseService) {
    this.initializeAuth().catch(error => {
      console.error('[AdminAuth] initializeAuth failed:', error);
      this.loadingSubject.next(false);
    });
  }

  private async initializeAuth(): Promise<void> {
    try {
    // Load timeout settings
    await this.loadTimeoutSettings();

    // Check for approval code session first
    const approvalEmail = localStorage.getItem('approvalAdminEmail');
    const sessionValidated = localStorage.getItem('approvalSessionValidated');
    
    if (approvalEmail && sessionValidated === 'true') {
      // Authenticate the user via approval code
      this.isAuthenticatedSubject.next(true);
      this.sessionStart = this.getPersistedSessionStart() || Date.now();
      this.persistSessionStart(this.sessionStart);
      
      // Check if they're also an admin
      const isAdmin = await this.isEmailAdmin(approvalEmail);
      if (isAdmin) {
        this.isAdminSubject.next(true);
        this.hasAdminEmailSubject.next(true);
      } else {
        this.isAdminSubject.next(false);
        this.hasAdminEmailSubject.next(false);
      }
      
      this.loadingSubject.next(false);
      return;
    }

    // Check current session
    const { data: { session } } = await this.supabase.client.auth.getSession();
    
    if (session?.user) {
      this.userSubject.next(session.user);
      await this.checkAdminStatus(session.user);
      this.isAuthenticatedSubject.next(true);
      this.sessionStart = this.getPersistedSessionStart() || Date.now();
      this.persistSessionStart(this.sessionStart);
    }

    // Listen for auth state changes
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      
      if (session?.user) {
        this.userSubject.next(session.user);
        await this.checkAdminStatus(session.user);
        this.isAuthenticatedSubject.next(true);
        
        if (!this.sessionStart) {
          this.sessionStart = Date.now();
          this.persistSessionStart(this.sessionStart);
        }
      } else {
        this.userSubject.next(null);
        this.isAdminSubject.next(false);
        this.isAuthenticatedSubject.next(false);
        this.sessionStart = null;
        this.persistSessionStart(null);
      }
    });

    // Track user activity
    this.trackUserActivity();

    // Refresh lightweight checks when the window regains focus so we don't block rendering
    window.addEventListener('focus', () => {
      this.refreshTimeoutSettingsFromDb().catch(error => {
        console.error('Error refreshing timeout settings on focus:', error);
      });
      this.checkBlockedStatusInBackground();
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

  private async loadTimeoutSettings(): Promise<void> {
    try {
      this.applyCachedTimeoutSettings();
      this.refreshTimeoutSettingsFromDb().catch(error => {
        console.error('Error refreshing timeout settings:', error);
      });
    } catch (error) {
      console.error('Error loading timeout settings:', error);
    }
  }

  private applyCachedTimeoutSettings(): void {
    try {
      const cached = localStorage.getItem('adminTimeoutSettings');
      if (!cached) return;

      const parsed = JSON.parse(cached) as Partial<TimeoutSettings> & { requireSiteLogin?: boolean };
      this.applyTimeoutSettings(parsed);
    } catch (error) {
      console.error('Error parsing cached timeout settings:', error);
    }
  }

  private async refreshTimeoutSettingsFromDb(): Promise<void> {
    const { data, error } = await this.supabase.directQuery<Array<{
      inactivity_timeout_minutes: number;
      require_site_login: boolean;
    }>>('admin_settings', {
      select: 'inactivity_timeout_minutes, require_site_login',
      eq: { id: 1 },
      limit: 1,
      timeout: 8000
    });

    if (!error && data && data[0]) {
      const settings = {
        inactivityTimeoutMinutes: data[0].inactivity_timeout_minutes || DEFAULT_TIMEOUTS.inactivityTimeoutMinutes,
        requireSiteLogin: data[0].require_site_login ?? true
      };

      this.applyTimeoutSettings(settings);
      localStorage.setItem('adminTimeoutSettings', JSON.stringify(settings));
      localStorage.setItem('adminTimeoutSettingsTimestamp', Date.now().toString());
    }
  }

  private applyTimeoutSettings(settings: Partial<TimeoutSettings> & { requireSiteLogin?: boolean }): void {
    this.timeoutSettings = {
      inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes ?? this.timeoutSettings.inactivityTimeoutMinutes,
    };

    if (typeof settings.requireSiteLogin === 'boolean') {
      this.requireSiteLoginSubject.next(settings.requireSiteLogin);
    }
  }

  private async checkAdminStatus(user: User): Promise<void> {
    if (!user?.email) {
      // Check for approval code session
      const approvalEmail = localStorage.getItem('approvalAdminEmail');
      const sessionValidated = localStorage.getItem('approvalSessionValidated');
      
      if (approvalEmail && sessionValidated === 'true') {
        this.isAdminSubject.next(true);
        this.hasAdminEmailSubject.next(true);
        this.isAuthenticatedSubject.next(true);
        return;
      }
      
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
    // Check every minute for timeouts (admin sessions only)
    interval(60000).subscribe(() => {
      if (!this.isAdminSubject.value) return;
      
      // Only main site (non-admin) authentication stays active indefinitely
      // Admin sessions (within /admin) have timeouts
      
      const now = Date.now();
      const inactivityTime = now - this.lastActivity;

      // Check inactivity timeout for admin session
      if (inactivityTime > this.timeoutSettings.inactivityTimeoutMinutes * 60000) {
        console.log('[AdminAuth] Admin session expired due to inactivity');
        this.handleAdminSessionExpired();
        return;
      }
    });
  }

  private handleAdminSessionExpired(): void {
    // Don't logout - keep the main site session active
    // Just mark admin session as expired and require re-authentication for admin panel
    this.isAdminSubject.next(false);
    this.adminSessionExpiredSubject.next(true);
    this.adminSessionStart = null;
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
        return { success: false, error: error.message };
      }

      if (data.error) {
        console.error('[AdminAuth] Code verification failed:', data.error);
        return { success: false, error: data.error };
      }

      // Check if user is an admin
      const isAdmin = await this.isEmailAdmin(email);

      // Code verified successfully - now sign in the user
      await this.setApprovalSession(email);

      // Set admin status only if they're actually an admin
      if (isAdmin) {
        this.isAdminSubject.next(true);
        this.adminSessionStart = Date.now(); // Start admin session timer
        this.adminSessionExpiredSubject.next(false);
      } else {
        this.isAdminSubject.next(false);
      }

      // Clean up
      localStorage.removeItem('mfa_code_id');
      localStorage.removeItem('mfa_user_email');
      localStorage.setItem('approvalAdminEmail', email);
      localStorage.setItem('approvalSessionValidated', 'true');

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
   * Set approval code session (called when approval code is validated)
   */
  async setApprovalSession(email: string): Promise<void> {
    console.log('[AdminAuth] Setting approval session for:', email);
    
    // Always authenticate the user
    this.isAuthenticatedSubject.next(true);
    this.sessionStart = Date.now(); // Main site session
    this.persistSessionStart(this.sessionStart);
    
    // Check if user is admin
    const isAdmin = await this.isEmailAdmin(email);
    
    if (isAdmin) {
      this.isAdminSubject.next(true);
      this.hasAdminEmailSubject.next(true);
      this.adminSessionStart = Date.now(); // Admin session timer
      this.adminSessionExpiredSubject.next(false);
    } else {
      this.isAdminSubject.next(false);
      this.hasAdminEmailSubject.next(false);
    }
    
    // Store the email in localStorage for session persistence
    localStorage.setItem('approvalAdminEmail', email);
    localStorage.setItem('approvalSessionValidated', 'true');
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
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
        localStorage.setItem('adminTimeoutSettings', JSON.stringify({
          ...this.timeoutSettings,
          requireSiteLogin: data[0].require_site_login ?? true
        }));
        localStorage.setItem('adminTimeoutSettingsTimestamp', Date.now().toString());
      }
    } catch (error) {
      console.error('Error reloading site protection setting:', error);
    }
  }
}
