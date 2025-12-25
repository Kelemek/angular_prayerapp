import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import * as Sentry from '@sentry/angular';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = environment.supabaseUrl;
    const supabaseAnonKey = environment.supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      });
      const error = new Error('Missing Supabase environment variables');
      Sentry.captureException(error);
      throw error;
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js'
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

  getClient(): SupabaseClient {
    return this.supabase;
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
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'x-client-info': 'supabase-js'
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
    } catch (err) {
      console.error('[SupabaseService] Reconnection failed:', err);
      throw err;
    }
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
    
    // Add count preference
    const headers: Record<string, string> = {
      'apikey': environment.supabaseAnonKey,
      'Authorization': `Bearer ${environment.supabaseAnonKey}`
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
    const { method, body, eq = {}, returning = false, timeout = 30000 } = options;
    
    const params = new URLSearchParams();
    
    // Add equality filters for PATCH/DELETE
    if (method !== 'POST') {
      for (const [key, value] of Object.entries(eq)) {
        params.set(key, `eq.${value}`);
      }
    }
    
    const headers: Record<string, string> = {
      'apikey': environment.supabaseAnonKey,
      'Authorization': `Bearer ${environment.supabaseAnonKey}`,
      'Content-Type': 'application/json'
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
