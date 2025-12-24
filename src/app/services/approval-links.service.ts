import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Approval link generation and validation service
 * Generates special deep links for admins to approve requests without login
 * Uses server-side approval codes for secure one-time authentication
 */
@Injectable({
  providedIn: 'root'
})
export class ApprovalLinksService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Generates a one-time approval code and creates a direct admin approval link
   * The code is validated server-side to create an authenticated session
   * 
   * Format: https://app.com?code=abc123xyz&approval_type=prayer&approval_id=xyz789
   * 
   * @param requestType - Type of request to approve
   * @param requestId - UUID of the request record
   * @param adminEmail - Email of the admin receiving this approval
   * @returns Full approval URL with code, or null if code generation failed
   */
  async generateApprovalLink(
    requestType: 'prayer' | 'update' | 'deletion' | 'status_change' | 'preference-change',
    requestId: string,
    adminEmail: string
  ): Promise<string | null> {
    try {
      // Generate a random code
      const code = this.generateRandomCode();

      // Store the code in the database with expiry (24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await this.supabase.client
        .from('approval_codes')
        .insert({
          code,
          admin_email: adminEmail.toLowerCase().trim(),
          approval_type: requestType,
          approval_id: requestId,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error('Failed to create approval code:', error);
        return null;
      }

      // Generate the approval link with the code
      const baseUrl = window.location.origin;
      const params = new URLSearchParams({
        code,
        approval_type: requestType,
        approval_id: requestId,
      });

      return `${baseUrl}?${params.toString()}`;
    } catch (error) {
      console.error('Error generating approval link:', error);
      return null;
    }
  }

  /**
   * Generates a random approval code (32 characters)
   */
  private generateRandomCode(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validates an approval code by calling the Edge Function
   * Returns approval info if valid, null if invalid or expired
   */
  async validateApprovalCode(
    code: string
  ): Promise<{ approval_type: string; approval_id: string; user: { email: string } } | null> {
    try {
      const { data, error } = await this.supabase.client.functions.invoke('validate-approval-code', {
        body: { code }
      });

      if (error || !data?.success) {
        return null;
      }

      return {
        approval_type: data.approval_type,
        approval_id: data.approval_id,
        user: data.user,
      };
    } catch (error) {
      console.error('Error validating approval code:', error);
      return null;
    }
  }

  /**
   * Generate a simple code for account approval/denial links
   * These codes are validated by decoding the email from the code
   * Format: account_approve_{base64Email} or account_deny_{base64Email}
   */
  generateCode(type: 'account_approve' | 'account_deny', email: string): string {
    const base64Email = btoa(email.toLowerCase());
    return `${type}_${base64Email}`;
  }

  /**
   * Decode an account approval/denial code to get the email
   * Returns null if invalid format
   */
  decodeAccountCode(code: string): { type: 'approve' | 'deny'; email: string } | null {
    try {
      if (code.startsWith('account_approve_')) {
        const base64Email = code.replace('account_approve_', '');
        const email = atob(base64Email);
        return { type: 'approve', email };
      } else if (code.startsWith('account_deny_')) {
        const base64Email = code.replace('account_deny_', '');
        const email = atob(base64Email);
        return { type: 'deny', email };
      }
      return null;
    } catch (error) {
      console.error('Error decoding account code:', error);
      return null;
    }
  }
}
