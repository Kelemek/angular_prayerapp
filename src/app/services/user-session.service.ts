import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AdminAuthService } from './admin-auth.service';
import { first } from 'rxjs/operators';

export interface UserSessionData {
  email: string;
  fullName: string;
  isActive: boolean;
  receiveNotifications?: boolean;
  receiveAdminEmails?: boolean;
  badgeFunctionalityEnabled?: boolean;
  defaultPrayerView?: 'current' | 'personal';
}

/**
 * UserSessionService - Caches user information from the database during the session
 * 
 * Eliminates repeated database queries for user email and name by loading once
 * and storing in memory. Automatically cleared on logout.
 */
@Injectable({
  providedIn: 'root'
})
export class UserSessionService {
  private userSessionSubject = new BehaviorSubject<UserSessionData | null>(null);
  public userSession$ = this.userSessionSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  private hasInitializedSubject = new BehaviorSubject<boolean>(false);
  private hasInitialized$ = this.hasInitializedSubject.asObservable();

  private hasBeenAuthenticated = false; // Track if user was ever authenticated

  constructor(
    private supabase: SupabaseService,
    private adminAuth: AdminAuthService
  ) {
    // Restore cached session immediately if available
    const cachedUserSession = localStorage.getItem('userSession');
    if (cachedUserSession) {
      try {
        const session = JSON.parse(cachedUserSession);
        if (session && session.email) {
          this.userSessionSubject.next(session);
        }
      } catch (err) {
        console.warn('[UserSession] Failed to parse cached session:', err);
      }
    }
    
    this.initializeSession();
  }

  /**
   * Initialize user session - loads from localStorage first, then syncs with database
   */
  private initializeSession(): void {
    this.adminAuth.isAuthenticated$.subscribe(async (isAuthenticated) => {
      if (isAuthenticated) {
        this.hasBeenAuthenticated = true; // Mark that we've been authenticated
        // Get current user email from multiple sources
        const { data: { session } } = await this.supabase.client.auth.getSession();
        const approvalEmail = localStorage.getItem('approvalAdminEmail');
        const mfaEmail = localStorage.getItem('mfa_authenticated_email');
        const email = session?.user?.email || approvalEmail || mfaEmail;

        if (email) {
          // Try to load from localStorage first for instant availability
          const cachedSession = this.loadFromCache(email);
          if (cachedSession) {
            this.userSessionSubject.next(cachedSession);
            this.hasInitializedSubject.next(true);
          }
          
          // Then load from database to refresh data
          await this.loadUserSession(email);
          this.hasInitializedSubject.next(true);
        } else {
          // No email found, mark as initialized with null session
          this.hasInitializedSubject.next(true);
        }
      } else if (this.hasBeenAuthenticated) {
        // Only clear session on actual logout (not on initial false state)
        this.userSessionSubject.next(null);
        this.clearCache();
        this.hasInitializedSubject.next(false);
      }
    });
  }

  /**
   * Load user information from database and cache in session + localStorage
   */
  async loadUserSession(email: string): Promise<void> {
    if (!email || !email.trim()) {
      return;
    }

    this.isLoadingSubject.next(true);

    try {
      // Use directQuery with timeout to prevent hanging
      const { data, error } = await Promise.race([
        this.supabase.client
          .from('email_subscribers')
          .select('email, name, is_active, badge_functionality_enabled, default_prayer_view')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User session query timeout')), 5000)
        ) as Promise<any>
      ]);

      if (error) {
        console.error('Error loading user session from database:', error);
        // Don't return on error - create a fallback session
      }

      if (data) {
        const sessionData: UserSessionData = {
          email: data.email || email,
          fullName: data.name || '',
          isActive: data.is_active ?? true,
          receiveNotifications: true,
          receiveAdminEmails: false,
          badgeFunctionalityEnabled: data.badge_functionality_enabled ?? false,
          defaultPrayerView: data.default_prayer_view || 'current'
        };
        this.userSessionSubject.next(sessionData);
        this.saveToCache(sessionData);
      } else {
        // User not in email_subscribers yet, create minimal session with email only
        const sessionData: UserSessionData = {
          email,
          fullName: '',
          isActive: true,
          receiveNotifications: true,
          receiveAdminEmails: false,
          badgeFunctionalityEnabled: false,
          defaultPrayerView: 'current'
        };
        this.userSessionSubject.next(sessionData);
        this.saveToCache(sessionData);
      }
    } catch (err) {
      console.error('Exception loading user session:', err);
      // Create a fallback session on exception
      const sessionData: UserSessionData = {
        email,
        fullName: '',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false,
        badgeFunctionalityEnabled: false,
        defaultPrayerView: 'current'
      };
      this.userSessionSubject.next(sessionData);
      this.saveToCache(sessionData);
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Get current user session data
   */
  getCurrentSession(): UserSessionData | null {
    return this.userSessionSubject.value;
  }

  /**
   * Get user email - returns null if not loaded
   */
  getUserEmail(): string | null {
    const session = this.userSessionSubject.value;
    return session?.email || null;
  }

  /**
   * Get user full name - returns null if not loaded
   */
  getUserFullName(): string | null {
    const session = this.userSessionSubject.value;
    return session?.fullName || null;
  }

  /**
   * Get user first name - returns null if not loaded
   */
  getUserFirstName(): string | null {
    return null;
  }
  /**
   * Get user last name - returns null if not loaded
   */
  getUserLastName(): string | null {
    return null;
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences(): { receiveNotifications: boolean; receiveAdminEmails: boolean } | null {
    const session = this.userSessionSubject.value;
    return session ? {
      receiveNotifications: session.receiveNotifications ?? true,
      receiveAdminEmails: session.receiveAdminEmails ?? false
    } : null;
  }

  /**
   * Check if user receives notifications
   */
  isNotificationsEnabled(): boolean {
    const session = this.userSessionSubject.value;
    return session?.receiveNotifications ?? true;
  }

  /**
   * Check if user receives admin emails
   */
  isAdminEmailsEnabled(): boolean {
    const session = this.userSessionSubject.value;
    return session?.receiveAdminEmails ?? false;
  }

  /**
   * Check if badge functionality is enabled for the user
   */
  isBadgeFunctionalityEnabled(): boolean {
    const session = this.userSessionSubject.value;
    return session?.badgeFunctionalityEnabled ?? false;
  }

  /**
   * Get user's default prayer view preference
   */
  getDefaultPrayerView(): 'current' | 'personal' {
    const session = this.userSessionSubject.value;
    return session?.defaultPrayerView || 'current';
  }

  /**
   * Update user session data - useful after user modifies their profile
   */
  async updateUserSession(updates: Partial<UserSessionData>): Promise<void> {
    const currentSession = this.userSessionSubject.value;
    if (!currentSession) {
      return;
    }

    const updatedSession: UserSessionData = {
      ...currentSession,
      ...updates
    };

    this.userSessionSubject.next(updatedSession);
    this.saveToCache(updatedSession);
  }

  /**
   * Wait for user session to load - useful for components that need user data
   */
  async waitForSession(): Promise<UserSessionData | null> {
    // If session is already available, return immediately
    const currentSession = this.userSessionSubject.value;
    if (currentSession) {
      return currentSession;
    }

    // Wait for initialization to complete
    if (!this.hasInitializedSubject.value) {
      return new Promise<UserSessionData | null>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(this.userSessionSubject.value);
          }
        }, 10000);

        const initSubscription = this.hasInitialized$.subscribe((hasInitialized) => {
          if (hasInitialized && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            initSubscription.unsubscribe();
            resolve(this.userSessionSubject.value);
          }
        });
      });
    }

    // Already initialized, check if still loading
    if (this.isLoadingSubject.value) {
      return new Promise<UserSessionData | null>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(this.userSessionSubject.value);
          }
        }, 10000);

        const loadingSubscription = this.isLoading$.subscribe((isLoading) => {
          if (!isLoading && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            loadingSubscription.unsubscribe();
            resolve(this.userSessionSubject.value);
          }
        });
      });
    }

    // Not loading and initialization complete
    return this.userSessionSubject.value;
  }

  /**
   * Clear session - called on logout
   */
  clearSession(): void {
    this.userSessionSubject.next(null);
  }

  /**
   * Save session to localStorage for persistence across page reloads
   */
  private saveToCache(session: UserSessionData): void {
    try {
      localStorage.setItem('userSession', JSON.stringify(session));
    } catch (err) {
      console.warn('Failed to save session to cache:', err);
    }
  }

  /**
   * Load session from localStorage
   */
  private loadFromCache(email: string): UserSessionData | null {
    try {
      const cached = localStorage.getItem('userSession');
      if (cached) {
        const session = JSON.parse(cached);
        // Verify the cached session is for the current email to avoid stale data
        if (session && session.email === email) {
          return session;
        }
      }
    } catch (err) {
      console.warn('[UserSession] Failed to load session from cache:', err);
    }
    return null;
  }

  /**
   * Clear cached session from localStorage
   */
  private clearCache(): void {
    try {
      localStorage.removeItem('userSession');
    } catch (err) {
      console.warn('[UserSession] Failed to clear session cache:', err);
    }
  }
}
