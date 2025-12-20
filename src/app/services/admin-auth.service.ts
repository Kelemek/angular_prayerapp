import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { SupabaseService } from './supabase.service';
import type { User } from '@supabase/supabase-js';

interface TimeoutSettings {
  inactivityTimeoutMinutes: number;
  maxSessionDurationMinutes: number;
  dbHeartbeatIntervalMinutes: number;
}

const DEFAULT_TIMEOUTS: TimeoutSettings = {
  inactivityTimeoutMinutes: 30,
  maxSessionDurationMinutes: 480, // 8 hours
  dbHeartbeatIntervalMinutes: 1,
};

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private lastActivity = Date.now();
  private sessionStart: number | null = null;
  private timeoutSettings: TimeoutSettings = DEFAULT_TIMEOUTS;

  public user$ = this.userSubject.asObservable();
  public isAdmin$ = this.isAdminSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  private router = inject(Router);

  constructor(private supabase: SupabaseService) {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    // Load timeout settings
    await this.loadTimeoutSettings();

    // Check for approval code session first
    const approvalEmail = localStorage.getItem('approvalAdminEmail');
    const sessionValidated = localStorage.getItem('approvalSessionValidated');
    
    if (approvalEmail && sessionValidated === 'true') {
      console.log('[AdminAuth] Found approval code session for:', approvalEmail);
      this.isAdminSubject.next(true);
      this.sessionStart = this.getPersistedSessionStart() || Date.now();
      this.persistSessionStart(this.sessionStart);
      this.loadingSubject.next(false);
      return;
    }

    // Check current session
    const { data: { session } } = await this.supabase.client.auth.getSession();
    
    if (session?.user) {
      this.userSubject.next(session.user);
      await this.checkAdminStatus(session.user);
      this.sessionStart = this.getPersistedSessionStart() || Date.now();
      this.persistSessionStart(this.sessionStart);
    }

    // Listen for auth state changes
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      console.log('[AdminAuth] Auth state changed:', event, 'URL:', window.location.href);
      
      if (session?.user) {
        this.userSubject.next(session.user);
        await this.checkAdminStatus(session.user);
        
        if (!this.sessionStart) {
          this.sessionStart = Date.now();
          this.persistSessionStart(this.sessionStart);
        }

        // Handle magic link redirect after successful authentication
        // Check for redirect param on both SIGNED_IN and INITIAL_SESSION (magic link flow)
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect');
          console.log('[AdminAuth] Event:', event, 'redirect param:', redirect);
          if (redirect === 'admin') {
            // Wait for admin status to be set
            setTimeout(() => {
              console.log('[AdminAuth] Redirecting to /admin, isAdmin:', this.isAdminSubject.value);
              this.router.navigate(['/admin']);
            }, 200);
          }
        }
      } else {
        this.userSubject.next(null);
        this.isAdminSubject.next(false);
        this.sessionStart = null;
        this.persistSessionStart(null);
      }
    });

    // Track user activity
    this.trackUserActivity();

    // Set up session timeout checks
    this.setupSessionTimeouts();

    this.loadingSubject.next(false);
  }

  private async loadTimeoutSettings(): Promise<void> {
    try {
      // Try localStorage first
      const cached = localStorage.getItem('adminTimeoutSettings');
      const cacheTimestamp = localStorage.getItem('adminTimeoutSettingsTimestamp');
      
      if (cached && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
        if (cacheAge < 3600000) { // 1 hour
          this.timeoutSettings = JSON.parse(cached);
          return;
        }
      }

      // Fetch from database
      const { data, error } = await this.supabase.directQuery<Array<{
        inactivity_timeout_minutes: number;
        max_session_duration_minutes: number;
        db_heartbeat_interval_minutes: number;
      }>>('admin_settings', {
        select: 'inactivity_timeout_minutes, max_session_duration_minutes, db_heartbeat_interval_minutes',
        eq: { id: 1 },
        limit: 1,
        timeout: 10000
      });

      if (!error && data && data[0]) {
        this.timeoutSettings = {
          inactivityTimeoutMinutes: data[0].inactivity_timeout_minutes || DEFAULT_TIMEOUTS.inactivityTimeoutMinutes,
          maxSessionDurationMinutes: data[0].max_session_duration_minutes || DEFAULT_TIMEOUTS.maxSessionDurationMinutes,
          dbHeartbeatIntervalMinutes: data[0].db_heartbeat_interval_minutes || DEFAULT_TIMEOUTS.dbHeartbeatIntervalMinutes,
        };
        
        localStorage.setItem('adminTimeoutSettings', JSON.stringify(this.timeoutSettings));
        localStorage.setItem('adminTimeoutSettingsTimestamp', Date.now().toString());
      }
    } catch (error) {
      console.error('Error loading timeout settings:', error);
    }
  }

  private async checkAdminStatus(user: User): Promise<void> {
    if (!user?.email) {
      // Check for approval code session
      const approvalEmail = localStorage.getItem('approvalAdminEmail');
      const sessionValidated = localStorage.getItem('approvalSessionValidated');
      
      if (approvalEmail && sessionValidated === 'true') {
        console.log('[AdminAuth] Approval code session found for:', approvalEmail);
        this.isAdminSubject.next(true);
        return;
      }
      
      this.isAdminSubject.next(false);
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
      } else {
        this.isAdminSubject.next(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isAdminSubject.next(false);
    }
  }

  private trackUserActivity(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      });
    });
  }

  private setupSessionTimeouts(): void {
    // Check every minute for timeouts
    interval(60000).subscribe(() => {
      if (!this.userSubject.value) return;

      const now = Date.now();
      const inactivityTime = now - this.lastActivity;
      const sessionDuration = this.sessionStart ? now - this.sessionStart : 0;

      // Check inactivity timeout
      if (inactivityTime > this.timeoutSettings.inactivityTimeoutMinutes * 60000) {
        console.log('[AdminAuth] Session expired due to inactivity');
        this.logout();
        return;
      }

      // Check max session duration
      if (sessionDuration > this.timeoutSettings.maxSessionDurationMinutes * 60000) {
        console.log('[AdminAuth] Session expired due to max duration');
        this.logout();
        return;
      }
    });
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
   * Send magic link for admin login
   */
  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}?redirect=admin`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set approval code session (called when approval code is validated)
   */
  setApprovalSession(email: string): void {
    console.log('[AdminAuth] Setting approval session for:', email);
    this.isAdminSubject.next(true);
    this.sessionStart = Date.now();
    this.persistSessionStart(this.sessionStart);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await this.supabase.client.auth.signOut();
      this.userSubject.next(null);
      this.isAdminSubject.next(false);
      this.sessionStart = null;
      this.persistSessionStart(null);
      
      // Clear approval code session data
      localStorage.removeItem('approvalAdminEmail');
      localStorage.removeItem('approvalSessionValidated');
      localStorage.removeItem('approvalApprovalType');
      localStorage.removeItem('approvalApprovalId');
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
}
