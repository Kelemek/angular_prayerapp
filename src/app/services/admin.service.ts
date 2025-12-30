import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Admin service for operations that require service role access
 * Uses the service role key to bypass RLS policies
 * Only accessible from admin-protected routes
 */
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private adminClient: SupabaseClient;

  constructor() {
    // Get service role key from environment variable
    // Local: Set VITE_SUPABASE_SERVICE_KEY in .env file
    // Vercel: Already set in environment variables
    
    // Debug: log all environment variables
    console.log('All env vars:', import.meta.env);
    console.log('Service key exists?', 'VITE_SUPABASE_SERVICE_KEY' in import.meta.env);
    
    const serviceKey = import.meta.env['VITE_SUPABASE_SERVICE_KEY'] as string;
    
    if (!serviceKey) {
      AdminService.reportMissingServiceKey(import.meta.env);
    }
    
    // Create a separate client with service role key for admin operations
    this.adminClient = createClient(
      environment.supabaseUrl,
      serviceKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Get admin settings
   */
  async getAdminSettings() {
    const { data, error } = await this.adminClient
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .single();

    return { data, error };
  }

  /**
   * Update admin settings
   */
  async updateAdminSettings(settings: any) {
    const { data, error } = await this.adminClient
      .from('admin_settings')
      .upsert({
        id: 1,
        ...settings,
        updated_at: new Date().toISOString()
      });

    return { data, error };
  }

  /**
   * Get all email subscribers (admin only)
   */
  async getEmailSubscribers() {
    const { data, error } = await this.adminClient
      .from('email_subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Update email subscriber
   */
  async updateEmailSubscriber(id: string, updates: any) {
    const { data, error } = await this.adminClient
      .from('email_subscribers')
      .update(updates)
      .eq('id', id);

    return { data, error };
  }

  /**
   * Get analytics data (bypassing RLS)
   */
  async getAnalytics() {
    const { data, error } = await this.adminClient
      .from('analytics')
      .select('*')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Generic query method for any table with admin privileges
   * Allows bypassing RLS for all admin operations
   */
  query(tableName: string) {
    return this.adminClient.from(tableName);
  }

  /**
   * Helper to report missing service key — extracted for testability.
   */
  private static reportMissingServiceKey(env: any) {
    console.error('VITE_SUPABASE_SERVICE_KEY not found in environment variables');
    console.error('Available keys:', Object.keys(env));
  }
}
