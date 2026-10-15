import { Injectable, Injector, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { capturePostHogException } from '../../lib/posthog';
import {
  resolveSupabaseRestBearer,
  supabaseRestJsonHeaders,
} from '../../lib/supabase-rest-bearer';
import { SupabaseDataAccessGateService } from './supabase-data-access-gate.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly injector = inject(Injector);

  constructor() {
    const supabaseUrl = environment.supabaseUrl;
    const supabaseAnonKey = environment.supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      });
      const error = new Error('Missing Supabase environment variables');
      capturePostHogException(error);
      throw error;
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Bypass Navigator LockManager to prevent lock acquisition failures
        // across multiple tabs/windows. Safe because this app uses MFA-based
        // auth with localStorage, not Supabase OAuth token refresh.
        lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => await fn()
      },
      global: {
        headers: {
          // Identify as native app for better compatibility with native HTTP stacks (iOS, Android)
          'x-client-info': `supabase-js/${this.getClientVersion()}`
        },
        fetch: (input: URL | RequestInfo, options?: RequestInit) => {
          // Enhanced fetch wrapper for native app compatibility
          return this.fetchWithNativeCompat(input, options);
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    // Set up visibility recovery for Edge on iOS
    this.setupVisibilityRecovery();
  }

  /**
   * Raw Supabase client — use for `auth`, `functions`, and `realtime` only.
   * PostgREST: `from()`, `rpc()`, or `db()` / `getClientWhenReady()`.
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  getConfig() {
    return {
      url: environment.supabaseUrl,
      anonKey: environment.supabaseAnonKey
    };
  }

  getSupabaseUrl(): string {
    return environment.supabaseUrl;
  }

  getSupabaseKey(): string {
    return environment.supabaseAnonKey;
  }

  /** JWT access token when signed in; otherwise the anon key (login branding only). */
  async getRestAuthorizationBearer(): Promise<string> {
    await this.injector.get(SupabaseDataAccessGateService).waitForReady();
    return resolveSupabaseRestBearer(this.supabase, environment.supabaseAnonKey);
  }

  private async ensureDataAccessReady(): Promise<void> {
    await this.injector.get(SupabaseDataAccessGateService).waitForReady();
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  /** PostgREST — waits for JWT when the user is signed in. */
  async getClientWhenReady(): Promise<SupabaseClient> {
    await this.ensureDataAccessReady();
    return this.supabase;
  }

  /** Alias for {@link getClientWhenReady}. */
  async db(): Promise<SupabaseClient> {
    return this.getClientWhenReady();
  }

  async from(relation: string): Promise<ReturnType<SupabaseClient['from']>> {
    await this.ensureDataAccessReady();
    return this.supabase.from(relation);
  }

  async rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>
  ): Promise<ReturnType<SupabaseClient['rpc']>> {
    await this.ensureDataAccessReady();
    return this.supabase.rpc(fn, args);
  }

  isNetworkError(error: unknown): boolean {
    if (!error) return false;
    
    const errorStr = String(error).toLowerCase();
    return (
      errorStr.includes('failed to fetch') ||
      errorStr.includes('network') ||
      errorStr.includes('timeout') ||
      errorStr.includes('aborted') ||
      errorStr.includes('connection') ||
      (error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network') ||
        error.message.includes('Timeout')
      ))
    );
  }

  /**
   * Ensure Supabase connection is healthy
   * Critical for Edge on iOS which may lose connections during background suspension
   */
  async ensureConnected(): Promise<void> {
    try {
      console.log('[SupabaseService] Checking connection health...');
      // Attempt a simple auth check to verify connection
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.warn('[SupabaseService] Connection health check failed:', error);
        await this.reconnect();
      } else {
        console.log('[SupabaseService] Connection is healthy');
      }
    } catch (err) {
      console.error('[SupabaseService] Connection check error:', err);
      await this.reconnect();
    }
  }

  /**
   * Force reconnection by recreating the Supabase client
   * Useful when Edge/iOS loses the connection during background suspension
   */
  private async reconnect(): Promise<void> {
    try {
      console.log('[SupabaseService] Reconnecting to Supabase...');
      
      const supabaseUrl = environment.supabaseUrl;
      const supabaseAnonKey = environment.supabaseAnonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
      }

      // Create a new client instance to reset all connections
      this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => await fn()
        },
        global: {
          headers: {
            'x-client-info': `supabase-js/${this.getClientVersion()}`
          },
          fetch: (input: URL | RequestInfo, options?: RequestInit) => {
            return this.fetchWithNativeCompat(input, options);
          }
        },
        db: {
          schema: 'public'
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      
      console.log('[SupabaseService] Reconnected successfully');
      await this.injector.get(SupabaseDataAccessGateService).refresh();
    } catch (err) {
      console.error('[SupabaseService] Reconnection failed:', err);
      throw err;
    }
  }

  /**
   * Get client version info (web vs native)
   */
  private getClientVersion(): string {
    try {
      // Check if running in Capacitor (native app)
      if (typeof (window as any).Capacitor !== 'undefined') {
        const platform = (window as any).Capacitor?.getPlatform?.() || 'native';
        return `capacitor-${platform}`;
      }
    } catch {
      // Fall through to web
    }
    return 'web';
  }

  /**
   * Enhanced fetch wrapper for native app compatibility
   * Handles CORS and timeout issues specific to native HTTP stacks (iOS, Android)
   */
  private fetchWithNativeCompat(input: URL | RequestInfo, options?: RequestInit): Promise<Response> {
    // Ensure proper headers for native compatibility
    const headers = new Headers(options?.headers || {});
    
    // Ensure content-type is set for POST requests
    if (options?.method === 'POST' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    // Add explicit CORS mode for edge function calls
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const isEdgeFunction = urlStr.includes('/functions/');
    const mode: RequestMode = isEdgeFunction ? 'cors' : (options?.mode || 'cors');
    
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      mode,
      // Ensure credentials aren't sent (API key in header, not cookies)
      credentials: 'omit'
    };

    // Wrap with timeout for native app reliability
    return this.fetchWithTimeout(fetch(input, fetchOptions), 30000);
  }

  /**
   * Wrap fetch with timeout to prevent hanging on native apps
   * Properly clears timeout to prevent orphaned timers
   */
  private fetchWithTimeout(fetchPromise: Promise<Response>, timeoutMs: number): Promise<Response> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<Response>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Fetch timeout after ${timeoutMs}ms - network may be slow or unavailable`)),
        timeoutMs
      );
    });

    return Promise.race([fetchPromise, timeoutPromise]).finally(() => {
      // Clear the timeout regardless of whether fetch succeeded or timed out
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    });
  }

  /**
   * Trigger connection recovery when app becomes visible
   * Especially important for Edge on iOS
   */
  setupVisibilityRecovery(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[SupabaseService] App becoming visible, ensuring connection health');
        this.ensureConnected().catch(err => {
          console.error('[SupabaseService] Failed to ensure connection on visibility:', err);
        });
      }
    });

    // Also listen for the custom app-became-visible event
    window.addEventListener('app-became-visible', () => {
      console.log('[SupabaseService] App became visible event, ensuring connection health');
      this.ensureConnected().catch(err => {
        console.error('[SupabaseService] Failed to ensure connection:', err);
      });
    });
  }

  async directQuery<T = any>(
    table: string,
    options: {
      select?: string;
      eq?: Record<string, string | number | boolean>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      count?: 'exact' | 'planned' | 'estimated';
      head?: boolean;
      timeout?: number;
    } = {}
  ): Promise<{ data: T | null; error: Error | null; count?: number }> {
    await this.ensureDataAccessReady();
    const { select = '*', eq = {}, order, limit, count, head = false, timeout = 30000 } = options;
    
    const params = new URLSearchParams();
    params.set('select', select);
    
    // Add equality filters
    for (const [key, value] of Object.entries(eq)) {
      params.set(key, `eq.${value}`);
    }
    
    // Add ordering
    if (order) {
      const direction = order.ascending === false ? '.desc' : '.asc';
      params.set('order', `${order.column}${direction}`);
    }
    
    // Add limit
    if (limit !== undefined) {
      params.set('limit', String(limit));
    }
    
    const authorizationBearer = await this.getRestAuthorizationBearer();
    const headers: Record<string, string> = {
      ...supabaseRestJsonHeaders(
        environment.supabaseAnonKey,
        authorizationBearer,
      ),
    };

    if (count) {
      headers['Prefer'] = `count=${count}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(
        `${environment.supabaseUrl}/rest/v1/${table}?${params.toString()}`,
        {
          method: head ? 'HEAD' : 'GET',
          headers,
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: new Error(`Query failed: ${response.status} - ${errorText}`)
        };
      }
      
      const data = head ? null : await response.json();
      const countValue = response.headers.get('Content-Range')
        ? parseInt(response.headers.get('Content-Range')?.split('/')[1] || '0')
        : undefined;
      
      return { data: data as T, error: null, count: countValue };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async directMutation<T = any>(
    table: string,
    options: {
      method: 'POST' | 'PATCH' | 'DELETE';
      body?: any;
      eq?: Record<string, string | number | boolean>;
      returning?: boolean;
      timeout?: number;
    }
  ): Promise<{ data: T | null; error: Error | null }> {
    await this.ensureDataAccessReady();
    const { method, body, eq = {}, returning = false, timeout = 30000 } = options;
    
    const params = new URLSearchParams();
    
    // Add equality filters for PATCH/DELETE
    if (method !== 'POST') {
      for (const [key, value] of Object.entries(eq)) {
        params.set(key, `eq.${value}`);
      }
    }
    
    const authorizationBearer = await this.getRestAuthorizationBearer();
    const headers: Record<string, string> = {
      ...supabaseRestJsonHeaders(
        environment.supabaseAnonKey,
        authorizationBearer,
      ),
    };

    if (returning) {
      headers['Prefer'] = 'return=representation';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const url = `${environment.supabaseUrl}/rest/v1/${table}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: new Error(`Mutation failed: ${response.status} - ${errorText}`)
        };
      }
      
      const data = returning && response.status !== 204 ? await response.json() : null;
      return { data: data as T, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
